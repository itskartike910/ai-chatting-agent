/* global chrome */

console.log('AI Web Agent Background Script Loading...');

// Enhanced Error Handling for API Issues
class APIErrorHandler {
  static isOverloadedError(error) {
    return error.message.includes('overloaded_error') || error.message.includes('529');
  }

  static isRateLimitError(error) {
    return error.message.includes('rate_limit') || error.message.includes('429');
  }

  static isTokenLimitError(error) {
    return error.message.includes('prompt is too long') || error.message.includes('maximum');
  }

  static async handleAPIError(error, llmService, retryCount = 0) {
    console.warn(`API Error (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount >= 3) {
      throw new Error(`API failed after 3 attempts: ${error.message}`);
    }

    if (this.isTokenLimitError(error)) {
      console.error('Token limit exceeded - prompts need to be shortened');
      return false; // Don't retry for token limit errors
    }

    if (this.isOverloadedError(error) || this.isRateLimitError(error)) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return true; // Indicate retry should happen
    }

    return false; // Don't retry
  }
}

// Lightweight Memory Manager (Token-Optimized)
class TokenOptimizedMemoryManager {
  constructor() {
    this.messages = [];
    this.maxMessages = 3; // Keep only last 3 messages
    this.maxTokensPerMessage = 1000; // Limit message size
  }

  addMessage(message) {
    // Truncate content if too long
    if (message.content && message.content.length > this.maxTokensPerMessage * 4) {
      message.content = message.content.substring(0, this.maxTokensPerMessage * 4) + '...[truncated]';
    }

    this.messages.push({
      ...message,
      timestamp: Date.now()
    });

    // Keep only recent messages
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  getMessages() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}

// Enhanced MultiLLM with Token Management
class RobustMultiLLM {
  constructor(config = {}) {
    this.config = config;
    this.providers = ['anthropic', 'openai'];
    this.currentProviderIndex = 0;
  }

  async call(messages, options = {}) {
    let lastError = null;
    
    // Try current provider first
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const provider = options.provider || this.config.aiProvider || this.providers[this.currentProviderIndex];
        return await this.callProvider(provider, messages, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry token limit errors
        if (APIErrorHandler.isTokenLimitError(error)) {
          throw error;
        }
        
        const shouldRetry = await APIErrorHandler.handleAPIError(error, this, attempt);
        if (shouldRetry) {
          continue; // Retry same provider
        }
        
        // Try next provider
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
        console.log(`Switching to provider: ${this.providers[this.currentProviderIndex]}`);
      }
    }
    
    throw lastError || new Error('All providers failed');
  }

  async callProvider(provider, messages, options) {
    switch (provider) {
      case 'anthropic':
        return await this.callAnthropic(messages, options);
      case 'openai':
        return await this.callOpenAI(messages, options);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async callAnthropic(messages, options = {}) {
    if (!this.config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.7,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async callOpenAI(messages, options = {}) {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4',
        messages: messages,
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Compact Task Analyzer (Token-Optimized)
class CompactTaskAnalyzer {
  constructor(llmService, memoryManager) {
    this.llmService = llmService;
    this.memoryManager = memoryManager;
  }

  async analyze(userTask, pageState, currentTab) {
    const compactPrompt = `Task: "${userTask}"

Current Context:
- URL: ${currentTab?.url || 'unknown'}
- Platform: ${pageState.pageContext?.platform || 'unknown'}
- Page Type: ${pageState.pageContext?.pageType || 'unknown'}
- Elements: ${pageState.interactiveElements?.length || 0}

Top 10 Interactive Elements:
${this.formatElements(pageState.interactiveElements || [])}

Android Rules:
1. If not on Twitter for Twitter tasks, navigate to x.com
2. Use element indices for clicking
3. For posting: navigate to x.com/compose/post
4. For liking: find like buttons on x.com/home

Respond with valid JSON only:
{
  "action": "navigate|click|fill|chat",
  "target": "url_or_element_index",
  "text": "content_if_filling",
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.llmService.call([
        { role: 'user', content: compactPrompt }
      ], { maxTokens: 800 });
      
      // Clean JSON response
      const cleanResponse = this.cleanJSONResponse(response);
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Task analyzer failed:', error);
      return this.getFallbackAnalysis(userTask, currentTab);
    }
  }

  cleanJSONResponse(response) {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Extract JSON from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    return cleaned;
  }

  formatElements(elements) {
    if (!elements || elements.length === 0) {
      return "No interactive elements found.";
    }

    return elements.slice(0, 10).map(el => 
      `[${el.index}] ${el.tagName} - "${el.text.substring(0, 30)}${el.text.length > 30 ? '...' : ''}"${el.ariaLabel ? ` (${el.ariaLabel})` : ''}`
    ).join('\n');
  }

  getFallbackAnalysis(userTask, currentTab) {
    const lowerTask = userTask.toLowerCase();
    const currentUrl = currentTab?.url || '';
    
    // Determine action based on task and current page
    if (lowerTask.includes('tweet') || lowerTask.includes('post')) {
      if (!currentUrl.includes('x.com')) {
        return {
          action: 'navigate',
          target: 'https://x.com/compose/post',
          reasoning: 'Need to navigate to Twitter compose page'
        };
      }
    }
    
    if (lowerTask.includes('like')) {
      if (!currentUrl.includes('x.com')) {
        return {
          action: 'navigate',
          target: 'https://x.com/home',
          reasoning: 'Need to navigate to Twitter home feed'
        };
      }
    }
    
    return {
      action: 'chat',
      reasoning: 'Unable to determine specific action, defaulting to chat'
    };
  }
}

// Android-Optimized Tab Manager
class AndroidTabManager {
  async ensureCorrectTab(targetUrl, currentTab) {
    try {
      // If we're on a restricted page, create new tab
      if (this.isRestrictedPage(currentTab?.url)) {
        console.log('Creating new tab for restricted page:', currentTab?.url);
        const newTab = await chrome.tabs.create({ url: targetUrl });
        return newTab;
      }
      
      // If current tab is suitable, navigate it
      if (currentTab && currentTab.id) {
        console.log('Navigating current tab to:', targetUrl);
        await chrome.tabs.update(currentTab.id, { url: targetUrl });
        return currentTab;
      }
      
      // Create new tab as fallback
      console.log('Creating new tab as fallback');
      const newTab = await chrome.tabs.create({ url: targetUrl });
      return newTab;
      
    } catch (error) {
      console.error('Tab management error:', error);
      throw error;
    }
  }

  isRestrictedPage(url) {
    if (!url) return true;
    
    const restrictedPages = [
      'chrome-native://',
      'chrome-extension://',
      'chrome://',
      'about:',
      'moz-extension://'
    ];
    
    return restrictedPages.some(prefix => url.startsWith(prefix));
  }

  async waitForTabReady(tabId, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Tab load timeout'));
          return;
        }
        
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            setTimeout(checkReady, 500);
          } else if (tab.status === 'complete') {
            resolve(tab);
          } else {
            setTimeout(checkReady, 500);
          }
        });
      };
      
      checkReady();
    });
  }
}

// Streamlined Action Executor
class ActionExecutor {
  constructor(tabManager) {
    this.tabManager = tabManager;
  }

  async execute(analysis, port) {
    try {
      const currentTab = await this.getCurrentActiveTab();
      
      switch (analysis.action) {
        case 'navigate':
          return await this.handleNavigation(analysis.target, currentTab, port);
          
        case 'click':
          return await this.handleClick(analysis.target, currentTab.id, port);
          
        case 'fill':
          return await this.handleFill(analysis.target, analysis.text, currentTab.id, port);
          
        case 'chat':
          return await this.handleChat(analysis.reasoning);
          
        default:
          return { success: false, error: `Unknown action: ${analysis.action}` };
      }
    } catch (error) {
      console.error('Action execution error:', error);
      return { success: false, error: error.message };
    }
  }

  async handleNavigation(targetUrl, currentTab, port) {
    try {
      this.safePortMessage(port, {
        type: 'status_update',
        message: `🌐 Navigating to ${targetUrl}...`
      });

      const tab = await this.tabManager.ensureCorrectTab(targetUrl, currentTab);
      await this.tabManager.waitForTabReady(tab.id);
      
      // Wait for Android page load
      await this.delay(3000);
      
      // Inject content script
      await this.ensureContentScriptInjected(tab.id);
      
      return {
        success: true,
        message: `Successfully navigated to ${targetUrl}`,
        tabId: tab.id
      };
    } catch (error) {
      return { success: false, error: `Navigation failed: ${error.message}` };
    }
  }

  async handleClick(elementIndex, tabId, port) {
    try {
      this.safePortMessage(port, {
        type: 'status_update',
        message: `👆 Clicking element ${elementIndex}...`
      });

      await this.ensureContentScriptInjected(tabId);
      
      const result = await chrome.tabs.sendMessage(tabId, {
        action: 'CLICK_ELEMENT',
        index: elementIndex
      });
      
      return result;
    } catch (error) {
      return { success: false, error: `Click failed: ${error.message}` };
    }
  }

  async handleFill(elementIndex, text, tabId, port) {
    try {
      this.safePortMessage(port, {
        type: 'status_update',
        message: `✍️ Filling element ${elementIndex}...`
      });

      await this.ensureContentScriptInjected(tabId);
      
      const result = await chrome.tabs.sendMessage(tabId, {
        action: 'FILL_ELEMENT',
        index: elementIndex,
        text: text
      });
      
      return result;
    } catch (error) {
      return { success: false, error: `Fill failed: ${error.message}` };
    }
  }

  async handleChat(reasoning) {
    return {
      success: true,
      message: reasoning || 'Task completed',
      response: reasoning || 'I understand your request. How can I help you further?'
    };
  }

  async getCurrentActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async ensureContentScriptInjected(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'PING' });
    } catch (error) {
      await this.injectContentScript(tabId);
    }
  }

  async injectContentScript(tabId) {
    try {
      console.log('Injecting content script into tab:', tabId);
      
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['buildDomTree.js']
      });
      
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      console.log('Content script injected successfully');
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw error;
    }
  }

  safePortMessage(port, message) {
    try {
      if (port && typeof port.postMessage === 'function') {
        port.postMessage(message);
        return true;
      }
    } catch (error) {
      console.error('Port message failed:', error);
      return false;
    }
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main Background Script Agent
class BackgroundScriptAgent {
  constructor() {
    this.setupMessageHandlers();
    this.activeTasks = new Map();
    this.connections = new Map();
    this.llmService = null;
    this.memoryManager = new TokenOptimizedMemoryManager();
    this.taskAnalyzer = null;
    this.tabManager = new AndroidTabManager();
    this.actionExecutor = new ActionExecutor(this.tabManager);
  }

  setupMessageHandlers() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup-connection') {
        const connectionId = Date.now().toString();
        console.log('Background script connected:', connectionId);
        
        this.connections.set(connectionId, {
          port: port,
          connected: true,
          lastActivity: Date.now()
        });
        
        port.onMessage.addListener(async (message) => {
          try {
            await this.handlePortMessage(message, port, connectionId);
          } catch (error) {
            console.error('Message handling error:', error);
            this.safePortMessage(port, {
              type: 'error',
              error: error.message
            });
          }
        });

        port.onDisconnect.addListener(() => {
          console.log('Background script disconnected:', connectionId);
          this.connections.delete(connectionId);
        });

        setTimeout(() => {
          this.safePortMessage(port, {
            type: 'connected',
            connectionId: connectionId
          });
        }, 100);
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async handlePortMessage(message, port, connectionId) {
    const { type } = message;
    console.log('Background script handling:', type, 'from:', connectionId);

    switch (type) {
      case 'new_task':
        const taskId = Date.now().toString();
        this.activeTasks.set(taskId, { 
          task: message.task, 
          port: port, 
          connectionId: connectionId,
          startTime: Date.now()
        });
        
        await this.executeTask(message.task, port, taskId);
        break;

      case 'get_status':
        const status = await this.getAgentStatus();
        this.safePortMessage(port, {
          type: 'status_response',
          status: status
        });
        break;

      default:
        this.safePortMessage(port, {
          type: 'error',
          error: `Unknown message type: ${type}`
        });
    }
  }

  async executeTask(task, port, taskId) {
    try {
      console.log('Executing task:', task, 'ID:', taskId);
      
      // Initialize services
      if (!this.llmService) {
        const config = await this.getConfig();
        this.llmService = new RobustMultiLLM(config);
        this.taskAnalyzer = new CompactTaskAnalyzer(this.llmService, this.memoryManager);
      }

      this.safePortMessage(port, {
        type: 'task_start',
        task: task,
        taskId: taskId
      });

      // Check if it's a simple chat
      if (this.isSimpleChat(task)) {
        const result = await this.handleSimpleChat(task);
        this.safePortMessage(port, {
          type: 'task_complete',
          result: result,
          taskId: taskId
        });
        return;
      }

      // Get current context
      this.safePortMessage(port, {
        type: 'status_update',
        message: '👁️ Analyzing current page...'
      });

      const currentTab = await this.getCurrentActiveTab();
      const pageState = await this.getPageState(currentTab?.id);

      // Analyze task
      this.safePortMessage(port, {
        type: 'status_update',
        message: '🧠 Planning action...'
      });

      const analysis = await this.taskAnalyzer.analyze(task, pageState, currentTab);
      console.log('Task analysis:', analysis);

      // Execute action
      const result = await this.actionExecutor.execute(analysis, port);

      // If navigation was successful, try to complete the original task
      if (analysis.action === 'navigate' && result.success) {
        await this.delay(2000);
        
        // Re-analyze on new page
        const newTab = await this.getCurrentActiveTab();
        const newPageState = await this.getPageState(newTab.id);
        const newAnalysis = await this.taskAnalyzer.analyze(task, newPageState, newTab);
        
        if (newAnalysis.action !== 'navigate') {
          const finalResult = await this.actionExecutor.execute(newAnalysis, port);
          this.safePortMessage(port, {
            type: 'task_complete',
            result: finalResult,
            taskId: taskId
          });
          return;
        }
      }

      this.safePortMessage(port, {
        type: 'task_complete',
        result: result,
        taskId: taskId
      });

      this.activeTasks.delete(taskId);

    } catch (error) {
      console.error('Task execution error:', error);
      
      this.safePortMessage(port, {
        type: 'task_error',
        error: error.message,
        taskId: taskId
      });
      
      this.activeTasks.delete(taskId);
    }
  }

  isSimpleChat(task) {
    const chatKeywords = ['hello', 'hi', 'how are you', 'what is', 'explain', 'tell me about', 'help'];
    const automationKeywords = ['post', 'tweet', 'like', 'follow', 'login', 'search', 'find', 'navigate', 'click', 'fill'];
    
    const lowerTask = task.toLowerCase();
    const hasChatKeywords = chatKeywords.some(keyword => lowerTask.includes(keyword));
    const hasAutomationKeywords = automationKeywords.some(keyword => lowerTask.includes(keyword));
    
    return hasChatKeywords && !hasAutomationKeywords;
  }

  async handleSimpleChat(task) {
    try {
      const response = await this.llmService.call([
        { 
          role: 'user', 
          content: `You are a helpful AI assistant. Respond naturally to: "${task}"` 
        }
      ], { maxTokens: 500 });

      return {
        success: true,
        response: response,
        message: response
      };
    } catch (error) {
      return {
        success: true,
        response: `I understand you said: "${task}"\n\nI'm your AI web automation assistant for Android! I can help with social media tasks and browsing. What would you like me to help you with?`,
        message: 'Fallback chat response'
      };
    }
  }

  async getCurrentActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async getPageState(tabId) {
    if (!tabId) return {};
    
    try {
      await this.ensureContentScriptInjected(tabId);
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'GET_PAGE_STATE'
      });
      return response.success ? response.pageState : {};
    } catch (error) {
      console.warn('Could not get page state:', error);
      return {};
    }
  }

  async ensureContentScriptInjected(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'PING' });
    } catch (error) {
      await this.actionExecutor.injectContentScript(tabId);
    }
  }

  safePortMessage(port, message) {
    try {
      if (port && typeof port.postMessage === 'function') {
        port.postMessage(message);
        return true;
      }
    } catch (error) {
      console.error('Port message failed:', error);
      return false;
    }
    return false;
  }

  async getConfig() {
    const result = await chrome.storage.sync.get(['agentConfig']);
    return result.agentConfig || {};
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'AGENT_STATUS':
          const status = await this.getAgentStatus();
          sendResponse(status);
          break;

        case 'UPDATE_CONFIG':
          const configResult = await this.updateConfig(request.config);
          sendResponse(configResult);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async getAgentStatus() {
    const config = await this.getConfig();
    return {
      isRunning: true,
      hasAgent: true,
      activeTasks: this.activeTasks.size,
      connections: this.connections.size,
      androidOptimized: true,
      tokenOptimized: true,
      config: {
        hasAnthropicKey: !!config.anthropicApiKey,
        hasOpenAIKey: !!config.openaiApiKey,
        hasGeminiKey: !!config.geminiApiKey,
        aiProvider: config.aiProvider || 'anthropic'
      }
    };
  }

  async updateConfig(config) {
    try {
      await chrome.storage.sync.set({ agentConfig: config });
      this.llmService = new RobustMultiLLM(config);
      this.taskAnalyzer = new CompactTaskAnalyzer(this.llmService, this.memoryManager);
      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the background script agent
const backgroundScriptAgent = new BackgroundScriptAgent();
console.log('AI Web Agent Background Script Initialized 🚀');