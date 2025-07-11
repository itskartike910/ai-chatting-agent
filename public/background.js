/* global chrome */

console.log('AI Universal Agent Background Script Loading...');

// Enhanced Memory Manager
class ProceduralMemoryManager {
  constructor() {
    this.messages = [];
    this.proceduralSummaries = [];
    this.maxMessages = 10;
    this.maxSummaries = 3;
    this.stepCounter = 0;
  }

  addMessage(message) {
    const safeMessage = {
      ...message,
      content: this.ensureString(message.content),
      timestamp: Date.now(),
      step: this.stepCounter++
    };

    this.messages.push(safeMessage);

    if (this.messages.length > this.maxMessages) {
      this.createProceduralSummary();
      this.messages = this.messages.slice(-6);
    }
  }

  ensureString(content) {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    if (typeof content === 'object') return JSON.stringify(content);
    return String(content);
  }

  createProceduralSummary() {
    const recentMessages = this.messages.slice(-4);
    const summary = {
      steps: `${Math.max(0, this.stepCounter - 4)}-${this.stepCounter}`,
      actions: recentMessages.map(m => m.action || 'action').join(' → '),
      findings: recentMessages.map(m => this.ensureString(m.content)).join(' '),
      timestamp: Date.now()
    };
    
    this.proceduralSummaries.push(summary);
    if (this.proceduralSummaries.length > this.maxSummaries) {
      this.proceduralSummaries.shift();
    }
  }

  getContext() {
    return {
      recentMessages: this.messages.slice(-3).map(m => ({
        ...m,
        content: this.ensureString(m.content)
      })),
      proceduralSummaries: this.proceduralSummaries,
      currentStep: this.stepCounter
    };
  }

  clear() {
    this.messages = [];
    this.proceduralSummaries = [];
    this.stepCounter = 0;
  }
}

// Background Task Manager
class BackgroundTaskManager {
  constructor() {
    this.runningTasks = new Map();
    this.taskResults = new Map();
    this.maxConcurrentTasks = 2;
    console.log('✅ BackgroundTaskManager initialized');
  }

  async startTask(taskId, taskData, executor, connectionManager) {
    console.log(`🚀 BackgroundTaskManager starting: ${taskId}`);
    
    this.runningTasks.set(taskId, {
      id: taskId,
      data: taskData,
      status: 'running',
      startTime: Date.now(),
      messages: [],
      executor: executor
    });

    setTimeout(() => {
      this.executeTaskIndependently(taskId, taskData, executor, connectionManager);
    }, 100);
  }

  async executeTaskIndependently(taskId, taskData, executor, connectionManager) {
    try {
      console.log(`⚙️ BackgroundTaskManager executing independently: ${taskId}`);
      
      const backgroundConnectionManager = {
        broadcast: (message) => {
          const task = this.runningTasks.get(taskId);
          if (task) {
            task.messages.push({
              ...message,
              timestamp: Date.now()
            });
            
            if (message.type === 'task_complete' || message.type === 'task_error') {
              task.status = message.type === 'task_complete' ? 'completed' : 'error';
              task.result = message.result || message;
              task.endTime = Date.now();
              
              this.taskResults.set(taskId, task);
              this.runningTasks.delete(taskId);
              
              console.log(`✅ BackgroundTaskManager completed: ${taskId}`);
            }
            
            if (connectionManager) {
              connectionManager.broadcast(message);
            }
          }
        }
      };

      await executor.execute(taskData.task, backgroundConnectionManager);

    } catch (error) {
      console.error(`❌ BackgroundTaskManager error: ${taskId}`, error);
      
      const task = this.runningTasks.get(taskId);
      if (task) {
        task.status = 'error';
        task.error = error.message;
        task.endTime = Date.now();
        
        this.taskResults.set(taskId, task);
        this.runningTasks.delete(taskId);
      }
    }
  }

  getTaskStatus(taskId) {
    return this.runningTasks.get(taskId) || this.taskResults.get(taskId) || null;
  }

  getRecentMessages(taskId, limit = 10) {
    const task = this.getTaskStatus(taskId);
    return task?.messages?.slice(-limit) || [];
  }

  getAllRunningTasks() {
    return Array.from(this.runningTasks.values());
  }

  getAllCompletedTasks() {
    return Array.from(this.taskResults.values());
  }

  cancelTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task && task.executor) {
      console.log(`🛑 BackgroundTaskManager cancelling: ${taskId}`);
      task.executor.cancel();
      task.status = 'cancelled';
      task.endTime = Date.now();
      
      this.taskResults.set(taskId, task);
      this.runningTasks.delete(taskId);
      return true;
    }
    return false;
  }
}

// Universal Action Registry - Platform Agnostic
class UniversalActionRegistry {
  constructor(browserContext) {
    this.browserContext = browserContext;
    this.actions = new Map();
    this.initializeActions();
  }

  initializeActions() {
    // Navigation Action
    this.actions.set('navigate', {
      description: 'Navigate to a specific URL',
      schema: {
        url: 'string - The complete URL to navigate to',
        intent: 'string - Description of why navigating to this URL'
      },
      handler: async (input) => {
        try {
          const url = this.validateAndFixUrl(input.url);
          if (!url) {
            throw new Error('Invalid or missing URL');
          }
          
          console.log(`🌐 Universal Navigation: ${url}`);
          
          const currentTab = await this.browserContext.getCurrentActiveTab();
          if (currentTab) {
            try {
              await chrome.tabs.remove(currentTab.id);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              console.log('Could not close current tab:', e);
            }
          }
          
          const newTab = await chrome.tabs.create({ url: url, active: true });
          this.browserContext.activeTabId = newTab.id;
          await this.browserContext.waitForReady(newTab.id);
          
          return {
            success: true,
            extractedContent: `Successfully navigated to ${url}`,
            includeInMemory: true,
            navigationCompleted: true
          };
          
        } catch (error) {
          console.error('Navigation error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Navigation failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Click Action - Universal
    this.actions.set('click', {
      description: 'Click on any interactive element on the page',
      schema: {
        index: 'number - The element index from the page state',
        selector: 'string - CSS selector (alternative to index)',
        intent: 'string - Description of what you are clicking and why'
      },
      handler: async (input) => {
        try {
          console.log(`🖱️ Universal Click: ${input.intent || 'Click action'}`);
          
          return new Promise((resolve) => {
            const actionParams = {};
            
            if (input.index !== undefined) {
              actionParams.index = input.index;
            } else if (input.selector) {
              actionParams.selector = input.selector;
            } else {
              resolve({
                success: false,
                error: 'No index or selector provided',
                extractedContent: 'Click failed: No target specified',
                includeInMemory: true
              });
              return;
            }
            
            chrome.wootz.performAction('click', actionParams, (result) => {
              resolve({
                success: result.success,
                extractedContent: result.success ? 
                  `Successfully clicked: ${input.intent}` : 
                  `Click failed: ${result.error}`,
                includeInMemory: true,
                error: result.error
              });
            });
          });
        } catch (error) {
          console.error('Click action error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Click failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Type Action - Universal
    this.actions.set('type', {
      description: 'Type text into any input field, textarea, or contenteditable element',
      schema: {
        index: 'number - The element index from the page state',
        selector: 'string - CSS selector (alternative to index)',
        text: 'string - The text to type into the element',
        intent: 'string - Description of what you are typing and why'
      },
      handler: async (input) => {
        try {
          console.log(`⌨️ Universal Type: "${input.text}" - ${input.intent}`);
          
          return new Promise((resolve) => {
            const actionParams = {
              text: input.text
            };
            
            if (input.index !== undefined) {
              actionParams.index = input.index;
            } else if (input.selector) {
              actionParams.selector = input.selector;
            } else {
              resolve({
                success: false,
                error: 'No index or selector provided for text input',
                extractedContent: `Type failed: No target specified for "${input.text}"`,
                includeInMemory: true
              });
              return;
            }
            
            chrome.wootz.performAction('fill', actionParams, (result) => {
              resolve({
                success: result.success,
                extractedContent: result.success ? 
                  `Successfully typed: "${input.text}"` : 
                  `Type failed: ${result.error}`,
                includeInMemory: true,
                error: result.error
              });
            });
          });
        } catch (error) {
          console.error('Type action error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Type failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Scroll Action - Universal
    this.actions.set('scroll', {
      description: 'Scroll the page in any direction',
      schema: {
        direction: 'string - Direction to scroll (up, down, left, right)',
        amount: 'number - Amount to scroll in pixels (optional, default: 300)',
        intent: 'string - Description of why you are scrolling'
      },
      handler: async (input) => {
        try {
          const amount = String(input.amount || 300);
          const direction = input.direction || 'down';
          
          console.log(`📜 Universal Scroll: ${direction} by ${amount}px - ${input.intent}`);
          
          return new Promise((resolve) => {
            chrome.wootz.performAction('scroll', {
              direction: direction,
              amount: amount
            }, (result) => {
              resolve({
                success: result.success,
                extractedContent: result.success ? 
                  `Scrolled ${direction} by ${amount}px` : 
                  `Scroll failed: ${result.error}`,
                includeInMemory: true,
                error: result.error
              });
            });
          });
        } catch (error) {
          console.error('Scroll action error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Scroll failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Wait Action - Universal
    this.actions.set('wait', {
      description: 'Wait for a specified amount of time',
      schema: {
        duration: 'number - Time to wait in milliseconds (default: 2000)',
        intent: 'string - Reason for waiting'
      },
      handler: async (input) => {
        const duration = input.duration || 2000;
        console.log(`⏳ Universal Wait: ${duration}ms - ${input.intent}`);
        await new Promise(resolve => setTimeout(resolve, duration));
        return {
          success: true,
          extractedContent: `Waited ${duration}ms`,
          includeInMemory: true
        };
      }
    });

    // Complete Action - Universal
    this.actions.set('complete', {
      description: 'Mark the task as completed with a summary',
      schema: {
        success: 'boolean - Whether the task was successful',
        summary: 'string - Summary of what was accomplished',
        details: 'string - Additional details about the completion'
      },
      handler: async (input) => {
        console.log(`✅ Task Complete: ${input.summary}`);
        return {
          success: input.success !== false,
          extractedContent: input.summary || 'Task completed',
          isDone: true,
          includeInMemory: true,
          completionDetails: input.details
        };
      }
    });
  }

  async executeAction(actionName, input) {
    const action = this.actions.get(actionName);
    if (!action) {
      throw new Error(`Unknown action: ${actionName}`);
    }

    try {
      return await action.handler(input);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        extractedContent: `Action ${actionName} failed: ${error.message}`,
        includeInMemory: true
      };
    }
  }

  getAvailableActions() {
    const actionsInfo = {};
    this.actions.forEach((action, name) => {
      actionsInfo[name] = {
        description: action.description,
        schema: action.schema
      };
    });
    return actionsInfo;
  }

  validateAndFixUrl(url) {
    if (!url || typeof url !== 'string') {
      console.error('Invalid URL provided:', url);
      return null;
    }
    
    url = url.trim().replace(/['"]/g, '');
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return url;
      } catch (e) {
        console.error('Invalid URL format:', url);
        return null;
      }
    }
    
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
      return url;
    } catch (e) {
      console.error('Could not create valid URL:', url);
      return null;
    }
  }
}

// Universal Planner Agent - Platform Agnostic
class UniversalPlannerAgent {
  constructor(llmService, memoryManager) {
    this.llmService = llmService;
    this.memoryManager = memoryManager;
  }

  async plan(userTask, currentState, executionHistory) {
    const context = this.memoryManager.getContext();
    
    const plannerPrompt = `You are an intelligent web automation planner. Analyze the current page state and create a strategic plan to accomplish the user's task.

# USER TASK
"${userTask}"

# CURRENT PAGE STATE
- URL: ${currentState.pageInfo?.url || 'unknown'}
- Title: ${currentState.pageInfo?.title || 'unknown'}  
- Domain: ${this.extractDomain(currentState.pageInfo?.url)}
- Interactive Elements: ${currentState.interactiveElements?.length || 0} available

# AVAILABLE ELEMENTS (Top 15)
${this.formatElements(currentState.interactiveElements?.slice(0, 15) || [])}

# EXECUTION HISTORY
${executionHistory.slice(-3).map((h, i) => `Step ${h.step}: ${h.success ? '✅' : '❌'} ${h.navigation || 'Unknown action'}`).join('\n') || 'No previous steps'}

# CONTEXT MEMORY
${context.proceduralSummaries.map(s => `Steps ${s.steps}: ${s.findings.substring(0, 100)}...`).join('\n') || 'No previous context'}

# RESPONSE FORMAT
Respond with JSON only:
{
  "observation": "Current situation analysis",
  "done": false,
  "strategy": "High-level approach to accomplish the task",
  "next_action": "Specific next action to take",
  "reasoning": "Why this approach will work",
  "completion_criteria": "How to know when task is complete"
}

# RULES
- Set "done": true ONLY when the task is completely finished
- Be specific about what action to take next
- Consider the domain context but don't make assumptions about specific platforms
- Focus on visible, interactive elements
- Plan one logical step at a time
- If navigation is needed, be specific about the URL`;

    try {
      const response = await this.llmService.call([
        { role: 'user', content: plannerPrompt }
      ], { maxTokens: 800 }, 'planner');
      
      const plan = JSON.parse(this.cleanJSONResponse(response));
      
      this.memoryManager.addMessage({
        role: 'planner',
        action: 'plan',
        content: plan.next_action || 'Plan created'
      });
      
      return plan;
    } catch (error) {
      console.error('Planner failed:', error);
      return this.getFallbackPlan(userTask, currentState);
    }
  }

  extractDomain(url) {
    if (!url) return 'unknown';
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  formatElements(elements) {
    if (!elements || elements.length === 0) return "No interactive elements found.";
    
    return elements.map(el => {
      const text = (el.text || el.ariaLabel || '').substring(0, 50);
      const type = el.tagName?.toLowerCase() || 'element';
      return `[${el.index}] ${type}: "${text}"${text.length > 50 ? '...' : ''}`;
    }).join('\n');
  }

  cleanJSONResponse(response) {
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }

  getFallbackPlan(userTask, currentState) {
    const domain = this.extractDomain(currentState.pageInfo?.url);
    
    return {
      observation: `Currently on ${domain}. Need to analyze page for task: ${userTask}`,
      done: false,
      strategy: "Analyze current page elements and determine appropriate actions",
      next_action: "Examine available interactive elements and take appropriate action",
      reasoning: "Need to understand the current page before proceeding",
      completion_criteria: "Task objectives met based on user requirements"
    };
  }
}

// Universal Navigator Agent - Platform Agnostic
class UniversalNavigatorAgent {
  constructor(llmService, memoryManager, actionRegistry) {
    this.llmService = llmService;
    this.memoryManager = memoryManager;
    this.actionRegistry = actionRegistry;
  }

  async navigate(plan, currentState) {
    const context = this.memoryManager.getContext();
    
    const navigatorPrompt = `You are a web navigation specialist. Execute the planned action using available page elements and actions.

# PLAN TO EXECUTE
Strategy: ${plan.strategy}
Next Action: ${plan.next_action}
Reasoning: ${plan.reasoning}

# CURRENT PAGE STATE
URL: ${currentState.pageInfo?.url}
Title: ${currentState.pageInfo?.title}
Domain: ${this.extractDomain(currentState.pageInfo?.url)}

# AVAILABLE ELEMENTS
${this.formatElementsWithDetails(currentState.interactiveElements || [])}

# AVAILABLE ACTIONS
${this.formatAvailableActions()}

# RESPONSE FORMAT - JSON ONLY
{
  "thinking": "Analysis of current situation and plan",
  "action": {
    "name": "action_name",
    "parameters": {
      "index": 5,
      "text": "example text",
      "intent": "Clear description of what this action accomplishes"
    }
  }
}

# CRITICAL RULES
- Use EXACT index numbers from the element list above
- Always include descriptive "intent" explaining what the action accomplishes
- Choose the most appropriate action from the available actions list
- For navigation, provide complete URLs with protocol (https://)
- Be specific and precise with all parameters
- Only use elements that are actually present in the list above`;

    try {
      const response = await this.llmService.call([
        { role: 'user', content: navigatorPrompt }
      ], { maxTokens: 800 }, 'navigator');
      
      const navResult = JSON.parse(this.cleanJSONResponse(response));
      
      // Validate the action
      if (navResult.action && navResult.action.name) {
        const availableActions = this.actionRegistry.getAvailableActions();
        if (!availableActions[navResult.action.name]) {
          console.warn(`⚠️ Unknown action: ${navResult.action.name}`);
          return this.getFallbackNavigation(plan, currentState);
        }
        
        // Validate element index if provided
        if (navResult.action.parameters?.index !== undefined) {
          const availableIndexes = (currentState.interactiveElements || []).map(el => el.index);
          if (!availableIndexes.includes(navResult.action.parameters.index)) {
            console.warn(`⚠️ Invalid element index ${navResult.action.parameters.index}. Available: ${availableIndexes.join(', ')}`);
          }
        }
      }
      
      this.memoryManager.addMessage({
        role: 'navigator',
        action: 'navigate',
        content: navResult.action?.parameters?.intent || 'Navigation executed'
      });
      
      return navResult;
    } catch (error) {
      console.error('Navigator failed:', error);
      return this.getFallbackNavigation(plan, currentState);
    }
  }

  extractDomain(url) {
    if (!url) return 'unknown';
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  formatElementsWithDetails(elements) {
    if (!elements || elements.length === 0) return "No interactive elements found.";
    
    return elements.slice(0, 20).map(el => {
      let description = `[${el.index}] ${el.tagName?.toLowerCase() || 'element'}`;
      
      if (el.elementType) description += ` (${el.elementType})`;
      
      const text = el.text || el.ariaLabel || '';
      if (text) description += `: "${text.substring(0, 60)}"${text.length > 60 ? '...' : ''}`;
      
      const attributes = [];
      if (el.isLoginElement) attributes.push('LOGIN');
      if (el.isPostElement) attributes.push('POST');
      if (attributes.length > 0) description += ` [${attributes.join(',')}]`;
      
      return description;
    }).join('\n');
  }

  formatAvailableActions() {
    const actions = this.actionRegistry.getAvailableActions();
    return Object.entries(actions).map(([name, info]) => {
      return `${name}: ${info.description}\n  Parameters: ${Object.entries(info.schema).map(([param, desc]) => `${param} - ${desc}`).join(', ')}`;
    }).join('\n\n');
  }

  cleanJSONResponse(response) {
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }

  getFallbackNavigation(plan, currentState) {
    const domain = this.extractDomain(currentState.pageInfo?.url);
    
    return {
      thinking: `Fallback navigation for ${domain}. Need to wait and observe page state.`,
      action: {
        name: 'wait',
        parameters: {
          duration: 2000,
          intent: 'Wait to allow page to load and observe current state'
        }
      }
    };
  }
}

// Universal Validator Agent
class UniversalValidatorAgent {
  constructor(llmService, memoryManager) {
    this.llmService = llmService;
    this.memoryManager = memoryManager;
  }

  async validate(originalTask, executionHistory, finalState) {
    const validatorPrompt = `You are a task completion validator. Determine if the original task has been successfully completed.

# ORIGINAL TASK
"${originalTask}"

# EXECUTION HISTORY
${executionHistory.map((h, i) => `Step ${i + 1}: ${h.navigation || 'action'} - ${h.success ? 'SUCCESS' : 'FAILED'}`).join('\n')}

# FINAL PAGE STATE
- URL: ${finalState.pageInfo?.url}
- Title: ${finalState.pageInfo?.title}
- Domain: ${this.extractDomain(finalState.pageInfo?.url)}
- Available Elements: ${finalState.interactiveElements?.length || 0}

# VISIBLE PAGE ELEMENTS (for context)
${this.formatElements(finalState.interactiveElements?.slice(0, 10) || [])}

# RESPONSE FORMAT (JSON only)
{
  "is_valid": true,
  "confidence": 0.8,
  "reason": "Detailed explanation of completion status",
  "evidence": "Specific evidence from page state or execution history",
  "recommendation": "Next steps if task incomplete, or confirmation if complete"
}

# EVALUATION CRITERIA
- Task completion should be based on objective evidence
- Consider both successful actions and current page state
- High confidence (0.8+) only for clear success indicators
- Medium confidence (0.5-0.7) for partial completion
- Low confidence (0.3-0.4) for unclear results`;

    try {
      const response = await this.llmService.call([
        { role: 'user', content: validatorPrompt }
      ], { maxTokens: 600 }, 'validator');
      
      const validation = JSON.parse(this.cleanJSONResponse(response));
      
      this.memoryManager.addMessage({
        role: 'validator',
        action: 'validate',
        content: validation.reason || 'Validation completed'
      });
      
      return validation;
    } catch (error) {
      console.error('Validator failed:', error);
      return {
        is_valid: executionHistory.some(h => h.success),
        confidence: 0.5,
        reason: "Validation failed, partial success based on execution history",
        evidence: "Validation service unavailable",
        recommendation: "Manual verification recommended"
      };
    }
  }

  extractDomain(url) {
    if (!url) return 'unknown';
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  formatElements(elements) {
    if (!elements || elements.length === 0) return "No elements found.";
    
    return elements.map(el => {
      const text = (el.text || el.ariaLabel || '').substring(0, 40);
      return `[${el.index}] ${el.tagName}: "${text}"`;
    }).join('\n');
  }

  cleanJSONResponse(response) {
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }
}

// Browser Context Manager (keeping existing functionality)
class BrowserContextManager {
  constructor() {
    this.activeTabId = null;
  }

  async ensureTab(url) {
    try {
      const currentTab = await this.getCurrentActiveTab();
      
      if (!currentTab || this.isRestrictedPage(currentTab.url)) {
        console.log('Creating new tab for restricted page');
        const newTab = await chrome.tabs.create({ url: url, active: true });
        this.activeTabId = newTab.id;
        await this.waitForReady(newTab.id);
        return {
          success: true,
          extractedContent: `Navigated to ${url}`,
          includeInMemory: true
        };
      }

      console.log('Working with current tab:', currentTab.url);
      this.activeTabId = currentTab.id;
      
      return {
        success: true,
        extractedContent: `Working with current page: ${currentTab.url}`,
        includeInMemory: true
      };
      
    } catch (error) {
      console.error('Tab management error:', error);
      return {
        success: false,
        error: error.message,
        extractedContent: `Navigation error: ${error.message}`,
        includeInMemory: true
      };
    }
  }

  async waitForReady(tabId, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (Date.now() - startTime > timeout) {
          resolve({ id: tabId, status: 'timeout' });
          return;
        }
        
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) {
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

  async getCurrentActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0];
    } catch (error) {
      return null;
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

  async closeExcessTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      if (tabs.length > 5) {
        for (let i = 5; i < tabs.length; i++) {
          try {
            await chrome.tabs.remove(tabs[i].id);
          } catch (e) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      console.log('Could not close excess tabs:', error);
    }
  }
}

// Fix for the URL validation issues
function fixUrlValidation() {
  // Add null checks to prevent the TypeError
  const originalMethods = {
    checkBasicLoginStatus: function(url) {
      if (!url || typeof url !== 'string') return false;
      return !url.includes('/login') && !url.includes('/signin');
    },
    
    determinePageType: function(url) {
      if (!url || typeof url !== 'string') return 'general';
      if (url.includes('/compose') || url.includes('/intent/tweet')) return 'compose';
      if (url.includes('/home') || url.includes('/timeline')) return 'home';
      if (url.includes('/login') || url.includes('/signin')) return 'login';
      if (url.includes('/profile') || url.includes('/user/')) return 'profile';
      return 'general';
    },
    
    detectPlatform: function(url) {
      if (!url || typeof url !== 'string') return 'unknown';
      const lowerUrl = url.toLowerCase();
      
      if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return 'twitter';
      if (lowerUrl.includes('linkedin.com')) return 'linkedin';
      if (lowerUrl.includes('facebook.com')) return 'facebook';
      if (lowerUrl.includes('instagram.com')) return 'instagram';
      if (lowerUrl.includes('youtube.com')) return 'youtube';
      if (lowerUrl.includes('tiktok.com')) return 'tiktok';
      
      return 'unknown';
    }
  };
  
  return originalMethods;
}

// Universal Multi-Agent Executor - Using Wootz APIs
class UniversalMultiAgentExecutor {
  constructor(llmService) {
    this.llmService = llmService;
    this.memoryManager = new ProceduralMemoryManager();
    this.browserContext = new BrowserContextManager();
    this.actionRegistry = new UniversalActionRegistry(this.browserContext);
    
    this.planner = new UniversalPlannerAgent(this.llmService, this.memoryManager);
    this.navigator = new UniversalNavigatorAgent(this.llmService, this.memoryManager, this.actionRegistry);
    this.validator = new UniversalValidatorAgent(this.llmService, this.memoryManager);
    
    // Fixed helper methods
    const helpers = fixUrlValidation();
    this.checkBasicLoginStatus = helpers.checkBasicLoginStatus;
    this.determinePageType = helpers.determinePageType;
    this.detectPlatform = helpers.detectPlatform;
    
    this.maxSteps = 15;
    this.executionHistory = [];
    this.currentStep = 0;
    this.cancelled = false;
  }

  async execute(userTask, connectionManager) {
    this.currentStep = 0;
    this.executionHistory = [];
    this.cancelled = false;
    
    try {
      let taskCompleted = false;
      let finalResult = null;

      console.log(`🚀 Universal Multi-agent execution: ${userTask}`);
      connectionManager.broadcast({
        type: 'task_start',
        message: `🚀 Starting universal task: ${userTask}`
      });

      while (!taskCompleted && this.currentStep < this.maxSteps && !this.cancelled) {
        this.currentStep++;
        
        console.log(`🔄 Step ${this.currentStep}/${this.maxSteps}`);
        connectionManager.broadcast({
          type: 'status_update',
          message: `🔄 Step ${this.currentStep}/${this.maxSteps}: Analyzing page...`
        });

        if (this.cancelled) {
          finalResult = {
            success: false,
            response: '🛑 Task cancelled by user',
            message: 'Task cancelled',
            steps: this.currentStep
          };
          break;
        }

        // 1. Get current state using Wootz API
        const currentState = await this.getCurrentState();
        
        // 2. Planner Agent
        connectionManager.broadcast({
          type: 'status_update',
          message: `🧠 Planning: Analyzing ${currentState.pageInfo?.domain || 'page'}...`
        });

        const plan = await this.planner.plan(userTask, currentState, this.executionHistory);
        console.log(`Step ${this.currentStep} Plan:`, plan);

        if (plan.done) {
          taskCompleted = true;
          finalResult = {
            success: true,
            response: plan.observation,
            message: 'Task completed during planning',
            steps: this.currentStep
          };
          break;
        }

        // 3. Navigator Agent
        connectionManager.broadcast({
          type: 'status_update',
          message: `🧭 Executing: ${plan.next_action}...`
        });

        const navigation = await this.navigator.navigate(plan, currentState);
        console.log(`Step ${this.currentStep} Navigation:`, navigation);

        // 4. Action Execution
        if (navigation.action) {
          connectionManager.broadcast({
            type: 'status_update',
            message: `⚡ ${navigation.action.parameters?.intent || 'Performing action'}...`
          });

          const actionResult = await this.executeAction(navigation.action, connectionManager);
          
          this.executionHistory.push({
            step: this.currentStep,
            plan: plan.next_action,
            navigation: navigation.action.parameters?.intent,
            results: [actionResult],
            success: actionResult.success
          });

          // Check if done
          if (actionResult.result?.isDone) {
            taskCompleted = true;
            
            connectionManager.broadcast({
              type: 'status_update',
              message: `✅ Validating completion...`
            });

            const finalState = await this.getCurrentState();
            const validation = await this.validator.validate(userTask, this.executionHistory, finalState);

            finalResult = {
              success: validation.is_valid,
              response: validation.reason,
              message: validation.reason,
              steps: this.currentStep,
              confidence: validation.confidence
            };
            break;
          }
        }

        await this.delay(2000);
      }

      if (this.cancelled) {
        connectionManager.broadcast({
          type: 'task_cancelled',
          result: finalResult
        });
      } else if (!taskCompleted) {
        finalResult = {
          success: false,
          response: `❌ Task not completed within ${this.maxSteps} steps.`,
          message: 'Task execution timeout',
          steps: this.currentStep
        };
        
        connectionManager.broadcast({
          type: 'task_complete',
          result: finalResult
        });
      } else {
        connectionManager.broadcast({
          type: 'task_complete',
          result: finalResult
        });
      }

      return finalResult;

    } catch (error) {
      console.error('❌ Universal multi-agent execution error:', error);
      const errorResult = {
        success: false,
        response: `❌ Execution error: ${error.message}`,
        message: error.message,
        steps: this.currentStep
      };

      connectionManager.broadcast({
        type: 'task_error',
        result: errorResult
      });

      return errorResult;
    }
  }

  async getCurrentState() {
    try {
      console.log('📊 Getting page state via Wootz API');
      
      return new Promise((resolve) => {
        chrome.wootz.getPageState({
          debugMode: true,
          includeHidden: true
        }, (result) => {
          if (result.success && result.pageState) {
            const pageState = result.pageState;
            
            // Add debugging to see the actual structure
            console.log('🔍 Raw Wootz pageState:', pageState);
            console.log('🔍 Raw elements array:', pageState.elements);
            
            const processedState = {
              pageInfo: {
                url: pageState.url || 'unknown',
                title: pageState.title || 'Unknown Page',
                domain: this.extractDomain(pageState.url)
              },
              pageContext: { 
                platform: this.detectPlatform(pageState.url),
                pageType: this.determinePageType(pageState.url)
              },
              loginStatus: { 
                isLoggedIn: this.checkBasicLoginStatus(pageState.url)
              },
              interactiveElements: this.processElementsFromWootz(pageState.elements || []),
              viewportInfo: {},
              extractedContent: `Wootz page state: ${pageState.elements?.length || 0} elements`
            };
            
            console.log(`📊 Wootz State: Found ${processedState.interactiveElements.length} interactive elements`);
            resolve(processedState);
          } else {
            console.log('📊 Wootz State: Failed, using fallback');
            console.log('🔍 Failed result:', result);
            resolve(this.getDefaultState());
          }
        });
      });
      
    } catch (error) {
      console.log('Could not get Wootz page state:', error);
      return this.getDefaultState();
    }
  }

  extractDomain(url) {
    if (!url || typeof url !== 'string') return 'unknown';
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  // Fixed element processing for Wootz API
  processElementsFromWootz(elements) {
    if (!elements || !Array.isArray(elements)) {
      console.log('🔍 Elements not array or null:', elements);
      return [];
    }
    
    console.log(`🔍 Processing ${elements.length} raw elements from Wootz`);
    
    // Remove the isInteractive filter since Wootz API only returns interactive elements
    const processed = elements
      .filter(el => el && el.index !== undefined) // Only filter out null/undefined elements
      .map((el, arrayIndex) => {
        const processed = {
          index: el.index !== undefined ? el.index : arrayIndex,
          arrayIndex: arrayIndex,
          tagName: el.tagName || 'UNKNOWN',
          text: el.textContent || el.text || el.innerText || '',
          ariaLabel: el.ariaLabel || el.label || '',
          elementType: this.categorizeElementType(el),
          isLoginElement: this.isLoginRelatedElement(el),
          isPostElement: this.isPostRelatedElement(el),
          isVisible: el.isVisible !== false,
          bounds: el.bounds || el.rect || {},
          selector: el.selector || this.generateSimpleSelector(el),
          originalElement: el
        };
        
        // Debug log first few elements
        if (arrayIndex < 3) {
          console.log(`🔍 Processed element ${arrayIndex}:`, processed);
        }
        
        return processed;
      })
      .slice(0, 30);
    
    console.log(`📊 Processed ${processed.length} elements successfully`);
    return processed;
  }

  categorizeElementType(element) {
    const tagName = (element.tagName || '').toLowerCase();
    const type = (element.type || '').toLowerCase();
    
    if (tagName === 'button') return 'button';
    if (tagName === 'input') return type || 'input';
    if (tagName === 'textarea') return 'textarea';
    if (tagName === 'a') return 'link';
    if (element.contentEditable === 'true') return 'contenteditable';
    return 'other';
  }

  isLoginRelatedElement(element) {
    const text = ((element.textContent || element.text || '') + ' ' + (element.ariaLabel || '')).toLowerCase();
    const loginKeywords = ['login', 'sign in', 'email', 'password', 'username'];
    return loginKeywords.some(keyword => text.includes(keyword));
  }

  isPostRelatedElement(element) {
    const text = ((element.textContent || element.text || '') + ' ' + (element.ariaLabel || '')).toLowerCase();
    const postKeywords = ['tweet', 'post', 'share', 'publish', 'compose'];
    return postKeywords.some(keyword => text.includes(keyword));
  }

  generateSimpleSelector(element) {
    if (element.attributes) {
      if (element.attributes.id) return `#${element.attributes.id}`;
      if (element.attributes['data-testid']) return `[data-testid="${element.attributes['data-testid']}"]`;
    }
    return (element.tagName || 'div').toLowerCase();
  }

  getDefaultState() {
    return {
      pageInfo: { 
        url: 'unknown', 
        title: 'Unknown Page',
        domain: 'unknown'
      },
      pageContext: { 
        platform: 'unknown', 
        pageType: 'unknown' 
      },
      loginStatus: { 
        isLoggedIn: false 
      },
      interactiveElements: [],
      viewportInfo: {},
      extractedContent: 'No content available'
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeAction(action, connectionManager) {
    try {
      connectionManager.broadcast({
        type: 'status_update',
        message: `🎯 ${action.parameters?.intent || `Executing ${action.name}`}...`
      });
      
      if (this.cancelled) {
        console.log('🛑 Action cancelled');
        return { success: false, error: 'Action cancelled' };
      }
      
      const result = await this.actionRegistry.executeAction(action.name, action.parameters);
      
      console.log(`${result.success ? '✅' : '❌'} ${action.name}: ${result.extractedContent?.substring(0, 50)}...`);
      
      if (action.name === 'navigate' && result.success) {
        await this.delay(4000); // Wait for page load
      } else {
        await this.delay(1000); // Standard delay between actions
      }
      
      return {
        action: action.name,
        input: action.parameters,
        result: result,
        success: result.success !== false
      };
      
    } catch (error) {
      console.error(`❌ Action error: ${action.name}`, error);
      return {
        action: action.name,
        input: action.parameters,
        result: { success: false, error: error.message },
        success: false
      };
    }
  }

  cancel() {
    console.log('🛑 Cancelling universal multi-agent execution');
    this.cancelled = true;
  }
}

// Enhanced LLM Service (keeping existing implementation)
class RobustMultiLLM {
  constructor(config = {}) {
    this.config = config;
    console.log('🤖 Universal LLM Service initialized with provider:', this.config.aiProvider || 'anthropic');
  }

  getModelName(provider, agentType = 'navigator') {
    const configuredModel = agentType === 'navigator' ? this.config.navigatorModel : 
                           agentType === 'planner' ? this.config.plannerModel :
                           agentType === 'validator' ? this.config.validatorModel : null;

    if (configuredModel && this.isModelValidForProvider(configuredModel, provider)) {
      return configuredModel;
    }

    const defaultModels = {
      'anthropic': {
        'navigator': 'claude-3-5-sonnet-20241022',
        'planner': 'claude-3-5-sonnet-20241022',
        'validator': 'claude-3-haiku-20240307'
      },
      'openai': {
        'navigator': 'gpt-4o',
        'planner': 'gpt-4o',
        'validator': 'gpt-4o-mini'
      },
      'gemini': {
        'navigator': 'gemini-1.5-pro',
        'planner': 'gemini-1.5-pro',
        'validator': 'gemini-1.5-flash'
      }
    };
    
    return defaultModels[provider]?.[agentType] || defaultModels[provider]?.['navigator'] || 'gemini-1.5-pro';
  }

  isModelValidForProvider(model, provider) {
    const modelProviderMap = {
      'claude-3-5-sonnet-20241022': 'anthropic',
      'claude-3-sonnet-20240229': 'anthropic', 
      'claude-3-haiku-20240307': 'anthropic',
      'claude-3-opus-20240229': 'anthropic',
      'gpt-4o': 'openai',
      'gpt-4o-mini': 'openai',
      'gpt-4-turbo': 'openai',
      'gpt-4': 'openai',
      'gpt-3.5-turbo': 'openai',
      'gemini-1.5-pro': 'gemini',
      'gemini-1.5-flash': 'gemini',
      'gemini-pro': 'gemini'
    };
    
    return modelProviderMap[model] === provider;
  }

  async call(messages, options = {}, agentType = 'navigator') {
    const provider = this.config.aiProvider || 'anthropic';
    const modelName = this.getModelName(provider, agentType);
    
    console.log(`🎯 DEBUG: Provider=${provider}, AgentType=${agentType}, ModelName=${modelName}`);
    
    console.log(`🤖 ${agentType} using ${provider} model: ${modelName}`);
    
    const hasApiKey = this.checkApiKey(provider);
    if (!hasApiKey) {
      throw new Error(`${provider} API key not configured. Please add your API key in settings.`);
    }
    
    try {
      return await this.callProvider(provider, messages, { ...options, model: modelName });
    } catch (error) {
      console.error(`❌ ${provider} failed:`, error);
      throw error;
    }
  }

  checkApiKey(provider) {
    switch (provider) {
      case 'anthropic':
        return !!this.config.anthropicApiKey;
      case 'openai':
        return !!this.config.openaiApiKey;
      case 'gemini':
        return !!this.config.geminiApiKey;
      default:
        return false;
    }
  }

  async callProvider(provider, messages, options) {
    switch (provider) {
      case 'anthropic':
        return await this.callAnthropic(messages, options);
      case 'openai':
        return await this.callOpenAI(messages, options);
      case 'gemini':
        return await this.callGemini(messages, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async callAnthropic(messages, options = {}) {
    if (!this.config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const model = options.model || 'claude-3-5-sonnet-20241022';
    console.log(`🔥 Calling Anthropic with model: ${model}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.3,
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

    const model = options.model || 'gpt-4o';
    console.log(`🔥 Calling OpenAI with model: ${model}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callGemini(messages, options = {}) {
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || 'gemini-1.5-pro';
    console.log(`🔥 Calling Gemini with model: ${model}`);

    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const requestBody = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.3
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.geminiApiKey}`, 
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }
}

// Persistent Connection Manager (keeping existing)
class PersistentConnectionManager {
  constructor(backgroundTaskManager) {
    this.connections = new Map();
    this.messageQueue = [];
    this.backgroundTaskManager = backgroundTaskManager;
    this.activeTask = null;
  }

  addConnection(connectionId, port) {
    console.log(`🔗 Adding connection: ${connectionId}`);
    
    this.connections.set(connectionId, {
      port: port,
      connected: true,
      lastActivity: Date.now()
    });

    if (this.messageQueue.length > 0) {
      console.log(`📤 Sending ${this.messageQueue.length} queued messages`);
      this.messageQueue.forEach(message => {
        this.safePortMessage(port, message);
      });
      this.messageQueue = [];
    }

    if (this.activeTask) {
      const recentMessages = this.backgroundTaskManager.getRecentMessages(this.activeTask, 3);
      recentMessages.forEach(message => {
        this.safePortMessage(port, message);
      });
    }
  }

  removeConnection(connectionId) {
    console.log(`🔌 Removing connection: ${connectionId}`);
    this.connections.delete(connectionId);
  }

  broadcast(message) {
    let messageSent = false;
    
    this.connections.forEach((connection, connectionId) => {
      if (connection.connected && this.safePortMessage(connection.port, message)) {
        messageSent = true;
      }
    });

    this.messageQueue.unshift(message);
    if (this.messageQueue.length > 20) {
      this.messageQueue.pop();
    }

    if (!messageSent) {
      console.log('📦 Queued for background persistence:', message.type);
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

  setActiveTask(taskId) {
    this.activeTask = taskId;
  }

  getActiveTask() {
    return this.activeTask;
  }
}

// Main Background Script Agent (keeping most existing functionality)
class BackgroundScriptAgent {
  constructor() {
    this.backgroundTaskManager = new BackgroundTaskManager();
    this.connectionManager = new PersistentConnectionManager(this.backgroundTaskManager);
    this.activeTasks = new Map();
    this.llmService = null;
    this.multiAgentExecutor = null;
    this.taskRouter = null;
    
    this.setupMessageHandlers();
    console.log('✅ Universal BackgroundScriptAgent initialized with Wootz API integration');
  }

  setupMessageHandlers() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup-connection') {
        const connectionId = Date.now().toString();
        console.log('Background script connected:', connectionId);
        
        this.connectionManager.addConnection(connectionId, port);
        
        port.onMessage.addListener(async (message) => {
          try {
            await this.handlePortMessage(message, port, connectionId);
          } catch (error) {
            console.error('Message handling error:', error);
            this.connectionManager.safePortMessage(port, {
              type: 'error',
              error: error.message
            });
          }
        });

        port.onDisconnect.addListener(() => {
          console.log('Background script disconnected:', connectionId);
          this.connectionManager.removeConnection(connectionId);
        });

        setTimeout(() => {
          this.connectionManager.safePortMessage(port, {
            type: 'connected',
            connectionId: connectionId,
            activeTask: this.connectionManager.getActiveTask()
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
    console.log('Handling:', type, 'from:', connectionId);

    switch (type) {
      case 'new_task':
        const taskId = Date.now().toString();
        this.activeTasks.set(taskId, { 
          task: message.task, 
          connectionId: connectionId,
          startTime: Date.now()
        });
        
        this.connectionManager.setActiveTask(taskId);
        await this.executeTaskWithBackgroundManager(message.task, taskId);
        break;

      case 'cancel_task':
        console.log('🛑 Received cancel_task request');
        const activeTaskId = this.connectionManager.getActiveTask();
        if (activeTaskId) {
          const cancelled = this.backgroundTaskManager.cancelTask(activeTaskId);
          this.activeTasks.delete(activeTaskId);
          this.connectionManager.setActiveTask(null);
          
          this.connectionManager.broadcast({
            type: 'task_cancelled',
            message: 'Task cancelled by user',
            cancelled: cancelled
          });
          
          console.log(`✅ Task ${activeTaskId} cancelled: ${cancelled}`);
        } else {
          console.log('⚠️ No active task to cancel');
        }
        break;

      case 'get_status':
        const status = await this.getAgentStatus();
        this.connectionManager.safePortMessage(port, {
          type: 'status_response',
          status: status
        });
        break;

      default:
        this.connectionManager.safePortMessage(port, {
          type: 'error',
          error: `Unknown message type: ${type}`
        });
    }
  }

  async executeTaskWithBackgroundManager(task, taskId) {
    try {
      console.log('🚀 Executing universal task with BackgroundTaskManager:', task, 'ID:', taskId);
      
      if (!this.llmService) {
        const config = await this.getConfig();
        this.llmService = new RobustMultiLLM(config);
        this.multiAgentExecutor = new UniversalMultiAgentExecutor(this.llmService);
        this.taskRouter = new AITaskRouter(this.llmService);
      }

      const classification = await this.taskRouter.analyzeAndRoute(task);
      
      if (classification.intent === 'CHAT') {
        const result = await this.handleSimpleChat(task);
        this.connectionManager.broadcast({
          type: 'task_complete',
          result: result,
          taskId: taskId
        });
        this.activeTasks.delete(taskId);
        return;
      }

      await this.backgroundTaskManager.startTask(
        taskId, 
        { task }, 
        this.multiAgentExecutor, 
        this.connectionManager
      );
      
    } catch (error) {
      console.error('Background task execution error:', error);
      
      this.connectionManager.broadcast({
        type: 'task_error',
        error: error.message,
        taskId: taskId
      });
      
      this.activeTasks.delete(taskId);
      this.connectionManager.setActiveTask(null);
    }
  }

  async handleSimpleChat(task) {
    try {
      const response = await this.llmService.call([
        { 
          role: 'user', 
          content: `You are a helpful AI assistant specializing in universal web automation. Respond to: "${task}"` 
        }
      ], { maxTokens: 300 });

      return {
        success: true,
        response: response,
        message: response
      };
    } catch (error) {
      return {
        success: true,
        response: `I understand you said: "${task}"\n\nI'm your universal AI web automation assistant! I can help with any website - YouTube, social media, shopping, research, and more. What would you like me to help you with?`,
        message: 'Fallback chat response'
      };
    }
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
      backgroundTasks: this.backgroundTaskManager.getAllRunningTasks().length,
      completedTasks: this.backgroundTaskManager.getAllCompletedTasks().length,
      activeTask: this.connectionManager.getActiveTask(),
      connections: this.connectionManager.connections.size,
      backgroundPersistence: true,
      multiAgentSystem: true,
      universalAutomation: true,
      wootzApiIntegration: true,
      supportedSites: 'Universal - any website',
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
      this.multiAgentExecutor = new UniversalMultiAgentExecutor(this.llmService);
      return { success: true, message: 'Configuration updated' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// AI Task Router (keeping existing implementation)
class AITaskRouter {
  constructor(llmService) {
    this.llmService = llmService;
  }

  async analyzeAndRoute(userMessage, currentContext = {}) {
    try {
      const classificationPrompt = `You are an intelligent intent classifier.

Analyze: "${userMessage}"

Respond with JSON only:
{
  "intent": "CHAT|WEB_AUTOMATION",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Rules:
- CHAT: Greetings, questions, explanations ("hello", "what is", "how are you")
- WEB_AUTOMATION: Any task involving websites ("open", "search", "click", "navigate", "post", "buy", etc.)`;

      const response = await this.llmService.call([
        { role: 'user', content: classificationPrompt }
      ], { maxTokens: 150 });

      const classification = this.parseJSONResponse(response);
      return classification.intent ? classification : this.fallbackRouting(userMessage);

    } catch (error) {
      console.error('AI classification failed:', error);
      return this.fallbackRouting(userMessage);
    }
  }

  parseJSONResponse(response) {
    try {
      let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch (error) {
      return {};
    }
  }

  fallbackRouting(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    const webKeywords = ['open', 'go to', 'navigate', 'search', 'click', 'type', 'post', 'buy', 'find', 'visit'];
    const chatKeywords = ['hello', 'hi', 'what', 'how', 'why', 'explain'];
    
    const hasWebKeywords = webKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasChatKeywords = chatKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasWebKeywords) {
      return {
        intent: 'WEB_AUTOMATION',
        confidence: 0.7,
        reasoning: 'Contains web automation keywords'
      };
    } else if (hasChatKeywords) {
      return {
        intent: 'CHAT',
        confidence: 0.8,
        reasoning: 'Contains conversational keywords'
      };
    }
    
    return {
      intent: 'CHAT',
      confidence: 0.5,
      reasoning: 'Default classification'
    };
  }
}

// Initialize
const backgroundScriptAgent = new BackgroundScriptAgent();
console.log('🚀 Universal AI Web Agent Background Script Initialized with Wootz APIs');

// Chrome Alarms for Android background persistence
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    console.log('🔄 Android background keep-alive');
    if (backgroundScriptAgent?.backgroundTaskManager) {
      const runningTasks = backgroundScriptAgent.backgroundTaskManager.getAllRunningTasks();
      console.log(`📊 Background status: ${runningTasks.length} tasks running`);
    }
  }
});

chrome.alarms.create('keep-alive', { 
  delayInMinutes: 0.5, 
  periodInMinutes: 1 
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Universal extension startup');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('⚡ Universal extension installed/updated');
});