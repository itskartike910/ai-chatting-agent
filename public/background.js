/* global chrome */

console.log('Enhanced background script loaded');

// Simple MultiLLM implementation (inline to avoid import issues)
class BackgroundMultiLLM {
  constructor(config = {}) {
    this.config = config;
  }

  async call(messages, options = {}) {
    const provider = options.provider || this.config.aiProvider || 'anthropic';
    
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
        max_tokens: options.maxTokens || 1000,
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
        max_tokens: options.maxTokens || 1000,
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

// Enhanced Social Agent with better port management
class EnhancedSocialAgent {
  constructor() {
    this.setupMessageHandlers();
    this.activeTasks = new Map();
    this.connections = new Map();
    this.llmService = null;
    this.taskQueue = [];
  }

  setupMessageHandlers() {
    // Handle popup connections with better error handling
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup-connection') {
        const connectionId = Date.now().toString();
        console.log('Popup connected:', connectionId);
        
        // Store connection with metadata
        this.connections.set(connectionId, {
          port: port,
          connected: true,
          lastActivity: Date.now()
        });
        
        port.onMessage.addListener(async (message) => {
          try {
            // Update last activity
            const connection = this.connections.get(connectionId);
            if (connection) {
              connection.lastActivity = Date.now();
            }
            
            await this.handlePortMessage(message, port, connectionId);
          } catch (error) {
            console.error('Message handling error:', error);
            // Try to send error if port is still connected
            this.safePortMessage(port, {
              type: 'error',
              error: error.message
            });
          }
        });

        port.onDisconnect.addListener(() => {
          console.log('Popup disconnected:', connectionId);
          const connection = this.connections.get(connectionId);
          if (connection) {
            connection.connected = false;
          }
          this.connections.delete(connectionId);
        });

        // Send connection confirmation immediately
        setTimeout(() => {
          this.safePortMessage(port, {
            type: 'connected',
            connectionId: connectionId
          });
        }, 100);
      }
    });

    // Handle one-time messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  // Safe port messaging with enhanced connection check
  safePortMessage(port, message) {
    try {
      if (port && typeof port.postMessage === 'function') {
        // Check if port is still alive by accessing its properties
        if (port.name && port.sender) {
          port.postMessage(message);
          return true;
        }
      }
    } catch (error) {
      console.error('Port message failed:', error.message);
      return false;
    }
    return false;
  }

  async handlePortMessage(message, port, connectionId) {
    const { type } = message;
    console.log('Handling message type:', type, 'from connection:', connectionId);

    switch (type) {
      case 'new_task':
        // Add task to queue and execute
        const taskId = Date.now().toString();
        this.activeTasks.set(taskId, { 
          task: message.task, 
          port: port, 
          connectionId: connectionId,
          startTime: Date.now()
        });
        
        await this.executeTask(message.task, port, taskId);
        break;

      case 'heartbeat':
        this.safePortMessage(port, { type: 'heartbeat_ack' });
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
      
      // Initialize LLM service if needed
      if (!this.llmService) {
        const config = await this.getConfig();
        this.llmService = new BackgroundMultiLLM(config);
      }

      // Send task start notification
      if (!this.safePortMessage(port, {
        type: 'task_start',
        task: task,
        taskId: taskId
      })) {
        console.warn('Failed to send task_start message');
        return;
      }

      let result;
      
      // Route task based on content
      if (!this.containsActionKeywords(task)) {
        result = await this.handleChatMessage(task, port);
      } else if (task.toLowerCase().includes('post') || task.toLowerCase().includes('tweet')) {
        result = await this.handlePostTask(task, port);
      } else if (task.toLowerCase().includes('login')) {
        result = await this.handleLoginTask(port);
      } else {
        result = await this.handleChatMessage(task, port);
      }

      // Send completion notification with retry mechanism
      let messageSent = false;
      let retries = 3;
      
      while (!messageSent && retries > 0) {
        messageSent = this.safePortMessage(port, {
          type: 'task_complete',
          result: result,
          taskId: taskId
        });
        
        if (!messageSent) {
          console.warn(`Failed to send task_complete, retries left: ${retries - 1}`);
          await this.delay(500);
          retries--;
        }
      }
      
      if (!messageSent) {
        console.error('Failed to deliver task result after all retries');
      }

      // Clean up task
      this.activeTasks.delete(taskId);
      
      return result;
    } catch (error) {
      console.error('Task execution error:', error);
      
      // Try to send error message
      this.safePortMessage(port, {
        type: 'task_error',
        error: error.message,
        taskId: taskId
      });
      
      // Clean up task
      this.activeTasks.delete(taskId);
      throw error;
    }
  }

  containsActionKeywords(task) {
    const actionKeywords = ['post', 'tweet', 'login', 'navigate', 'click', 'fill'];
    return actionKeywords.some(keyword => task.toLowerCase().includes(keyword));
  }

  async handleChatMessage(task, port) {
    try {
      this.safePortMessage(port, {
        type: 'status_update',
        message: 'Thinking...'
      });

      if (!this.llmService) {
        const config = await this.getConfig();
        this.llmService = new BackgroundMultiLLM(config);
      }

      const response = await this.llmService.call([
        { 
          role: 'user', 
          content: `You are a helpful AI assistant. You can chat about anything and everything - answer questions, have conversations, provide information on any topic, tell jokes, discuss current events, explain concepts, help with problems, and more.

You also happen to be great at social media management, particularly X (Twitter), so if someone asks about posting tweets, logging in, or social media tasks, you can help with those too.

But feel free to chat about absolutely anything! You're not limited to social media topics.

User message: "${task}"

Please respond naturally and helpfully to whatever they're asking about.` 
        }
      ]);

      return {
        success: true,
        response: response,
        message: response,
        actions: [{ success: true, message: 'Chat response generated' }]
      };
    } catch (error) {
      console.error('Chat message error:', error);
      // Fallback response if AI is not configured
      const fallbackResponse = this.getFallbackResponse(task);
      return {
        success: true,
        response: fallbackResponse,
        message: fallbackResponse,
        actions: [{ success: true, message: 'Fallback response used' }]
      };
    }
  }

  getFallbackResponse(task) {
    const lowerTask = task.toLowerCase();
    
    if (lowerTask.includes('hello') || lowerTask.includes('hi')) {
      return "👋 Hello! I'm your AI Social Media Assistant. I can help you with:\n\n• Posting tweets on X (Twitter)\n• Logging into your accounts\n• Generating content ideas\n• General social media tasks\n\nWhat would you like to do today?";
    }
    
    if (lowerTask.includes('help')) {
      return "🤖 I'm here to help with your social media tasks! Here's what I can do:\n\n• **Post Content**: 'Post a tweet about AI technology'\n• **Login Help**: 'Help me login to X'\n• **Content Ideas**: 'Generate content about [topic]'\n• **General Chat**: Just talk to me!\n\nTo get started, you'll need to configure your AI API key in settings (⚙️).";
    }
    
    return "I understand you said: '" + task + "'\n\nI'm your AI Social Media Assistant! I can help with posting tweets, logging in, and generating content. To enable full AI capabilities, please configure your API key in settings.\n\nWhat would you like to do?";
  }

  async handlePostTask(task, port) {
    try {
      this.safePortMessage(port, {
        type: 'status_update',
        message: 'Generating content...'
      });

      // Extract or generate content
      let content = this.extractContent(task);
      
      if (!content) {
        if (!this.llmService) {
          const config = await this.getConfig();
          this.llmService = new BackgroundMultiLLM(config);
        }
        // Generate content using AI
        content = await this.llmService.call([
          { role: 'user', content: `Generate a tweet about: ${task}. Keep it under 280 characters, engaging, and appropriate for X (Twitter).` }
        ]);
      }

      this.safePortMessage(port, {
        type: 'status_update',
        message: 'Opening X/Twitter...'
      });

      // Find or open X tab
      const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
      let activeTab;
      
      if (tabs.length === 0) {
        activeTab = await chrome.tabs.create({ url: 'https://x.com/compose/post' });
        await this.waitForTabReady(activeTab.id);
      } else {
        activeTab = tabs[0];
        await chrome.tabs.update(activeTab.id, { active: true });
      }

      this.safePortMessage(port, {
        type: 'status_update',
        message: 'Posting content...'
      });

      // Send to content script
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'POST_TWEET',
        content: content.trim()
      });

      return {
        success: response.success,
        response: response.success ? `✅ Posted: "${content.trim()}"` : `❌ ${response.error}`,
        message: response.success ? `Posted: "${content.trim()}"` : response.error,
        content: content.trim(),
        actions: [response]
      };
    } catch (error) {
      return {
        success: false,
        response: `❌ Error posting: ${error.message}`,
        message: `Error posting: ${error.message}`,
        error: error.message
      };
    }
  }

  async handleLoginTask(port) {
    try {
      this.safePortMessage(port, {
        type: 'status_update',
        message: 'Opening X login page...'
      });

      const tab = await chrome.tabs.create({
        url: 'https://x.com/i/flow/login',
        active: true
      });

      return {
        success: true,
        response: "🔐 Login page opened! Please complete the login process manually. I'll help you with tasks once you're logged in.",
        message: 'Login page opened - please complete manually',
        actions: [{ success: true, message: 'Login page opened' }]
      };
    } catch (error) {
      return {
        success: false,
        response: `❌ Login error: ${error.message}`,
        message: `Login error: ${error.message}`,
        error: error.message
      };
    }
  }

  extractContent(task) {
    // Extract quoted content
    const match = task.match(/"([^"]+)"/);
    if (match) return match[1];
    
    // Extract content after "post" or "tweet"
    const postMatch = task.match(/(?:post|tweet)\s+(?:about\s+)?(.+)/i);
    if (postMatch) return postMatch[1];
    
    return null;
  }

  async waitForTabReady(tabId) {
    return new Promise((resolve) => {
      const checkReady = () => {
        chrome.tabs.sendMessage(tabId, { action: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            setTimeout(checkReady, 1000);
          } else {
            resolve();
          }
        });
      };
      setTimeout(checkReady, 3000);
    });
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
      
      // Reinitialize LLM service
      this.llmService = new BackgroundMultiLLM(config);
      
      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the enhanced agent
const enhancedAgent = new EnhancedSocialAgent();
console.log('Enhanced Social Agent initialized');