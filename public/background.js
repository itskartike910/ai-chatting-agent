/* global chrome */
import { PlannerAgent } from './agents/PlannerAgent.js';
import { NavigatorAgent } from './agents/NavigatorAgent.js';
import { ValidatorAgent } from './agents/ValidatorAgent.js';
import { AITaskRouter } from './agents/AITaskRouter.js';

console.log('AI Universal Agent Background Script Loading...');
const API_BASE_URL = "https://gemini-api-112339282815.us-central1.run.app";

class ProceduralMemoryManager {
  constructor() {
    this.messages = [];
    this.proceduralSummaries = [];
    this.maxMessages = 50;  
    this.maxSummaries = 10;     
    this.stepCounter = 0;
    this.taskHistory = [];     
    this.currentTaskState = null; 
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
    const recentMessages = this.messages.slice(-5);
    const summary = {
      steps: `${Math.max(0, this.stepCounter - 5)}-${this.stepCounter}`,
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
      recentMessages: this.messages.slice(-10).map(m => ({
        ...m,
        content: this.ensureString(m.content)
      })),
      proceduralSummaries: this.proceduralSummaries.slice(-10),
      currentStep: this.stepCounter
    };
  }

  // Enhanced context compressor with increased limits
  compressForPrompt(maxTokens = 4000) {
    const ctx = this.getContext();
    const json = JSON.stringify(ctx);
    if (json.length > maxTokens * 4 && ctx.proceduralSummaries.length) {
      ctx.proceduralSummaries.shift();
    }
    while (JSON.stringify(ctx).length > maxTokens * 4 && ctx.recentMessages.length > 10) {
      ctx.recentMessages.shift();
    }
    
    ctx.taskState = this.currentTaskState;
    ctx.taskHistory = this.taskHistory.slice(-5); 
    
    return ctx;
  }

  clear() {
    this.messages = [];
    this.proceduralSummaries = [];
    this.stepCounter = 0;
    this.taskHistory = [];
    this.currentTaskState = null;
  }

  setCurrentTask(task) {
    this.currentTaskState = {
      originalTask: task,
      components: this.decomposeTask(task),
      completedComponents: [],
      startTime: Date.now()
    };
  }

  markComponentCompleted(component, evidence) {
    if (this.currentTaskState) {
      this.currentTaskState.completedComponents.push({
        component: component,
        evidence: evidence,
        timestamp: Date.now(),
        step: this.stepCounter
      });
      this.taskHistory.push({
        component: component,
        evidence: evidence,
        timestamp: Date.now()
      });
    }
  }

  decomposeTask(task) {
    const taskLower = task.toLowerCase();
    const components = [];
    
    // Navigation component
    if (taskLower.includes('go to') || taskLower.includes('open') || taskLower.includes('visit')) {
      components.push('navigate_to_site');
    }
    
    // Search component
    if (taskLower.includes('search') || taskLower.includes('find') || taskLower.includes('look for')) {
      components.push('perform_search');
    }
    
    // Click/interaction component
    if (taskLower.includes('click') || taskLower.includes('select') || taskLower.includes('choose')) {
      components.push('interact_with_element');
    }
    
    // Data extraction component
    if (taskLower.includes('get') || taskLower.includes('extract') || taskLower.includes('show')) {
      components.push('extract_information');
    }
    
    // Social media components
    if (taskLower.includes('post') || taskLower.includes('tweet') || taskLower.includes('share')) {
      components.push('create_post');
    }
    
    // Shopping components
    if (taskLower.includes('buy') || taskLower.includes('purchase') || taskLower.includes('cart')) {
      components.push('shopping_action');
    }
    
    return components.length > 0 ? components : ['complete_task'];
  }
}

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
              
              // Clear execution state from storage when task completes
              chrome.storage.local.set({
                isExecuting: false,
                activeTaskId: null,
                taskStartTime: null,
                sessionId: null
              });
              
              console.log(`✅ BackgroundTaskManager completed: ${taskId}`);
            }
            
            if (connectionManager) {
              connectionManager.broadcast(message);
            }
          }
        }
      };

      // Pass the initial plan if available
      await executor.execute(taskData.task, backgroundConnectionManager, taskData.initialPlan);

    } catch (error) {
      console.error(`❌ BackgroundTaskManager error: ${taskId}`, error);
      
      // Clear execution state from storage on error
      chrome.storage.local.set({
        isExecuting: false,
        activeTaskId: null,
        taskStartTime: null,
        sessionId: null
      });
      
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

  getRecentMessages(taskId, limit = 20) {
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
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
        selector: 'string - CSS selector (from page state only)',
        intent: 'string - Description of what you are clicking and why'
      },
      handler: async (input) => {
        try {
          console.log(`🖱️ Universal Click: ${input.intent || 'Click action'}`);
          
          return new Promise((resolve) => {
            const actionParams = {};
            
            if (input.index !== undefined) {
              actionParams.index = input.index;
              console.log(`🎯 Using element index: ${input.index}`);
            } else if (input.selector) {
              actionParams.selector = input.selector;
              console.log(`🎯 Using selector: ${input.selector}`);
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
        selector: 'string - CSS selector (from page state only)',
        text: 'string - The text to type into the element',
        intent: 'string - Description of what you are typing and why'
      },
      handler: async (input) => {
        try {
          console.log(`⌨️ Universal Type: "${input.text}" - ${input.intent}`);
          return new Promise((resolve) => {
            const actionParams = { text: input.text };
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

class BrowserContextManager {
  constructor() {
    this.activeTabId = null;
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
}

function urlValidator() {
  // Add null checks to prevent the TypeError
  const originalMethods = {
    checkBasicLoginStatus: function(url) {
      if (!url || typeof url !== 'string') return false;
      return !url.includes('/login') && !url.includes('/signin');
    },
    
    determinePageType: function(url) {
      if (!url || typeof url !== 'string') return 'general';
      
      // Chrome-native pages
      if (url.startsWith('chrome-native://') || url.startsWith('chrome://')) return 'chrome-native';
      
      // Social media page types
      if (url.includes('/compose') || url.includes('/intent/tweet')) return 'compose';
      if (url.includes('/home') || url.includes('/timeline')) return 'home';
      if (url.includes('/login') || url.includes('/signin')) return 'login';
      if (url.includes('/profile') || url.includes('/user/')) return 'profile';
      
      // E-commerce page types
      if (url.includes('/search') || url.includes('/s?')) return 'search';
      if (url.includes('/cart') || url.includes('/basket')) return 'cart';
      if (url.includes('/product/') || url.includes('/dp/')) return 'product';
      if (url.includes('/checkout')) return 'checkout';
      
      return 'general';
    },
    
    detectPlatform: function(url) {
      if (!url || typeof url !== 'string') return 'unknown';
      const lowerUrl = url.toLowerCase();
      
      // E-commerce platforms
      if (lowerUrl.includes('amazon.')) return 'amazon';
      if (lowerUrl.includes('ebay.')) return 'ebay';
      if (lowerUrl.includes('walmart.')) return 'walmart';
      if (lowerUrl.includes('target.')) return 'target';
      if (lowerUrl.includes('bestbuy.')) return 'bestbuy';
      if (lowerUrl.includes('flipkart.')) return 'flipkart';
      if (lowerUrl.includes('snapdeal.')) return 'snapdeal';
      if (lowerUrl.includes('shopclues.')) return 'shopclues';
      if (lowerUrl.includes('shopify.')) return 'shopify';
      if (lowerUrl.includes('bigbasket.')) return 'bigbasket';
      if (lowerUrl.includes('ajio.')) return 'ajio';
      if (lowerUrl.includes('myntra.')) return 'myntra';
      
      // Social media platforms
      if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return 'twitter';
      if (lowerUrl.includes('linkedin.com')) return 'linkedin';
      if (lowerUrl.includes('facebook.com')) return 'facebook';
      if (lowerUrl.includes('instagram.com')) return 'instagram';
      if (lowerUrl.includes('youtube.com')) return 'youtube';
      if (lowerUrl.includes('tiktok.com')) return 'tiktok';
      if (lowerUrl.includes('reddit.com')) return 'reddit';
      if (lowerUrl.includes('pinterest.com')) return 'pinterest';
      if (lowerUrl.includes('quora.com')) return 'quora';
      if (lowerUrl.includes('medium.com')) return 'medium';
      if (lowerUrl.includes('dev.to')) return 'devto';
      if (lowerUrl.includes('hashnode.com')) return 'hashnode';
      
      // Chrome-native pages
      if (lowerUrl.startsWith('chrome-native://') || lowerUrl.startsWith('chrome://')) return 'chrome-native';
      if (lowerUrl.startsWith('chrome-extension://')) return 'chrome-extension';
      
      return 'unknown';
    }
  };
  
  return originalMethods;
}

class MultiAgentExecutor {
  constructor(llmService) {
    this.llmService = llmService;
    this.memoryManager = new ProceduralMemoryManager();
    this.browserContext = new BrowserContextManager();
    this.actionRegistry = new UniversalActionRegistry(this.browserContext);
    
    this.planner = new PlannerAgent(this.llmService, this.memoryManager);
    this.navigator = new NavigatorAgent(this.llmService, this.memoryManager, this.actionRegistry);
    this.validator = new ValidatorAgent(this.llmService, this.memoryManager);
    
    // Fixed helper methods
    const helpers = urlValidator();
    this.checkBasicLoginStatus = helpers.checkBasicLoginStatus;
    this.determinePageType = helpers.determinePageType;
    this.detectPlatform = helpers.detectPlatform;
    
    this.maxSteps = 20; 
    this.executionHistory = [];
    this.currentStep = 0;
    this.cancelled = false;
    
    this.actionQueue = [];
    this.currentBatchPlan = null;
    
    this.failedElements = new Set();
  }

  async execute(userTask, connectionManager, initialPlan = null) {
    this.currentStep = 0;
    this.cancelled = false;
    this.executionHistory = [];
    this.actionQueue = [];
    this.currentBatchPlan = null;
    this.failedElements = new Set();
    this.lastPageState = null;
    this.lastValidationResult = null; 

    console.log(`🚀 Universal Multi-agent execution: ${userTask}`);
    console.log(`🧹 State cleaned - Starting fresh`);
    
    // Store current task for completion detection
    this.currentUserTask = userTask;
    
    // Initialize enhanced task tracking in memory manager
    this.memoryManager.setCurrentTask(userTask);
    
    // Broadcast initial task setup
    connectionManager.broadcast({
      type: 'status_update',
      message: `🎯 Task Started: "${userTask}"`,
      details: `Task components identified: ${this.memoryManager.currentTaskState?.components?.join(', ') || 'analyzing...'}`
    });
    
    let taskCompleted = false;
    let finalResult = null;

    try {
      connectionManager.broadcast({
        type: 'execution_start',
        message: `🚀 Starting task: ${userTask}`
      });

      while (!taskCompleted && this.currentStep < this.maxSteps && !this.cancelled) {
        this.currentStep++;
        
        console.log(`🔄 Step ${this.currentStep}/${this.maxSteps}`);
        connectionManager.broadcast({
          type: 'status_update',
          step: this.currentStep,
          message: `🔄 Step ${this.currentStep}: Planning next actions...`
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

        if (initialPlan && initialPlan.direct_url && this.currentStep === 1) {
          console.log(`🎯 Using direct URL: ${initialPlan.direct_url}`);
          // Use direct_url for navigation as first step
          this.actionQueue = [{
            name: 'navigate',
            parameters: {
              url: initialPlan.direct_url,
              intent: 'Navigate directly to search results page'
            }
          }];
          this.currentBatchPlan = initialPlan;
          
          if (initialPlan && initialPlan.observation) {
            connectionManager.broadcast({
              type: 'status_update',
              message: `🧠 Observation: ${initialPlan.observation}\n📋 Strategy: ${initialPlan.strategy}`,
              details: initialPlan.reasoning || ''
            });
          }
          
          // continue; // Execute this batch immediately
        }

        // 1. Execute batch actions if available
        if (this.actionQueue.length > 0) {
          console.log(`📋 Executing batch: ${this.actionQueue.length} actions`);
          
          const batchResults = await this.executeBatchSequentially(connectionManager);
          
          // Show completed batch as single step in UI
          connectionManager.broadcast({
            type: 'step_complete',
            step: this.currentStep,
            actions: batchResults.executedActions,
            message: `📋 Batch completed: ${batchResults.executedActions.length} actions executed`
          });
          
          // Enhanced validation with progressive checking and smart triggers
          const shouldRunValidation = batchResults.anySuccess && (
            this.currentBatchPlan?.shouldValidate || 
            this.currentStep >= 10 || // Validate every 10 steps to check progress
            this.currentStep % 5 === 0 || // Validate every 5 steps
            this.executionHistory.filter(h => h.success).length >= 3 // Validate after 3 successful actions
          );
          
          if (shouldRunValidation) {
            console.log('🔍 Running progressive validation as requested by planner...');
            const currentState = await this.getCurrentState();
            const validation = await this.validator.validate(userTask, this.executionHistory, currentState);
            
            // Store validation result for use in next planning cycle
            this.lastValidationResult = validation;

            console.log('📊 Validation result:', {
              is_valid: validation.is_valid,
              confidence: validation.confidence,
              progress: validation.progress_percentage,
              completed: validation.completed_components,
              missing: validation.missing_components
            });

            // Mark completed components in memory manager
            if (validation.completed_components && validation.completed_components.length > 0) {
              validation.completed_components.forEach(component => {
                this.memoryManager.markComponentCompleted(component, validation.evidence || 'Validation confirmed completion');
              });
            }

            // Progressive completion criteria (more lenient but accurate)
            if (validation.is_valid && 
                validation.confidence >= 0.85 && 
                validation.progress_percentage >= 90 &&
                validation.answer && 
                validation.answer.trim() !== '' && 
                !validation.answer.includes('incomplete') &&
                validation.missing_components && 
                validation.missing_components.length === 0) {
              
              taskCompleted = true;
              finalResult = {
                success: true,
                response: `✅ ${validation.answer}`,
                reason: validation.reason,
                steps: this.currentStep,
                confidence: validation.confidence,
                progress_percentage: validation.progress_percentage,
                completed_components: validation.completed_components
              };
              
              // Broadcast task completion observation
              connectionManager.broadcast({
                type: 'status_update',
                message: `🎯 Task Completed (${validation.progress_percentage}%): ${validation.answer}`,
                details: `${validation.reason} | Completed: ${validation.completed_components?.join(', ') || 'all components'}`
              });
              break;
            } else {
              // Provide detailed progress feedback
              const progressMsg = `🔄 Task Progress: ${validation.progress_percentage || 0}% complete`;
              const componentMsg = validation.completed_components?.length > 0 
                ? ` | Completed: ${validation.completed_components.join(', ')}`
                : '';
              const nextMsg = validation.next_required_action 
                ? ` | Next: ${validation.next_required_action}`
                : '';
              
              console.log(`${progressMsg}${componentMsg}${nextMsg}`);
              
              connectionManager.broadcast({
                type: 'status_update',
                message: `${progressMsg}${componentMsg}`,
                details: validation.reason || 'Continuing task execution...'
              });
            }
          } else if (batchResults.anySuccess) {
            console.log('📋 Batch completed successfully, continuing without validation...');
          }

          // If not complete, call PlannerAgent for next batch
          if (!taskCompleted) {
            const currentState = await this.getCurrentState();
            const enhancedContext = this.buildEnhancedContextWithHistory();
            
            // Add validation results to context for planner
            if (this.lastValidationResult) {
              enhancedContext.lastValidation = {
                progress_percentage: this.lastValidationResult.progress_percentage || 0,
                completed_components: this.lastValidationResult.completed_components || [],
                missing_components: this.lastValidationResult.missing_components || [],
                next_required_action: this.lastValidationResult.next_required_action || '',
                confidence: this.lastValidationResult.confidence || 0
              };
            }
            
            const plan = await this.planner.plan(userTask, currentState, this.executionHistory, 
              enhancedContext, this.failedElements);
            
            // Broadcast planner's observation and strategy
            if (plan && plan.observation) {
              connectionManager.broadcast({
                type: 'status_update',
                message: `🧠 Observation: ${plan.observation}\n📋 Strategy: ${plan.strategy}`,
                details: plan.reasoning || ''
              });
            }
            
            if (plan.done) {
              taskCompleted = true;
              finalResult = {
                success: true,
                response: `✅ ${plan.completion_criteria || plan.reasoning}`,
                steps: this.currentStep
              };
              break;
            }
            
            this.actionQueue = this.validateAndPreprocessBatchActions(plan.batch_actions || []);
            this.currentBatchPlan = plan; 
          }

          // Handle critical failures (no recovery needed for now)
          if (batchResults.criticalFailure) {
            connectionManager.broadcast({
              type: 'status_update',
              message: '⚠️ Multiple action failures detected. Attempting navigator recovery...',
              details: 'Trying alternative approach'
            });
            
            const currentState = await this.getCurrentState();
            const recoveryAction = await this.navigator.navigate(this.currentBatchPlan, currentState);
            
            if (recoveryAction && recoveryAction.action) {
              this.actionQueue = [recoveryAction.action];
            } else {
              // If navigator can't recover, replan
              const plan = await this.planner.plan(userTask, currentState, this.executionHistory, 
              this.buildEnhancedContextWithHistory(), this.failedElements);
              this.actionQueue = this.validateAndPreprocessBatchActions(plan.batch_actions || []);
              this.currentBatchPlan = plan;
            }
          }

          continue;
        }

        // 2. Get page state only when planning
        const currentState = await this.getCurrentState();
        
        // 3. Enhanced context building
        const enhancedContext = this.buildEnhancedContextWithHistory();
        
        // 4. Generate new plan with full context
        let plan;
        if (initialPlan && this.currentStep === 1) {
          plan = initialPlan;
        } else {
          // Add any recent validation results to context for better planning
          if (this.lastValidationResult) {
            enhancedContext.lastValidation = {
              progress_percentage: this.lastValidationResult.progress_percentage || 0,
              completed_components: this.lastValidationResult.completed_components || [],
              missing_components: this.lastValidationResult.missing_components || [],
              next_required_action: this.lastValidationResult.next_required_action || '',
              confidence: this.lastValidationResult.confidence || 0
            };
          }
          
          plan = await this.planner.plan(userTask, currentState, this.executionHistory, enhancedContext, this.failedElements);
        }

        if (plan && plan.observation) {
          connectionManager.broadcast({
            type: 'status_update',
            message: `🧠 Observation: ${plan.observation}\n📋 Strategy: ${plan.strategy}`,
            details: plan.reasoning || ''
          });
        }

        // 5. Check if AI says task is complete
        if (plan.isCompleted || plan.done) {
          taskCompleted = true;
          finalResult = {
            success: true,
            response: `✅ ${plan.completion_criteria || plan.reasoning}`,
            steps: this.currentStep
          };
          break;
        }

        // 6. Queue batch actions
        if (plan.batch_actions && Array.isArray(plan.batch_actions)) {
          this.actionQueue = this.validateAndPreprocessBatchActions(plan.batch_actions);
          this.currentBatchPlan = plan;
          
          // Show plan to user as single step
          connectionManager.broadcast({
            type: 'plan_display',
            step: this.currentStep,
            strategy: plan.strategy,
            plannedActions: plan.batch_actions.map(a => ({
              type: a.action_type,
              intent: a.parameters?.intent || `${a.action_type} action`
            }))
          });
        } else {
          console.log('⚠️ No valid batch actions received from planner');
          break;
        }

        await this.delay(1000);
      }

      // Enhanced final validation with progressive assessment
      if (!taskCompleted && this.currentStep >= this.maxSteps) {
        console.log('🔍 Max steps reached - running enhanced final validation');
        const finalState = await this.getCurrentState();
        const validation = await this.validator.validate(userTask, this.executionHistory, finalState);
        
        console.log('📊 Final validation result:', {
          is_valid: validation.is_valid,
          confidence: validation.confidence,
          progress: validation.progress_percentage,
          completed: validation.completed_components,
          missing: validation.missing_components
        });
        
        // More lenient final validation - accept partial completion if substantial progress
        if (validation.is_valid && 
            validation.confidence >= 0.8 && 
            validation.progress_percentage >= 80 &&
            validation.answer && 
            validation.answer.trim() !== '') {
          finalResult = {
            success: true,
            response: `✅ ${validation.answer}`,
            reason: validation.reason,
            steps: this.currentStep,
            confidence: validation.confidence,
            progress_percentage: validation.progress_percentage,
            completed_components: validation.completed_components
          };
        } else if (validation.progress_percentage >= 50) {
          // Partial success for significant progress
          finalResult = {
            success: false,
            response: `🔄 Task partially completed (${validation.progress_percentage}%) after ${this.currentStep} steps. ${validation.reason || 'Maximum steps reached'}`,
            reason: validation.reason || 'Task could not be completed within step limit',
            steps: this.currentStep,
            confidence: validation.confidence || 0.3,
            progress_percentage: validation.progress_percentage,
            completed_components: validation.completed_components || []
          };
        } else {
          // Minimal progress - task incomplete
          finalResult = {
            success: false,
            response: `❌ Task incomplete after ${this.currentStep} steps. Progress: ${validation.progress_percentage || 0}%. ${validation.reason || 'Maximum steps reached with insufficient progress'}`,
            reason: validation.reason || 'Task could not be completed within step limit',
            steps: this.currentStep,
            confidence: validation.confidence || 0.2,
            progress_percentage: validation.progress_percentage || 0,
            completed_components: validation.completed_components || [],
            next_required_action: validation.next_required_action || 'Task needs to be restarted or refined'
          };
        }
      }

      if (!finalResult) {
        finalResult = {
          success: false,
          response: `⚠️ Task incomplete after ${this.currentStep} steps. No final result was set.`,
          reason: 'Task execution completed without a definitive result',
          steps: this.currentStep,
          confidence: 0.2
        };
      }

      // Broadcast final result
      if (finalResult.success) {
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
      
      // Use enhanced error formatting for better user experience
      const userFriendlyError = this.formatErrorForUser(error);
      
      const errorResult = {
        success: false,
        response: userFriendlyError,
        reason: 'System error during task execution',
        message: error.message,
        steps: this.currentStep || 0,
        confidence: 0.1,
        originalError: error.message
      };

      connectionManager.broadcast({
        type: 'task_error',
        result: errorResult,
        error: userFriendlyError,
        originalError: error.message
      });

      return errorResult;
    }
  }

  // Enhanced batch execution with immediate cancellation and robust null handling
  async executeBatchSequentially(connectionManager) {
    const results = {
      executedActions: [],
      anySuccess: false,
      criticalFailure: false
    };
    
    console.log(`🚀 Executing ${this.actionQueue.length} actions in batch`);
    
    for (let i = 0; i < this.actionQueue.length; i++) {
      // Immediate Cancellation During Batch Execution
      if (this.cancelled) {
        console.log('🛑 Task cancelled during batch execution');
        results.criticalFailure = true;
        break;
      }
      
      const action = this.actionQueue[i];
      
      console.log(`🎯 Executing action ${i + 1}/${this.actionQueue.length}: ${action.name}`);
      
      try {
        const actionResult = await this.executeAction(action, connectionManager);
        
        if (!actionResult) {
          results.executedActions.push({
            action: action.name,
            success: false,
            intent: action.parameters?.intent || action.name,
            error: 'Action was skipped or returned null'
          });
          continue;
        }
        
        results.executedActions.push({
          action: action.name,
          success: actionResult.success,
          intent: action.parameters?.intent || action.name,
          result: actionResult
        });
        
        if (actionResult.success) {
          results.anySuccess = true;
        }
        
        // Add to memory and history
        this.memoryManager.addMessage({
          role: 'step_executor',
          action: action.name,
          content: `Step ${this.currentStep}: Executed ${action.name} - ${actionResult.success ? 'SUCCESS' : 'FAILED'}`,
          step: this.currentStep,
          timestamp: new Date().toISOString()
        });
        
        this.executionHistory.push({
          step: this.currentStep,
          plan: `Batch action: ${action.name}`,
          navigation: action.parameters?.intent,
          results: [actionResult],
          success: actionResult.success,
          action: action.name
        });
        
        if (action.name === 'click' && action.parameters?.index !== undefined) {
          const elementIndex = action.parameters.index;
          
          // Mark element as failed if action failed
          if (!actionResult.success) {
            this.failedElements.add(elementIndex);
            console.log(`🚫 Marking element ${elementIndex} as failed due to click failure`);
          }
        }
        
        // Check for page state change after each action
        let currentState = await this.getCurrentState();
        
        // If page has 0 elements after navigation/click, wait for it to load
        if ((action.name === 'navigate' || action.name === 'click') && 
            (currentState.interactiveElements?.length || 0) === 0) {
          console.log(`🔄 Page loading after ${action.name} - waiting for page to fully load...`);
          await this.delay(3000);
          currentState = await this.getCurrentState();
          console.log(`📊 After wait - Found ${currentState.interactiveElements?.length || 0} elements`);
          
          // If still 0 elements after wait, try one more time with longer delay
          if ((currentState.interactiveElements?.length || 0) === 0) {
            console.log(`🔄 Still loading - waiting additional 2 seconds...`);
            await this.delay(2000);
            currentState = await this.getCurrentState();
            console.log(`📊 Final attempt - Found ${currentState.interactiveElements?.length || 0} elements`);
          }
        }
        
        const urlChanged = currentState.pageInfo?.url !== this.lastPageState?.pageInfo?.url;
        const elementCountChanged = Math.abs((currentState.interactiveElements?.length || 0) - 
                                           (this.lastPageState?.interactiveElements?.length || 0)) > 5;
        const titleChanged = currentState.pageInfo?.title !== this.lastPageState?.pageInfo?.title;
        
        // NEW: Detect modal/dropdown openings by checking for new element types
        const hasNewModals = (currentState.interactiveElements || []).some(el => 
          el.attributes?.class?.includes('modal') || 
          el.attributes?.class?.includes('dropdown') ||
          el.attributes?.class?.includes('menu') ||
          el.attributes?.role === 'dialog' ||
          el.attributes?.role === 'menu'
        );

        const previousModals = (this.lastPageState?.interactiveElements || []).some(el => 
          el.attributes?.class?.includes('modal') || 
          el.attributes?.class?.includes('dropdown') ||
          el.attributes?.class?.includes('menu') ||
          el.attributes?.role === 'dialog' ||
          el.attributes?.role === 'menu'
        );

        const modalStateChanged = hasNewModals !== previousModals;

        const pageChanged = urlChanged || elementCountChanged || titleChanged || modalStateChanged;
        
        if (action.name === 'click' && action.parameters?.index !== undefined && 
            actionResult.success && !pageChanged) {
          const elementIndex = action.parameters.index;
          this.failedElements.add(elementIndex);
          console.log(`⚠️ Element ${elementIndex} clicked successfully but no significant page change - marking as potentially ineffective`);
        }
        
        if (pageChanged) {
          console.log('🔄 Page state changed - triggering replanning');
          this.actionQueue = [];
          break;
        }
        
        // If batch only contains navigation/wait, force replan after execution
        if (this.actionQueue.every(a => ['navigate', 'wait'].includes(a.name))) {
          console.log('🔄 Only navigation/wait actions in batch - forcing replan');
          this.actionQueue = [];
          break;
        }
        
        // Small delay between actions
        await this.delay(500);
        
      } catch (error) {
        console.error(`❌ Action execution error:`, error);
        
        if (action.name === 'click' && action.parameters?.index !== undefined) {
          this.failedElements.add(action.parameters.index);
          console.log(`🚫 Marking element ${action.parameters.index} as failed due to execution error`);
        }
        
        results.executedActions.push({
          action: action.name,
          success: false,
          intent: action.parameters?.intent || action.name,
          error: error.message
        });
        
        // If multiple actions fail, mark as critical failure
        const failedActions = results.executedActions.filter(a => !a.success).length;
        if (failedActions >= 2) {
          results.criticalFailure = true;
          console.log(`🚨 Critical failure detected: ${failedActions} actions failed in batch`);
          break;
        }
      }
    }
    
    return results;
  }

  async getCurrentState() {
    try {
      console.log('📊 Getting page state via Wootz API');

      const config = await chrome.storage.sync.get('agentConfig');
      const debugMode = config?.agentConfig?.debugMode || false;
      console.log('🔍 Debug mode:', debugMode);
      
      return new Promise((resolve) => {
        chrome.wootz.getPageState({
          debugMode: debugMode,
          includeHidden: true
        }, (result) => {
          if (result.success) {
            console.log('🔍 Raw Wootz result:', result);
            
            let pageState = null;
            
            if (result.pageState && result.pageState.state && result.pageState.state.page_data) {
              try {
                console.log('🔍 Parsing nested page_data from result.pageState.state.page_data');
                pageState = JSON.parse(result.pageState.state.page_data);
                console.log('🔍 Successfully parsed pageState:', pageState);
              } catch (parseError) {
                console.error('🔍 Failed to parse page_data JSON:', parseError);
                console.error('🔍 Raw page_data:', result.pageState.state.page_data);
                const defaultState = this.getDefaultState();
                this.lastPageState = defaultState;
                resolve(defaultState);
                return;
              }
            } else if (result.pageState && result.pageState.url) {
              pageState = result.pageState;
              console.log('🔍 Using direct pageState format');
            } else {
              console.log('📊 No valid pageState format found in result');
              console.log('📊 Available keys in result:', Object.keys(result));
              if (result.pageState) {
                console.log('📊 Available keys in result.pageState:', Object.keys(result.pageState));
              }
              const defaultState = this.getDefaultState();
              this.lastPageState = defaultState;
              resolve(defaultState);
              return;
            }
            
            // Check if we're on a chrome-native page and early exit
            const isChromeNative = this.isChromeNativePage(pageState.url);
            if (isChromeNative) {
              console.log('⚠️ Chrome-native page detected - early exit to save API calls');
              const chromeState = {
                pageInfo: {
                  url: pageState.url || 'unknown',
                  title: 'Chrome Native Page',
                  domain: 'chrome'
                },
                pageContext: {
                  platform: 'chrome-native',
                  pageType: 'chrome-native',
                  hasLoginForm: false,
                  hasUserMenu: false,
                  isLoggedIn: false,
                  capabilities: {},
                  isChromeNative: true,
                  needsNavigation: true
                },
                interactiveElements: [],
                elementCategories: {},
                viewportInfo: {
                  width: pageState.viewport?.width || 0,
                  height: pageState.viewport?.height || 0,
                  isMobileWidth: pageState.viewport?.isMobileWidth || false,
                  isTabletWidth: pageState.viewport?.isTabletWidth || false,
                  isPortrait: pageState.viewport?.isPortrait || true,
                  deviceType: pageState.viewport?.deviceType || 'mobile',
                  aspectRatio: pageState.viewport?.aspectRatio || 0.75
                },
                loginStatus: { isLoggedIn: false },
                extractedContent: 'chrome-native page – navigation required'
              };
              this.lastPageState = chromeState;
              resolve(chromeState);
              return;
            }
            
            // Process elements and create enhanced state
            const processedElements = this.processElementsDirectly(pageState.elements || []);
            
            const processedState = {
              pageInfo: {
                url: pageState.url || 'unknown',
                title: pageState.title || 'unknown',
                domain: this.extractDomain(pageState.url),
                platform: this.detectPlatform(pageState.url)
              },
              pageContext: {
                platform: this.detectPlatform(pageState.url),
                pageType: this.determinePageType(pageState.url),
                hasLoginForm: pageState.pageContext?.hasLoginForm || false,
                hasUserMenu: pageState.pageContext?.hasUserMenu || false,
                isLoggedIn: pageState.pageContext?.isLoggedIn || false,
                capabilities: pageState.capabilities || {},
                isChromeNative: false
              },
              viewportInfo: {
                width: pageState.viewport?.width || 0,
                height: pageState.viewport?.height || 0,
                isMobileWidth: pageState.viewport?.isMobileWidth || false,
                isTabletWidth: pageState.viewport?.isTabletWidth || false,
                isPortrait: pageState.viewport?.isPortrait || true,
                deviceType: pageState.viewport?.deviceType || 'mobile',
                aspectRatio: pageState.viewport?.aspectRatio || 0.75
              },
              interactiveElements: processedElements,
              elementCategories: pageState.elementCategories || {},
              loginStatus: { isLoggedIn: pageState.pageContext?.isLoggedIn || false },
              extractedContent: pageState.extractedContent || '',
            };

            console.log(`📊 Enhanced Wootz State: Found ${processedState.interactiveElements.length} interactive elements`);
            console.log(`📱 Viewport: ${processedState.viewportInfo.deviceType} ${processedState.viewportInfo.width}x${processedState.viewportInfo.height}`);
            console.log(`🏷️ Categories:`, processedState.elementCategories);
            console.log(`⚡ Capabilities:`, processedState.pageContext.capabilities);
            
            // Store last page state for validation
            this.lastPageState = processedState;
            resolve(processedState);
          } else {
            console.log('📊 Wootz State: Failed, using fallback');
            console.log('🔍 Failed result:', result);
            const defaultState = this.getDefaultState();
            this.lastPageState = defaultState;
            resolve(defaultState);
          }
        });
      });
    } catch (error) {
      console.log('Could not get Wootz page state:', error);
      const defaultState = this.getDefaultState();
      this.lastPageState = defaultState;
      return defaultState;
    }
  }

  // Process elements directly without any filtering since API already sends filtered data
  processElementsDirectly(elements) {
    if (!elements || !Array.isArray(elements)) {
      console.log('🔍 Elements not array or null:', elements);
      console.log('🔍 Type of elements:', typeof elements);
      return [];
    }
    
    console.log(`🔍 Processing ${elements.length} elements directly from Wootz API`);
    
    // Process ALL elements directly - no filtering needed since API already sends the right format
    const processed = elements.map((el, arrayIndex) => {
      // console.log(`🔍 Processing element ${arrayIndex}:`, el);
      
      return {
        // Core identification (directly from API)
        index: el.index !== undefined ? el.index : arrayIndex,
        arrayIndex: arrayIndex,
        tagName: el.tagName || 'UNKNOWN',
        xpath: el.xpath || '',
        selector: el.selector || '',
        
        // Enhanced categorization (directly from API)
        category: el.category || 'unknown',
        purpose: el.purpose || 'general',
        
        // Content (directly from API)
        textContent: el.textContent || '',
        text: el.text || '', // Keep both for compatibility
        
        // Interaction properties (directly from API)
        isVisible: el.isVisible !== false,
        isInteractive: el.isInteractive !== false,
        
        // Enhanced attributes (directly from API)
        attributes: {
          id: el.attributes?.id || '',
          class: el.attributes?.class || '',
          type: el.attributes?.type || '',
          name: el.attributes?.name || '',
          'data-testid': el.attributes?.['data-testid'] || '',
          ...el.attributes // Include any other attributes
        },
        
        // Position and size (directly from API)
        bounds: {
          x: el.bounds?.x || 0,
          y: el.bounds?.y || 0,
          width: el.bounds?.width || 0,
          height: el.bounds?.height || 0
        },
        
        // Legacy compatibility fields for older code
        ariaLabel: el.attributes?.['aria-label'] || '',
        elementType: this.mapCategoryToElementType(el.category, el.tagName),
        isLoginElement: el.purpose === 'authentication' || el.category === 'form',
        isPostElement: el.purpose === 'post' || el.purpose === 'compose',
        
        // Store original for debugging
        originalElement: el
      };
    });
    
    console.log(`📊 Processed ${processed.length} elements successfully`);
    if (processed.length > 0) {
      console.log(`📊 Sample processed element:`, processed[0]);
    }
    return processed;
  }

  // Map API categories to legacy element types for compatibility
  mapCategoryToElementType(category, tagName) {
    const tag = (tagName || '').toLowerCase();
    
    switch (category) {
      case 'form':
        if (tag === 'input') return 'input';
        if (tag === 'textarea') return 'textarea';
        if (tag === 'select') return 'select';
        return 'form_element';
      case 'action':
        return 'button';
      case 'navigation':
        return 'link';
      case 'content':
        return 'content';
      default:
        if (tag === 'button') return 'button';
        if (tag === 'input') return 'input';
        if (tag === 'a') return 'link';
        return 'other';
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

  detectPlatform(url) {
    if (!url || typeof url !== 'string') return 'unknown';
    const lowerUrl = url.toLowerCase();
    
    // E-commerce platforms
    if (lowerUrl.includes('amazon.')) return 'amazon';
    if (lowerUrl.includes('ebay.')) return 'ebay';
    if (lowerUrl.includes('walmart.')) return 'walmart';
    if (lowerUrl.includes('target.')) return 'target';
    if (lowerUrl.includes('bestbuy.')) return 'bestbuy';
    if (lowerUrl.includes('flipkart.')) return 'flipkart';
    if (lowerUrl.includes('snapdeal.')) return 'snapdeal';
    if (lowerUrl.includes('shopclues.')) return 'shopclues';
    if (lowerUrl.includes('shopify.')) return 'shopify';
    if (lowerUrl.includes('bigbasket.')) return 'bigbasket';
    if (lowerUrl.includes('ajio.')) return 'ajio';
    if (lowerUrl.includes('myntra.')) return 'myntra';
    
    // Social media platforms
    if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return 'twitter';
    if (lowerUrl.includes('linkedin.com')) return 'linkedin';
    if (lowerUrl.includes('facebook.com')) return 'facebook';
    if (lowerUrl.includes('instagram.com')) return 'instagram';
    if (lowerUrl.includes('youtube.com')) return 'youtube';
    if (lowerUrl.includes('tiktok.com')) return 'tiktok';
    if (lowerUrl.includes('reddit.com')) return 'reddit';
    if (lowerUrl.includes('pinterest.com')) return 'pinterest';
    if (lowerUrl.includes('quora.com')) return 'quora';
    if (lowerUrl.includes('medium.com')) return 'medium';
    if (lowerUrl.includes('dev.to')) return 'devto';
    if (lowerUrl.includes('hashnode.com')) return 'hashnode';
    
    // Chrome-native pages
    if (lowerUrl.startsWith('chrome-native://') || lowerUrl.startsWith('chrome://')) return 'chrome-native';
    if (lowerUrl.startsWith('chrome-extension://')) return 'chrome-extension';
    
    return 'unknown';
  }
  
  determinePageType(url) {
    if (!url || typeof url !== 'string') return 'general';
    
    // Chrome-native pages
    if (url.startsWith('chrome-native://') || url.startsWith('chrome://')) return 'chrome-native';
    
    // Social media page types
    if (url.includes('/compose') || url.includes('/intent/tweet')) return 'compose';
    if (url.includes('/home') || url.includes('/timeline')) return 'home';
    if (url.includes('/login') || url.includes('/signin')) return 'login';
    if (url.includes('/profile') || url.includes('/user/')) return 'profile';
    
    // E-commerce page types
    if (url.includes('/search') || url.includes('/s?')) return 'search';
    if (url.includes('/cart') || url.includes('/basket')) return 'cart';
    if (url.includes('/product/') || url.includes('/dp/')) return 'product';
    if (url.includes('/checkout')) return 'checkout';
    
    return 'general';
  }
  
  // Check if page is chrome-native and needs navigation
  isChromeNativePage(url) {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('chrome-native://') || 
           url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') ||
           url === 'about:blank';
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
      console.log(`🎯 Executing: ${action.name}`, action.parameters);
      
      // Add enhanced element validation before action execution
      if (action.parameters?.index !== undefined) {
        const currentState = this.lastPageState || await this.getCurrentState();
        const availableIndices = (currentState.interactiveElements || []).map(el => el.index);
        if (!availableIndices.includes(action.parameters.index)) {
          // Index not found, try selector from page state if available
          const el = (currentState.interactiveElements || []).find(e => e.selector === action.parameters.selector);
          if (el && el.selector) {
            delete action.parameters.index;
            action.parameters.selector = el.selector;
          } else {
            // No valid selector, skip action
            return {
              action: action.name,
              input: action.parameters,
              result: { success: false, error: 'Element index/selector not found in page state' },
              success: false
            };
          }
        }
      }
      
      const result = await this.actionRegistry.executeAction(action.name, action.parameters);
      
      // Track failed elements for future avoidance
      if (!result.success && action.parameters?.index) {
        this.failedElements.add(action.parameters.index);
        console.log(`📝 Added index ${action.parameters.index} to failed elements set`);
        console.log(`⚠️ Action failed: ${action.name} on index ${action.parameters.index} - ${result.error}`);
      }
      
      return {
        action: action.name,
        input: action.parameters,
        result: result,
        success: result.success
      };
    } catch (error) {
      console.error(`❌ Action execution error:`, error);
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

  formatRecentActions(recentMessages = []) {
    if (!Array.isArray(recentMessages) || recentMessages.length === 0) {
      return 'No recent actions available';
    }
    return recentMessages.map(msg => {
      const step   = msg.step !== undefined ? `Step ${msg.step}` : 'Recent';
      const role   = msg.role || 'unknown';
      const action = msg.action || 'action';
      const text   = (msg.content || '').toString().substring(0, 100);
      return `${step} (${role}): ${action} – ${text}`;
    }).join('\n');
  }

  // Enhanced context building with all calculated variables
  buildEnhancedContextWithHistory() {
    const ctx = this.memoryManager.compressForPrompt(1200);
    
    return {
      ...ctx,
      procHistory: this.safeCall('formatProceduralSummaries', ctx.proceduralSummaries),
      progress: this.safeCall('analyzeProgressPatterns', ctx, this.executionHistory),
      recent: this.safeCall('formatRecentActions', ctx.recentMessages),
      guidance: this.safeCall('getSequenceGuidance', ctx.recentMessages),
      step: this.currentStep,
      maxSteps: this.maxSteps,
      executionPhase: this.safeCall('determineExecutionPhase'),
      failurePatterns: this.safeCall('detectFailurePatterns'),
      loopPrevention: this.safeCall('getLoopPreventionGuidance')
    };
  }

  // Safe method call helper
  safeCall(fnName, ...args) {
    if (typeof this[fnName] === 'function') {
      return this[fnName](...args);
    }
    console.warn(`⚠️ Missing helper "${fnName}" – returning empty string`);
    return '';
  }

  // Helper methods for enhanced context
  formatProceduralSummaries(summaries) {
    if (!summaries || summaries.length === 0) return "No procedural history available.";
    
    return summaries.map(summary => 
      `Steps ${summary.steps}: ${summary.actions}\nFindings: ${summary.findings}`
    ).join('\n\n');
  }

  analyzeProgressPatterns(context, executionHistory) {
    const recentActions = executionHistory.slice(-5);
    const successRate = recentActions.filter(a => a.success).length / Math.max(recentActions.length, 1);
    
    let analysis = `Recent success rate: ${(successRate * 100).toFixed(0)}%\n`;
    
    if (successRate < 0.3) {
      analysis += "⚠️ Low success rate - consider different approach\n";
    } else if (successRate > 0.8) {
      analysis += "✅ High success rate - continue current strategy\n";
    }
    
    // Detect patterns
    const actionTypes = recentActions.map(a => a.action);
    const uniqueTypes = new Set(actionTypes);
    
    if (uniqueTypes.size === 1 && actionTypes.length >= 3) {
      analysis += " Repetitive pattern detected - diversify actions\n";
    }
    
    return analysis;
  }

  getLoopPreventionGuidance() {
    const recentFailures = this.executionHistory.slice(-5).filter(h => !h.success);
    
    if (recentFailures.length >= 3) {
      return " CRITICAL: Multiple recent failures - avoid repeating same actions/approaches";
    } else if (recentFailures.length >= 2) {
      return "⚠️ Recent failures detected - try alternative targeting methods";
    }
    
    return "✅ No failure patterns - proceed normally";
  }

  determineExecutionPhase() {
    if (this.currentStep <= 3) return "INITIAL_EXPLORATION";
    if (this.currentStep <= 10) return "ACTIVE_EXECUTION";
    if (this.currentStep <= 15) return "REFINEMENT";
    return "FINAL_ATTEMPTS";
  }

  detectFailurePatterns() {
    const recentActions = this.executionHistory.slice(-5);
    const patterns = [];
    
    // Check for repeated action failures
    const actionFailures = {};
    recentActions.forEach(h => {
      if (!h.success && h.action) {
        actionFailures[h.action] = (actionFailures[h.action] || 0) + 1;
      }
    });
    
    Object.entries(actionFailures).forEach(([action, count]) => {
      if (count >= 2) {
        patterns.push(`${action} failed ${count} times`);
      }
    });
    
    return patterns.length > 0 ? patterns.join(', ') : 'No failure patterns detected';
  }

  // Loop prevention
  shouldSkipRepeatedAction(action) {
    const recentFailures = this.executionHistory
      .slice(-5)
      .filter(h => !h.success && h.action === action.name);
      
    // Skip if same action failed 3+ times recently
    if (recentFailures.length >= 3) {
      console.log(`🔄 LOOP PREVENTION: ${action.name} failed ${recentFailures.length} times recently`);
      return true;
    }
    
    // Skip if exact same intent failed recently
    const sameIntentFailures = this.executionHistory
      .slice(-3)
      .filter(h => !h.success && h.intent === action.parameters?.intent);
      
    if (sameIntentFailures.length >= 2) {
      console.log(`🔄 LOOP PREVENTION: Same intent "${action.parameters?.intent}" failed recently`);
      return true;
    }
    
    return false;
  }

  // Enhanced batch validation with loop prevention
  validateAndPreprocessBatchActions(batchActions) {
    const currentState = this.lastPageState || {};
    const availableIndices = (currentState.interactiveElements || []).map(el => el.index);
    const availableSelectors = (currentState.interactiveElements || []).map(el => el.selector);

    return batchActions.map(action => {
      // Only allow index or selector from page state
      if (action.action_type === 'click' || action.action_type === 'type' || action.action_type === 'fill') {
        // Prefer index if available
        if (action.parameters.index !== undefined && availableIndices.includes(action.parameters.index)) {
          // Valid index, use as is
        } else if (action.parameters.selector && availableSelectors.includes(action.parameters.selector)) {
          // Index missing or invalid, use selector from page state
          delete action.parameters.index;
        } else {
          // Neither valid index nor selector from page state, skip this action
          return null;
        }
      }
      // Loop prevention: skip if failed 3+ times
      if (this.shouldSkipRepeatedAction(action)) return null;
      return {
        name: action.action_type,
        parameters: action.parameters
      };
    }).filter(Boolean);
  }

  // Missing method: getSequenceGuidance
  getSequenceGuidance(recentMessages) {
    if (!recentMessages || recentMessages.length === 0) {
      return 'Starting fresh - analyze page and choose appropriate first action';
    }

    const lastAction = recentMessages[recentMessages.length - 1];
    if (!lastAction) {
      return 'Continue with current plan';
    }

    const actionContent = (lastAction.content || '').toLowerCase();
    
    if (actionContent.includes('type') || actionContent.includes('input') || actionContent.includes('fill')) {
      return `🎯 NEXT: After typing, you must click submit/search/enter button
- Look for buttons with text like "Search", "Submit", "Go", "Enter"
- Check for search icons or magnifying glass buttons
- Don't type again - the input should already be filled`;
    }

    if (actionContent.includes('click') && actionContent.includes('search')) {
      return `🎯 NEXT: After clicking search, wait for results
- Look for new content that appeared
- Find relevant search results to click
- Check for loading indicators that finished`;
    }

    if (actionContent.includes('navigate') || actionContent.includes('url')) {
      return `🎯 NEXT: After navigation, page is loading
- Wait for page to fully load
- Look for main interactive elements on new page
- Find elements relevant to the user's task`;
    }

    if (actionContent.includes('scroll')) {
      return `🎯 NEXT: After scrolling, new content may be visible
- Look for new elements that appeared
- Check if target content is now visible
- Consider if more scrolling is needed`;
    }

    if (actionContent.includes('failed') || actionContent.includes('error')) {
      return `🎯 NEXT: Previous action failed - try different approach
- Choose a different element or method
- Look for alternative paths to accomplish the goal
- Don't repeat the exact same action that just failed`;
    }

    return 'Continue with planned sequence based on current progress';
  }

  // Missing method: analyzeActionHistory
  analyzeActionHistory(context, executionHistory) {
    const analysis = [];
    const recentMessages = context.recentMessages || [];
    
    if (recentMessages.length === 0) {
      return 'No action history available';
    }

    // Detect repeated failures
    const failedActions = recentMessages.filter(msg =>
      msg.content?.includes('failed') || msg.content?.includes('error')
    );
    
    if (failedActions.length > 0) {
      analysis.push(`⚠️ ${failedActions.length} recent failures detected - avoid repeating same approach`);
    }

    // Detect successful patterns
    const successfulActions = recentMessages.filter(msg =>
      msg.content?.includes('success') || msg.content?.includes('completed')
    );
    
    if (successfulActions.length > 0) {
      analysis.push(`✅ ${successfulActions.length} successful actions - build on this progress`);
    }

    // Detect if we're in a sequence
    const lastAction = recentMessages[recentMessages.length - 1];
    if (lastAction) {
      if (lastAction.content?.includes('typed') || lastAction.content?.includes('input')) {
        analysis.push('📝 SEQUENCE: Just completed text input - next action should be submit/search');
      } else if (lastAction.content?.includes('click') && lastAction.content?.includes('search')) {
        analysis.push('🔍 SEQUENCE: Just clicked search - next action should be finding results');
      } else if (lastAction.content?.includes('navigate')) {
        analysis.push('🌐 SEQUENCE: Just navigated - page may still be loading');
      }
    }

    // Check execution history patterns
    const recentExecutionActions = executionHistory.slice(-5);
    const executionSuccessRate = recentExecutionActions.filter(h => h.success).length / Math.max(recentExecutionActions.length, 1);
    
    if (executionSuccessRate > 0.8) {
      analysis.push('📈 EXECUTION: High success rate in recent actions');
    } else if (executionSuccessRate < 0.4) {
      analysis.push('📉 EXECUTION: Low success rate - need strategy change');
    }

    return analysis.join('\n') || 'No specific patterns detected in action history';
  }
}

class MultiLLMService {
  constructor(config = {}) {
    this.config = config;
    console.log('🤖 Universal LLM Service initialized with provider:', this.config.aiProvider || 'anthropic');
  }

  getModelName(provider, agentType = 'planner') {
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
        'navigator': 'gemini-2.5-flash',
        'planner': 'gemini-2.5-flash',
        'validator': 'gemini-2.5-flash'
      },
      'geminiGenerate': {
        'navigator': 'gemini-2.5-flash',
        'planner': 'gemini-2.5-flash',
        'validator': 'gemini-2.5-flash',
        'chat': 'gemini-2.5-flash'
      }
    };
    
    return defaultModels[provider]?.[agentType] || defaultModels[provider]?.['navigator'] || 'gemini-1.5-pro';
  }

  isModelValidForProvider(model, provider) {
    const modelProviderMap = {
      'claude-3-7-sonnet-20250219': 'anthropic',
      'claude-3-5-sonnet-20241022': 'anthropic',
      'claude-3-5-haiku-20241022': 'anthropic',
      'claude-3-sonnet-20240229': 'anthropic', 
      'claude-3-haiku-20240307': 'anthropic',
      'claude-3-opus-20240229': 'anthropic',
      'o1-preview': 'openai',
      'o1-mini': 'openai',
      'gpt-4o': 'openai',
      'gpt-4o-mini': 'openai',
      'gpt-4-turbo': 'openai',
      'gpt-4': 'openai',
      'gpt-3.5-turbo': 'openai',
      'gemini-2.5-flash': 'gemini',
      'gemini-2.5-pro': 'gemini',
      'gemini-2.0-flash': 'gemini',
      'gemini-1.5-pro': 'gemini',
      'gemini-1.5-flash': 'gemini'
    };
    
    // For geminiGenerate provider, all Gemini models are valid
    if (provider === 'geminiGenerate') {
      return modelProviderMap[model] === 'gemini';
    }
    
    return modelProviderMap[model] === provider;
  }

  async call(messages, options = {}, agentType = 'planner') {
    return await this.callForAgent(messages, options, agentType);
  }

  async callForChat(messages, options = {}) {
    const provider = await this.determineProvider(true);
    const modelName = this.getModelName(provider, 'chat');
    
    console.log(`🎯 DEBUG: Chat Provider=${provider}, ModelName=${modelName}`);
    
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

  async callForAgent(messages, options = {}, agentType = 'navigator') {
    const provider = await this.determineProvider(false);
    const modelName = this.getModelName(provider, agentType);
    
    console.log(`🎯 DEBUG: Agent Provider=${provider}, AgentType=${agentType}, ModelName=${modelName}`);
    
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

  async determineProvider(forChat = false) {
    try {
      // Check user preference for personal API
      const storage = await chrome.storage.local.get(['userPreferPersonalAPI']);
      const userPreferPersonalAPI = storage.userPreferPersonalAPI || false;
      
      // Check if personal API keys are configured
      const hasPersonalKeys = !!(
        this.config.anthropicApiKey || 
        this.config.openaiApiKey || 
        this.config.geminiApiKey
      );
      
      // If user prefers personal API and keys are available, use configured provider
      if (userPreferPersonalAPI && hasPersonalKeys) {
        return this.config.aiProvider || 'gemini';
      }
      
      // Otherwise, use geminiGenerate (free trial)
      return 'geminiGenerate';
    } catch (error) {
      console.warn('Error determining provider, defaulting to geminiGenerate:', error);
      return 'geminiGenerate';
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
      case 'geminiGenerate':
        return true; 
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
      case 'geminiGenerate':
        return await this.callGeminiGenerate(messages, options);
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

  async callGeminiGenerate(messages, options = {}) {
    console.log(`🔥 Calling GeminiGenerate API`);
    
    try {
      // Get access token from chrome storage
      const storage = await chrome.storage.local.get(['userAuth']);
      const accessToken = storage.userAuth?.access_token;
      
      if (!accessToken) {
        throw new Error('Access token not found. Please log in again.');
      }

      // Convert messages to prompt format
      const prompt = messages.map(msg => msg.content).join('\n\n');
      
      const requestBody = {
        prompt: prompt,
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.5
      };

      const response = await fetch(`${API_BASE_URL}/gemini/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GeminiGenerate API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Invalid response from GeminiGenerate API');
      }

      return data.response;
    } catch (error) {
      console.error('GeminiGenerate API error:', error);
      throw error;
    }
  }
}

class PersistentConnectionManager {
  constructor(backgroundTaskManager) {
    this.connections = new Map();
    this.messageQueue = [];
    this.backgroundTaskManager = backgroundTaskManager;
    this.activeTask = null;
    this.lastSentMessageId = new Map();
    this.currentSessionId = null; // Track current session
  }

  addConnection(connectionId, port) {
    console.log(`🔗 Adding connection: ${connectionId}`);
    
    // Ensure we have a current session
    if (!this.currentSessionId) {
      this.currentSessionId = Date.now().toString();
      console.log(`🆕 Auto-created new session: ${this.currentSessionId}`);
    }
    
    this.connections.set(connectionId, {
      port: port,
      connected: true,
      lastActivity: Date.now(),
      sessionId: this.currentSessionId
    });

    // ONLY send messages from current session that haven't been sent to this specific connection
    const lastSentId = this.lastSentMessageId.get(connectionId) || 0;
    const newMessages = this.messageQueue.filter(msg => 
      msg.id > lastSentId && 
      msg.sessionId === this.currentSessionId && // Only current session messages
      (msg.type === 'status_update' || 
       msg.type === 'task_start' || 
       msg.type === 'task_complete' || 
       msg.type === 'task_error' ||
       msg.type === 'task_cancelled')
    );

    // IMPORTANT: Only send messages if there's an active task in this session
    const executionState = chrome.storage.local.get(['isExecuting', 'activeTaskId', 'sessionId']);
    executionState.then(state => {
      if (state.isExecuting && state.sessionId === this.currentSessionId && newMessages.length > 0) {
        console.log(`📤 Sending ${newMessages.length} active session messages to ${connectionId}`);
        newMessages.forEach(message => {
          this.safePortMessage(port, message);
        });
        
        const latestMessageId = Math.max(...newMessages.map(msg => msg.id));
        this.lastSentMessageId.set(connectionId, latestMessageId);
      } else {
        console.log(`📝 No active task or messages for connection ${connectionId}`);
      }

      // Send current execution state from storage
      if (state.isExecuting && state.sessionId === this.currentSessionId) {
        this.safePortMessage(port, {
          type: 'execution_state',
          isExecuting: true,
          activeTaskId: state.activeTaskId,
          sessionId: this.currentSessionId
        });
      }
    });
  }

  removeConnection(connectionId) {
    console.log(`🔌 Removing connection: ${connectionId}`);
    this.connections.delete(connectionId);
    // Keep the lastSentMessageId for potential reconnection within same session
  }

  broadcast(message) {
    // Add unique ID and session ID to message
    message.id = Date.now() + Math.random();
    message.sessionId = this.currentSessionId;
    
    let messageSent = false;
    
    this.connections.forEach((connection, connectionId) => {
      if (connection.connected && this.safePortMessage(connection.port, message)) {
        messageSent = true;
        this.lastSentMessageId.set(connectionId, message.id);
      }
    });

    // Add to queue for future connections (only current session)
    this.messageQueue.push(message);
    
    // Keep only last 20 messages to prevent memory issues
    if (this.messageQueue.length > 20) {
      this.messageQueue = this.messageQueue.slice(-20);
    }

    if (!messageSent) {
      console.log('📦 Queued for background persistence:', message.type);
    }
  }

  // Start new session (called when new chat is created)
  startNewSession() {
    this.currentSessionId = Date.now().toString();
    console.log(`🆕 Starting new session: ${this.currentSessionId}`);
    
    // Clear old messages from different sessions
    this.messageQueue = this.messageQueue.filter(msg => 
      msg.sessionId === this.currentSessionId
    );
    
    // Clear last sent message tracking for new session
    this.lastSentMessageId.clear();
    
    return this.currentSessionId;
  }

  // Get current session ID
  getCurrentSession() {
    if (!this.currentSessionId) {
      this.currentSessionId = Date.now().toString();
    }
    return this.currentSessionId;
  }

  // Clear all messages (for new chat)
  clearMessages() {
    console.log('🧹 Clearing all messages for new chat');
    this.messageQueue = []; // Clear ALL messages
    this.lastSentMessageId.clear(); // Clear all tracking
    this.startNewSession();
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

class BackgroundScriptAgent {
  constructor() {
    this.backgroundTaskManager = new BackgroundTaskManager();
    this.connectionManager = new PersistentConnectionManager(this.backgroundTaskManager);
    this.activeTasks = new Map();
    this.llmService = null;
    this.multiAgentExecutor = null;
    this.taskRouter = null;
    this.currentConfig = null; // Track current config
    
    this.setupMessageHandlers();
    this.setupConfigWatcher(); // Add config watcher
    console.log('✅ Universal BackgroundScriptAgent initialized with Wootz API integration');
  }

  // Add config watcher to detect changes
  setupConfigWatcher() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.agentConfig) {
        console.log('🔄 Config changed, reinitializing services...');
        const newConfig = changes.agentConfig.newValue;
        this.reinitializeServices(newConfig);
      }
    });
  }

  // Reinitialize services when config changes
  async reinitializeServices(newConfig = null) {
    try {
      if (!newConfig) {
        newConfig = await this.getConfig();
      }
      
      // Only reinitialize if config actually changed
      if (JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig)) {
        console.log('🔄 Reinitializing LLM services with new config');
        console.log('📝 New provider:', newConfig.aiProvider);
        
        this.currentConfig = newConfig;
        this.llmService = new MultiLLMService(newConfig);
        this.multiAgentExecutor = new MultiAgentExecutor(this.llmService);
        this.taskRouter = new AITaskRouter(this.llmService);
        
        // Broadcast config update to all connected clients
        this.connectionManager.broadcast({
          type: 'config_updated',
          provider: newConfig.aiProvider,
          hasValidKey: this.hasValidApiKey(newConfig)
        });
        
        console.log('✅ Services reinitialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to reinitialize services:', error);
    }
  }

  // Check if current provider has valid API key
  hasValidApiKey(config) {
    switch (config.aiProvider) {
      case 'anthropic':
        return !!config.anthropicApiKey;
      case 'openai':
        return !!config.openaiApiKey;
      case 'gemini':
        return !!config.geminiApiKey;
      default:
        return false;
    }
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
          startTime: Date.now(),
          sessionId: this.connectionManager.getCurrentSession()
        });
        
        this.connectionManager.setActiveTask(taskId);
        
        // Store execution state in chrome.storage.local
        await chrome.storage.local.set({
          isExecuting: true,
          activeTaskId: taskId,
          taskStartTime: Date.now(),
          sessionId: this.connectionManager.getCurrentSession()
        });
        
        await this.executeTaskWithBackgroundManager(message.task, taskId);
        break;

      case 'cancel_task':
        console.log('🛑 Received cancel_task request');
        const activeTaskId = this.connectionManager.getActiveTask();
        if (activeTaskId) {
          const cancelled = this.backgroundTaskManager.cancelTask(activeTaskId);
          this.activeTasks.delete(activeTaskId);
          this.connectionManager.setActiveTask(null);
          
          // Clear execution state from storage
          await chrome.storage.local.set({
            isExecuting: false,
            activeTaskId: null,
            taskStartTime: null,
            sessionId: null
          });
          
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

      case 'new_chat':
        console.log('🆕 Received new_chat request');
        
        // Cancel any running tasks
        const currentActiveTask = this.connectionManager.getActiveTask();
        if (currentActiveTask) {
          this.backgroundTaskManager.cancelTask(currentActiveTask);
          this.activeTasks.delete(currentActiveTask);
        }
        
        // Only clear current chat state, not chat histories
        await chrome.storage.local.set({
          isExecuting: false,
          activeTaskId: null,
          taskStartTime: null,
          sessionId: null,
          chatHistory: [] // Only clear current chat
        });
        
        // Clear messages and start new session
        this.connectionManager.clearMessages();
        
        // Reset connection manager state
        this.connectionManager.setActiveTask(null);
        
        // Notify frontend that chat has been cleared
        this.connectionManager.safePortMessage(port, {
          type: 'chat_cleared',
          sessionId: this.connectionManager.getCurrentSession()
        });
        
        console.log(`✅ New chat started with session: ${this.connectionManager.getCurrentSession()}`);
        break;

      case 'get_status':
        const status = await this.getAgentStatus();
        
        // Also send execution state from storage
        const executionState = await chrome.storage.local.get(['isExecuting', 'activeTaskId', 'sessionId']);
        
        this.connectionManager.safePortMessage(port, {
          type: 'status_response',
          status: status,
          isExecuting: executionState.isExecuting || false,
          activeTaskId: executionState.activeTaskId || null,
          sessionId: executionState.sessionId || this.connectionManager.getCurrentSession()
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
      console.log('🚀 Executing universal task with single AI call:', task, 'ID:', taskId);
      
      // Always get fresh config and reinitialize if needed
      const config = await this.getConfig();
      await this.reinitializeServices(config);
      
      // Ensure services are initialized
      if (!this.llmService) {
        throw new Error('LLM service not properly initialized. Please check your API key configuration.');
      }

      const currentContext = await this.getCurrentPageContext();
      
      console.log('🧠 Making single intelligent routing call...');
      const intelligentResult = await this.taskRouter.analyzeAndRoute(task, currentContext);
      
      console.log('🎯 Intelligent result:', intelligentResult);

      if (intelligentResult.intent === 'CHAT') {
        const result = {
          success: true,
          response: intelligentResult.response.message,
          message: intelligentResult.response.message,
          confidence: intelligentResult.confidence,
          isMarkdown: intelligentResult.response.isMarkdown || true
        };
        
        this.connectionManager.broadcast({
          type: 'task_complete',
          result: result,
          taskId: taskId
        });
        
        this.activeTasks.delete(taskId);
        this.connectionManager.setActiveTask(null);
        
        // Clear execution state from storage
        await chrome.storage.local.set({
          isExecuting: false,
          activeTaskId: null,
          taskStartTime: null
        });
        
        return;
      }
      
      if (intelligentResult.intent === 'WEB_AUTOMATION') {
        console.log('🤖 Starting web automation with intelligent plan...');
        
        const initialPlan = {
          observation: intelligentResult.response.observation,
          done: intelligentResult.response.done || false,
          strategy: intelligentResult.response.strategy,
          next_action: intelligentResult.response.next_action,
          reasoning: intelligentResult.response.reasoning,
          completion_criteria: intelligentResult.response.completion_criteria,
          direct_url: intelligentResult.response.direct_url,
          requires_auth: intelligentResult.response.requires_auth || false,
          workflow_type: intelligentResult.response.workflow_type
        };

        await this.backgroundTaskManager.startTask(
          taskId, 
          { task, initialPlan },
          this.multiAgentExecutor, 
          this.connectionManager
        );
        return;
      }

      throw new Error(`Unknown intent: ${intelligentResult.intent}`);
      
    } catch (error) {
      console.error('Intelligent task execution error:', error);
      
      // Clear execution state from storage on error
      await chrome.storage.local.set({
        isExecuting: false,
        activeTaskId: null,
        taskStartTime: null,
        sessionId: null
      });
      
      // Show the ACTUAL error to the user, not a generic message
      let userFriendlyError = this.formatErrorForUser(error);
      
      this.connectionManager.broadcast({
        type: 'task_error',
        error: userFriendlyError,
        taskId: taskId,
        originalError: error.message
      });
      
      this.activeTasks.delete(taskId);
      this.connectionManager.setActiveTask(null);
    }
  }

  // Enhanced error formatting with demo responses
  formatErrorForUser(error) {
    const errorMessage = error.message || 'Unknown error';
    const timestamp = new Date().toLocaleTimeString();
    
    // Handle JSON parsing errors specifically
    if (errorMessage.includes('JSON') || errorMessage.includes('parse') || errorMessage.includes('SyntaxError')) {
      return `🔧 **Response Parsing Error** (${timestamp})

The AI model's response couldn't be processed due to formatting issues.

**What happened:**
• The AI response was incomplete or malformed
• This often occurs with complex tasks or when the model is overloaded

**What you can do:**
• Try again with a simpler, more specific task
• Break complex requests into smaller steps
• Wait a moment and retry the same task

**Technical Details:** ${errorMessage}`;
    }
    
    // Handle response truncation/incompleteness
    if (errorMessage.includes('incomplete') || errorMessage.includes('truncated') || errorMessage.includes('cut off')) {
      return `✂️ **Incomplete Response Error** (${timestamp})

The AI model provided an incomplete response, likely due to length limits.

**What happened:**
• The response was cut off before completion
• Complex tasks may exceed response limits

**What you can do:**
• Try breaking your task into smaller, simpler steps
• Reduce the complexity of your request
• Retry with more specific instructions

**Technical Details:** ${errorMessage}`;
    }
    
    // Handle API-specific errors with more detail
    if (errorMessage.includes('429')) {
      return `⚠️ **Rate Limit Exceeded** (${timestamp})

The AI service is currently receiving too many requests. This is temporary.

**What you can do:**
• Wait 1-2 minutes and try again
• Try a simpler task to reduce processing time
• Check if you have multiple agents running
• Consider using your personal API key in Settings

**Technical Details:** ${errorMessage}`;
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return `🚫 **AI Service Temporarily Unavailable** (${timestamp})

The AI provider is experiencing technical difficulties.

**What you can do:**
• Try again in 5-10 minutes
• Switch to a different AI provider in settings
• Use your personal API key for more reliability
• Check the service status page

**Technical Details:** ${errorMessage}`;
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('API key')) {
      return `🔑 **Authentication Failed** (${timestamp})

Your API key is invalid or missing.

**What you can do:**
• Go to Settings and check your API key
• Make sure the key is copied correctly (no extra spaces)
• Verify the key is active on your AI provider's dashboard
• Try using the free trial option instead

**Technical Details:** ${errorMessage}`;
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return `🚫 **Access Denied** (${timestamp})

Your API key doesn't have the required permissions.

**What you can do:**
• Check your AI provider's billing/usage limits
• Ensure your API key has proper permissions
• Contact your AI provider if you're within limits
• Try using the free trial option

**Technical Details:** ${errorMessage}`;
    }
    
    if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
      return `❌ **Invalid Request** (${timestamp})

The request couldn't be processed due to formatting issues.

**What you can do:**
• Try rephrasing your task more clearly
• Use simple commands like "search for X on Y"
• Avoid special characters in your request
• Make sure your task is specific and actionable

**Technical Details:** ${errorMessage}`;
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return `⏱️ **Network Timeout** (${timestamp})

The request took too long to process.

**What you can do:**
• Check your internet connection
• Try the task again (it may work now)
• Break complex tasks into smaller steps
• Ensure you're not behind a restrictive firewall

**Technical Details:** ${errorMessage}`;
    }
    
    // Handle model-specific errors (Gemini, GPT, Claude)
    if (errorMessage.includes('quota') || errorMessage.includes('usage') || errorMessage.includes('limit')) {
      return `📊 **Usage Limit Reached** (${timestamp})

You've reached your API usage limit for this period.

**What you can do:**
• Wait for your quota to reset (usually monthly)
• Upgrade your API plan with your provider
• Switch to a different AI provider in Settings
• Use the free trial option

**Technical Details:** ${errorMessage}`;
    }
    
    if (errorMessage.includes('model') || errorMessage.includes('unsupported') || errorMessage.includes('deprecated')) {
      return `🤖 **Model Error** (${timestamp})

The selected AI model is not available or supported.

**What you can do:**
• Try switching to a different model in Settings
• Update your API configuration
• Check if the model name is correct
• Use the default model instead

**Technical Details:** ${errorMessage}`;
    }
    
    // For any other error, show enhanced message with demo
    return `❌ **Unexpected Error** (${timestamp})

Something went wrong while processing your request.

**What you can do:**
• Try your request again
• Simplify the task if it's complex
• Check the browser console for more details
• Report this issue if it persists

**Technical Details:** ${errorMessage}`;
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
      // Save to sync storage
      await chrome.storage.sync.set({ agentConfig: config });
      
      // Immediately reinitialize services
      await this.reinitializeServices(config);
      
      return { success: true, message: 'Configuration updated and applied' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Add helper method to get current page context
  async getCurrentPageContext() {
    try {
      // Get basic page info for context
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      return {
        url: currentTab?.url || 'unknown',
        title: currentTab?.title || 'Unknown Page',
        elementsCount: 0 // Will be populated by actual page state later
      };
    } catch (error) {
      return {
        url: 'unknown',
        title: 'Unknown Page', 
        elementsCount: 0
      };
    }
  }

  hasMarkdownContent(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    // Check for common markdown patterns
    const markdownPatterns = [
      /\*\*(.*?)\*\*/, // bold
      /\*(.*?)\*/, // italic
      /`(.*?)`/, // inline code
      /```[\s\S]*?```/, // code blocks
      /^#{1,6}\s/, // headers
      /^[-*+]\s/, // unordered lists
      /^\d+\.\s/, // ordered lists
      /\[(.*?)\]\((.*?)\)/, // links
      /!\[(.*?)\]\((.*?)\)/, // images
      /^\|.*\|$/, // tables
      /^>/, // blockquotes
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  }
}

// Initialize
const backgroundScriptAgent = new BackgroundScriptAgent();
console.log('🚀 Universal AI Web Agent Background Script Initialized with Wootz APIs');

// Chrome Alarms for Android background persistence
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    console.log("🟢 Background Service Worker Active:", new Date().toISOString());
    if (backgroundScriptAgent?.backgroundTaskManager) {
      const runningTasks = backgroundScriptAgent.backgroundTaskManager.getAllRunningTasks();
      console.log(`📊 Background status: ${runningTasks.length} tasks running`);
    }
  }
});

chrome.alarms.create('keep-alive', { 
  periodInMinutes: 0.1 
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Universal extension startup');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('⚡ Universal extension installed/updated');
});


const webContentsId = 27; // For auth operations
const searchWebContentsId = 29; // For search operations
const productWebContentsId = 30; // For product details
const cartWebContentsId = 31; // For cart operations
const retryWebContentsId = 28; // For retry operations (keep existing)
let countryCode = 'US';
let authValidationInterval = null;
let retryIntervals = new Map(); // Store retry intervals for each product
let retryQueue = []; // Queue of products waiting to be retried
let isRetryInProgress = false; // Flag to prevent multiple retries at once 
let backgroundCheckInterval = null;
let backgroundCheckQueue = []; // Products to check in background

function saveAuthState(isAuthenticated, userProfile = null) {
  chrome.storage.local.set({
    isAuthenticated: isAuthenticated,
    userProfile: userProfile,
    lastAuthCheck: Date.now()
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('🔵 Background: Error saving auth state:', chrome.runtime.lastError);
    } else {
      console.log('🔵 Background: Auth state saved to storage:', { isAuthenticated, userProfile });
    }
  });
}

function getAuthState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['isAuthenticated', 'userProfile', 'lastAuthCheck'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('🔵 Background: Error getting auth state:', chrome.runtime.lastError);
        resolve({});
      } else {
        console.log('🔵 Background: Retrieved auth state from storage:', result);
        resolve(result);
      }
    });
  });
}


function clearAuthState() {
  chrome.storage.local.remove(['isAuthenticated', 'userProfile', 'lastAuthCheck'], () => {
    if (chrome.runtime.lastError) {
      console.error('🔵 Background: Error clearing auth state:', chrome.runtime.lastError);
    } else {
      console.log('🔵 Background: Auth state cleared from storage');
    }
  });
}

function startPeriodicAuthValidation() {
  if (authValidationInterval) {
    clearInterval(authValidationInterval);
  }
  
  // Check auth every hour (3600000 ms)
  authValidationInterval = setInterval(async () => {
    console.log('🔵 Background: Running periodic auth validation...');
    const storedState = await getAuthState();
    
    if (storedState.isAuthenticated) {
      // Perform a quick auth check to validate the stored state
      const authUrl = `https://m.popmart.com/${countryCode.toLowerCase()}/account`;
      try {
        chrome.wootz.createBackgroundWebContents(webContentsId, authUrl, (result) => {
          if (result.success) {
            // Quick check - just verify we can access the account page
            setTimeout(() => {
              chrome.tabs.sendMessage(webContentsId, {type: 'GET_CURRENT_URL'}, function(response) {
                if (chrome.runtime.lastError || !response) {
                  console.log('🔵 Background: Periodic auth validation failed - clearing stored state');
                  clearAuthState();
                  stopPeriodicAuthValidation();
                } else {
                  const expectedUrlPattern = `https://m.popmart.com/${countryCode.toLowerCase()}/account`;
                  const urlMatches = response.url && response.url.toLowerCase().startsWith(expectedUrlPattern);
                  
                  if (!urlMatches) {
                    console.log('🔵 Background: Periodic auth validation failed - URL mismatch');
                    clearAuthState();
                    stopPeriodicAuthValidation();
                  } else {
                    console.log('🔵 Background: Periodic auth validation successful');
                    saveAuthState(true, storedState.userProfile);
                  }
                }
                destroyBackgroundWebContents();
              });
            }, 5000);
          } else {
            console.log('🔵 Background: Periodic auth validation failed - could not create WebContents');
            clearAuthState();
            stopPeriodicAuthValidation();
          }
        });
      } catch (error) {
        console.error('🔵 Background: Error during periodic auth validation:', error);
        clearAuthState();
        stopPeriodicAuthValidation();
      }
    } else {
      console.log('🔵 Background: No stored auth state, stopping periodic validation');
      stopPeriodicAuthValidation();
    }
  }, 600000); // 10 minute
  
  console.log('🔵 Background: Started periodic auth validation (every hour)');
}

function stopPeriodicAuthValidation() {
  if (authValidationInterval) {
    clearInterval(authValidationInterval);
    authValidationInterval = null;
    console.log('🔵 Background: Stopped periodic auth validation');
  }
}

function destroyBackgroundWebContents() {
  chrome.wootz.destroyBackgroundWebContents(webContentsId, (result) => {
    if (result.success) {
      console.log('Background WebContents destroyed');
    }
  });
}

function handleAuthCheck() {
  console.log('🔵 Background: Starting auth check, will check URL in 10 seconds...');
  setTimeout(() => {
    console.log('🔵 Background: Checking URL after 10 seconds...');
    
    // Add retry logic with exponential backoff for auth check
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptAuthCheck = () => {
      setTimeout(() => {
        console.log('🔵 Background: Attempting to get current URL (attempt ' + (retryCount + 1) + ')');
        
        // First check if content script is ready
        chrome.tabs.sendMessage(webContentsId, {type: 'PING'}, function(pingResponse) {
          if (chrome.runtime.lastError) {
            console.log('🔵 Background: Content script not ready yet, retrying...');
            retryCount++;
            if (retryCount < maxRetries) {
              attemptAuthCheck();
            } else {
              console.error('🔵 Background: Content script never became ready');
              handleFailedAuthentication();
              destroyBackgroundWebContents();
            }
            return;
          }
          
          // Content script is ready, proceed with URL check
    chrome.tabs.sendMessage(webContentsId, {type: 'GET_CURRENT_URL'}, function(response) {
      if (chrome.runtime.lastError) {
        console.error('🔵 Background: Error sending message:', chrome.runtime.lastError);
        handleFailedAuthentication();
              destroyBackgroundWebContents();
        return;
      }
      
      if (response) {
        console.log('🔵 Background: Received URL response:', response);
        checkUrlAndLoginStatus(response.url);
      } else {
        console.log('🔵 Background: No response received, assuming authentication failed');
        handleFailedAuthentication();
              destroyBackgroundWebContents();
      }
    });
        });
      }, 2000 + (retryCount * 1000)); // Exponential backoff: 2s, 3s, 4s
    };
    
    attemptAuthCheck();
  }, 20000);
}

function checkUrlAndLoginStatus(url) {
  console.log('🔵 Background: Checking authentication for URL:', url);
  const expectedUrlPattern = `https://m.popmart.com/${countryCode.toLowerCase()}/account`;
  const urlMatches = url && url.toLowerCase().startsWith(expectedUrlPattern);
  
  console.log('🔵 Background: URL matches expected pattern:', urlMatches);

  const isAuthenticated = urlMatches;
  
  if (isAuthenticated) {
    console.log('🔵 Background: Authentication successful - URL matches expected pattern');
    
    // Add retry logic with exponential backoff for user profile extraction
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptProfileExtraction = () => {
      setTimeout(() => {
        console.log('🔵 Background: Attempting to extract user profile (attempt ' + (retryCount + 1) + ')');
        
        // First check if content script is ready
        chrome.tabs.sendMessage(webContentsId, {type: 'PING'}, function(pingResponse) {
          if (chrome.runtime.lastError) {
            console.log('🔵 Background: Content script not ready yet, retrying...');
            retryCount++;
            if (retryCount < maxRetries) {
              attemptProfileExtraction();
            } else {
              console.error('🔵 Background: Content script never became ready');
              handleFailedAuthentication();
              destroyBackgroundWebContents();
            }
            return;
          }
          
          // Content script is ready, proceed with profile extraction
    chrome.tabs.sendMessage(webContentsId, {type: 'USER_PROFILE'}, function(response) {
      const userProfile = response && response.success ? response.profile : null;
      saveAuthState(true, userProfile);
      startPeriodicAuthValidation();
            startBackgroundPeriodicCheck();
      chrome.runtime.sendMessage({
        type: 'AUTH_SUCCESS',
        url: url,
        userProfile: userProfile
      });
            destroyBackgroundWebContents();
    });
        });
      }, 2000 + (retryCount * 1000)); // Exponential backoff: 2s, 3s, 4s
    };
    
    attemptProfileExtraction();
  } else {
    console.log('🔵 Background: Authentication failed - URL does not match expected pattern');
    handleFailedAuthentication();
    destroyBackgroundWebContents();
  }
}

// Function to handle failed authentication
function handleFailedAuthentication() {
  console.log('🔵 Background: Authentication failed - sending AUTH_FAILED message');
  clearAuthState();
  stopPeriodicAuthValidation();
  chrome.runtime.sendMessage({
    type: 'AUTH_FAILED'
  });
}

// Function to handle WebContents creation failure
function handleWebContentsCreationFailed(error) {
  console.log('🔵 Background: WebContents creation failed:', error);
  chrome.runtime.sendMessage({
    type: 'WEB_CONTENTS_FAILED',
    error: error
  });
}

// Function to open login tab
function openLoginTab() {
  const loginUrl = `https://m.popmart.com/${countryCode.toLowerCase()}/user/login`;
  console.log('🔵 Background: Opening login tab with URL:', loginUrl);
  
  chrome.tabs.create({
    url: loginUrl,
    active: true
  });
}
function isStoredAuthValid(lastAuthCheck) {
  if (!lastAuthCheck) return false;
  const twentyFourHours = 10 * 60 * 1000; // 10 minutes in milliseconds
  return (Date.now() - lastAuthCheck) < twentyFourHours;
}

function startBackgroundPeriodicCheck() {
  if (backgroundCheckInterval) {
    clearInterval(backgroundCheckInterval);
  }
  
  // Check every 2 minutes (120000 ms)
  backgroundCheckInterval = setInterval(() => {
    console.log('🔵 Background: Running background periodic check...');
    checkWaitlistProductsInBackground();
  }, 120000); // 2 minutes
  
  console.log('🔵 Background: Started background periodic check (every 2 minutes)');
}

function stopBackgroundPeriodicCheck() {
  if (backgroundCheckInterval) {
    clearInterval(backgroundCheckInterval);
    backgroundCheckInterval = null;
    console.log('🔵 Background: Stopped background periodic check');
  }
}

function checkWaitlistProductsInBackground() {
  chrome.storage.local.get(['waitlistProducts'], (result) => {
    const waitlistProducts = result.waitlistProducts || [];
    
    if (waitlistProducts.length === 0) {
      console.log('🔵 Background: No waitlist products to check');
      return;
    }
    
    console.log('🔵 Background: Checking', waitlistProducts.length, 'waitlist products in background');
    
    // Add all waitlist products to background check queue
    waitlistProducts.forEach(product => {
      addToBackgroundCheckQueue(product);
    });
    
    // Process the queue
    processBackgroundCheckQueue();
  });
}

function addToBackgroundCheckQueue(product) {
  const existingIndex = backgroundCheckQueue.findIndex(item => item.url === product.url);
  if (existingIndex !== -1) {
    console.log('🔵 Background: Product already in background check queue:', product.name);
    return;
  }
  
  backgroundCheckQueue.push({
    productDetails: {
      name: product.name,
      image: product.image,
      url: product.url
    },
    productPrice: product.price
  });
  
  console.log('🔵 Background: Added to background check queue:', product.name);
}

function processBackgroundCheckQueue() {
  if (backgroundCheckQueue.length === 0) {
    console.log('🔵 Background: Background check queue empty');
    return;
  }
  
  const nextProduct = backgroundCheckQueue.shift();
  console.log('🔵 Background: Processing background check for:', nextProduct.productDetails.name);
  
  checkProductAvailabilityInBackground(nextProduct.productDetails, nextProduct.productPrice);
}

function checkProductAvailabilityInBackground(productDetails, productPrice) {
  console.log('🔵 Background: Checking product availability in background:', productDetails.name);
  
  try {
    chrome.wootz.createBackgroundWebContents(retryWebContentsId, productDetails.url, (result) => {
      if (result.success) {
        console.log('🔵 Background: Background check WebContents created successfully');
        
        // Add retry logic with exponential backoff for background check
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptBackgroundClick = () => {
          setTimeout(() => {
            console.log('🔵 Background: Attempting to click add to cart in background check (attempt ' + (retryCount + 1) + ')');
            
            // First check if content script is ready
            chrome.tabs.sendMessage(retryWebContentsId, {type: 'PING'}, function(pingResponse) {
              if (chrome.runtime.lastError) {
                console.log('🔵 Background: Content script not ready for background check, retrying...');
                retryCount++;
                if (retryCount < maxRetries) {
                  attemptBackgroundClick();
                } else {
                  console.error('🔵 Background: Content script never became ready for background check');
                  destroyRetryWebContents();
                  processNextBackgroundCheck();
                }
                return;
              }
              
              // Content script is ready, proceed with click
              chrome.tabs.sendMessage(retryWebContentsId, {
                type: 'CLICK_ADD_TO_CART'
              }, function(clickResponse) {
                if (chrome.runtime.lastError) {
                  console.error('🔵 Background: Error in background check:', chrome.runtime.lastError);
                  destroyRetryWebContents();
                  processNextBackgroundCheck();
                  return;
                }
                
                console.log('🔵 Background: Background check click response:', clickResponse);
                if (clickResponse && clickResponse.success) {
                  console.log('🔵 Background: Product available in background check!');
                  
                  setTimeout(() => {
                    let cartRetryCount = 0;
                    const maxCartRetries = 3;
                    
                    const attemptBackgroundCartCheck = () => {
                      chrome.wootz.createBackgroundWebContents(cartWebContentsId, `https://m.popmart.com/${countryCode.toLowerCase()}/largeShoppingCart`, (cartResult) => {
                        if (cartResult.success) {
                          console.log('🔵 Background: Background check cart WebContents created successfully');
                          
                          setTimeout(() => {
                            console.log('🔵 Background: Attempting to check cart in background (attempt ' + (cartRetryCount + 1) + ')');
                            
                            // First check if cart content script is ready
                            chrome.tabs.sendMessage(cartWebContentsId, {type: 'PING'}, function(pingResponse) {
                              if (chrome.runtime.lastError) {
                                console.log('🔵 Background: Cart content script not ready for background check, retrying...');
                                cartRetryCount++;
                                if (cartRetryCount < maxCartRetries) {
                                  attemptBackgroundCartCheck();
                                } else {
                                  console.error('🔵 Background: Cart content script never became ready for background check');
                                  destroyCartWebContents();
                                  destroyRetryWebContents();
                                  processNextBackgroundCheck();
                                }
                                return;
                              }
                              
                              // Cart content script is ready, proceed with check
                              chrome.tabs.sendMessage(cartWebContentsId, {
                                type: 'CHECK_PRODUCT_IN_CART',
                                productName: productDetails.name
                              }, function(cartResponse) {
                                if (chrome.runtime.lastError) {
                                  console.error('🔵 Background: Error checking cart in background:', chrome.runtime.lastError);
                                  destroyCartWebContents();
                                  destroyRetryWebContents();
                                  processNextBackgroundCheck();
                                  return;
                                }
                                
                                if (cartResponse && cartResponse.inCart) {
                                  console.log('🔵 Background: Product successfully added to cart in background check!');
                                  
                                  // Move from waitlist to cart
                                  moveFromWaitlistToCart(productDetails, productPrice);
                                  
                                  // Send notification to user
                                  chrome.runtime.sendMessage({
                                    type: 'BACKGROUND_ADDED_TO_CART',
                                    productName: productDetails.name
                                  });
                                  
                                  // Show notification
                                  chrome.notifications.create({
                                    type: 'basic',
                                    iconUrl: 'src/assets/icon.png',
                                    title: 'Labubu Available! 🎉',
                                    message: `${productDetails.name} has been added to your cart!`
                                  });
                                }
                                
                                destroyCartWebContents();
                                destroyRetryWebContents();
                                processNextBackgroundCheck();
                              });
                            });
                          }, 3000);
                        } else {
                          console.log('🔵 Background: Failed to create cart WebContents in background check');
                          destroyRetryWebContents();
                          processNextBackgroundCheck();
                        }
                      });
                    };
                    
                    attemptBackgroundCartCheck();
                  }, 2000);
                } else {
                  console.log('🔵 Background: Product still not available in background check');
                  destroyRetryWebContents();
                  processNextBackgroundCheck();
                }
              });
            });
          }, 5000 + (retryCount * 1000)); // Exponential backoff: 5s, 6s, 7s
        };
        
        attemptBackgroundClick();
      } else {
        console.log('🔵 Background: Failed to create background check WebContents');
        processNextBackgroundCheck();
      }
    });
  } catch (error) {
    console.error('🔵 Background: Error in background check:', error);
    processNextBackgroundCheck();
  }
}

function processNextBackgroundCheck() {
  console.log('🔵 Background: Current background check completed, processing next');
  
  setTimeout(() => {
    processBackgroundCheckQueue();
  }, 5000); // Wait 5 seconds between checks
}

chrome.runtime.onStartup.addListener(() => {
  console.log('🔵 Background: Extension started, checking for stored auth state...');
  getAuthState().then((storedState) => {
    if (storedState.isAuthenticated && isStoredAuthValid(storedState.lastAuthCheck)) {
      console.log('🔵 Background: Valid stored auth state found, starting periodic validation');
      startPeriodicAuthValidation();
    } else {
      console.log('🔵 Background: No valid stored auth state found on startup');
    }
  });
  
  // Start background periodic check regardless of auth state
  startBackgroundPeriodicCheck();
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('🔵 Background: Extension installed/updated:', details.reason);
  if (details.reason === 'install') {
    console.log('🔵 Background: First time installation');
    clearAuthState();
  } else if (details.reason === 'update') {
    console.log('🔵 Background: Extension updated, checking stored auth state...');
    getAuthState().then((storedState) => {
      if (storedState.isAuthenticated && isStoredAuthValid(storedState.lastAuthCheck)) {
        console.log('🔵 Background: Valid stored auth state found after update, starting periodic validation');
        startPeriodicAuthValidation();
      } else {
        console.log('🔵 Background: No valid stored auth state found after update');
      }
    });
  }
  
  // Start background periodic check regardless of auth state
  startBackgroundPeriodicCheck();
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔵 Background: Received message:', message.type);
  
  switch (message.type) {
    case 'CHECK_AUTH':
      getAuthState().then((storedState) => {
        if (storedState.isAuthenticated && isStoredAuthValid(storedState.lastAuthCheck)) {
          console.log('🔵 Background: Using stored auth state');
          startPeriodicAuthValidation();
          chrome.runtime.sendMessage({
            type: 'AUTH_SUCCESS',
            url: `https://m.popmart.com/${countryCode.toLowerCase()}/account`,
            userProfile: storedState.userProfile
          });
        } else {
          console.log('🔵 Background: No valid stored auth state, performing fresh check');
          const authUrl = `https://m.popmart.com/${countryCode.toLowerCase()}/account`;
          console.log('🔵 Background: Creating auth WebContents for:', authUrl);
          try{
            chrome.wootz.createBackgroundWebContents(webContentsId, authUrl, (result) => {
              if (result.success) {
                console.log('🔵 Background: Auth WebContents created successfully');
                handleAuthCheck();
              } else {
                console.log('🔵 Background: Failed to create auth WebContents');
                handleWebContentsCreationFailed('Failed to create WebContents');
              }
            });
          } catch (error) {
            console.error('🔵 Background: Error creating auth WebContents:', error);
            handleWebContentsCreationFailed('Failed to create WebContents');
          }
        }
      });
      break;
      
    case 'SEARCH_LABUBU':
      const searchQuery = message.query;
      const formattedQuery = searchQuery.replace(/\s+/g, '-');
      const searchUrl = `https://m.popmart.com/${countryCode.toLowerCase()}/search/${formattedQuery}`;
      
      console.log('🔵 Background: Starting search for:', searchQuery);
      console.log('🔵 Background: Search URL:', searchUrl);
      
      chrome.wootz.createBackgroundWebContents(searchWebContentsId, searchUrl, (result) => {
        if (result.success) {
          console.log('🔵 Background: Search WebContents created successfully');
          
          // Add retry logic with exponential backoff
          let retryCount = 0;
          const maxRetries = 10;
          
          const attemptExtraction = () => {
          setTimeout(() => {
              console.log('🔵 Background: Attempting to extract search results (attempt ' + (retryCount + 1) + ')');
              
              // First check if content script is ready
              chrome.tabs.sendMessage(searchWebContentsId, {type: 'PING'}, function(pingResponse) {
                if (chrome.runtime.lastError) {
                  console.log('🔵 Background: Content script not ready yet, retrying...');
                  retryCount++;
                  if (retryCount < maxRetries) {
                    attemptExtraction();
                  } else {
                    console.error('🔵 Background: Content script never became ready');
                    sendResponse({ success: false, error: 'Content script not available' });
                    destroySearchWebContents();
                  }
                  return;
                }
                
                // Content script is ready, proceed with extraction
                chrome.tabs.sendMessage(searchWebContentsId, {
              type: 'EXTRACT_SEARCH_RESULTS',
              searchQuery: searchQuery
            }, function(response) {
              if (chrome.runtime.lastError) {
                console.error('🔵 Background: Error extracting search results:', chrome.runtime.lastError);
                sendResponse({ success: false, error: 'Failed to extract results' });
                    destroySearchWebContents();
                return;
              }
              
              console.log('🔵 Background: Received search results:', response);
              if (response && response.success) {
                sendResponse({
                  success: true,
                  results: response.results,
                  searchQuery: searchQuery
                });
              } else {
                sendResponse({
                  success: false,
                  error: response?.error || 'No results found'
                });
              }
                  destroySearchWebContents();
                });
              });
            }, 2000 + (retryCount * 1000)); // Exponential backoff: 2s, 3s, 4s
          };
          
          attemptExtraction();
        } else {
          console.log('🔵 Background: Failed to create search WebContents');
          sendResponse({ success: false, error: 'Failed to create search WebContents' });
        }
      });
      return true;
      
    case 'DESTROY_WEB_CONTENTS':
      console.log('🔵 Background: Destroying WebContents');
      destroyBackgroundWebContents();
      sendResponse({status: 'destroying'});
      break;
      
    case 'OPEN_LOGIN_TAB':
      console.log('🔵 Background: Opening login tab');
      openLoginTab();
      break;
      
    case 'USER_PROFILE':
      console.log('🔵 Background: Extracting user profile');
      
      // Add retry logic with exponential backoff for user profile extraction
      let retryCount = 0;
      const maxRetries = 10;
      
      const attemptProfileExtraction = () => {
        setTimeout(() => {
          console.log('🔵 Background: Attempting to extract user profile (attempt ' + (retryCount + 1) + ')');
          
          // First check if content script is ready
          chrome.tabs.sendMessage(webContentsId, {type: 'PING'}, function(pingResponse) {
            if (chrome.runtime.lastError) {
              console.log('🔵 Background: Content script not ready yet, retrying...');
              retryCount++;
              if (retryCount < maxRetries) {
                attemptProfileExtraction();
              } else {
                console.error('🔵 Background: Content script never became ready');
                sendResponse({ success: false, error: 'Content script not available' });
                destroyBackgroundWebContents();
              }
              return;
            }
            
            // Content script is ready, proceed with extraction
      chrome.tabs.sendMessage(webContentsId, {
        type: 'USER_PROFILE'
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('🔵 Background: Error extracting user profile:', chrome.runtime.lastError);
          sendResponse({ success: false, error: 'Failed to extract user profile' });
                destroyBackgroundWebContents();
          return;
        }
        
        console.log('🔵 Background: Received user profile:', response);
        if (response && response.success) {
          sendResponse({
            success: true,
            profile: response.profile
          });
        } else {
          sendResponse({
            success: false,
            error: response?.error || 'Failed to extract user profile'
          });
        }
              destroyBackgroundWebContents();
      });
          });
        }, 2000 + (retryCount * 1000)); // Exponential backoff: 2s, 3s, 4s
      };
      
      attemptProfileExtraction();
      return true;
      
    case 'OPEN_PRODUCT_DETAILS':
      const productUrl = message.url;
      const productPrice = message.price;
      console.log('🔵 Background: Opening product details for:', productUrl);
      
      chrome.wootz.createBackgroundWebContents(productWebContentsId, productUrl, (result) => {
        if (result.success) {
          console.log('🔵 Background: Product details WebContents created successfully');
          
          // Add retry logic with exponential backoff for product details extraction
          let retryCount = 0;
          const maxRetries = 10;
          
          const attemptProductExtraction = () => {
          setTimeout(() => {
              console.log('🔵 Background: Attempting to extract product details (attempt ' + (retryCount + 1) + ')');
              
              // First check if content script is ready
              chrome.tabs.sendMessage(productWebContentsId, {type: 'PING'}, function(pingResponse) {
                if (chrome.runtime.lastError) {
                  console.log('🔵 Background: Content script not ready yet, retrying...');
                  retryCount++;
                  if (retryCount < maxRetries) {
                    attemptProductExtraction();
                  } else {
                    console.error('🔵 Background: Content script never became ready');
                    sendResponse({ success: false, error: 'Content script not available' });
                    destroyProductWebContents();
                  }
                  return;
                }
                
                // Content script is ready, proceed with extraction
                chrome.tabs.sendMessage(productWebContentsId, {
              type: 'EXTRACT_PRODUCT_DETAILS',
              productPrice: productPrice
            }, function(response) {
              if (chrome.runtime.lastError) {
                console.error('🔵 Background: Error extracting product details:', chrome.runtime.lastError);
                sendResponse({ success: false, error: 'Failed to extract product details' });
                    destroyProductWebContents();
                return;
              }
              
              console.log('🔵 Background: Received product details:', response);
              if (response && response.success) {
                const productName = response.productDetails.name;
                
                    // Click add to cart button using content script with retry logic
                    let clickRetryCount = 0;
                    const maxClickRetries = 3;
                    
                    const attemptClickAddToCart = () => {
                setTimeout(() => {
                        console.log('🔵 Background: Attempting to click add to cart (attempt ' + (clickRetryCount + 1) + ')');
                        
                        chrome.tabs.sendMessage(productWebContentsId, {type: 'PING'}, function(pingResponse) {
                          if (chrome.runtime.lastError) {
                            console.log('🔵 Background: Content script not ready for click, retrying...');
                            clickRetryCount++;
                            if (clickRetryCount < maxClickRetries) {
                              attemptClickAddToCart();
                            } else {
                              console.error('🔵 Background: Content script never became ready for click');
                              sendResponse({
                                success: true,
                                productDetails: response.productDetails,
                                productPrice: productPrice,
                                addedToCart: false
                              });
                              destroyProductWebContents();
                            }
                            return;
                          }
                          
                          // Content script is ready, proceed with click
                          chrome.tabs.sendMessage(productWebContentsId, {
                    type: 'CLICK_ADD_TO_CART'
                  }, function(clickResponse) {
                    if (chrome.runtime.lastError) {
                      console.error('🔵 Background: Error clicking add to cart button:', chrome.runtime.lastError);
                      sendResponse({
                        success: true,
                        productDetails: response.productDetails,
                        productPrice: productPrice,
                        addedToCart: false
                      });
                              destroyProductWebContents();
                      return;
                    }
                    
                    console.log('🔵 Background: Click response:', clickResponse);
                    if (clickResponse && clickResponse.success) {
                      console.log('🔵 Background: Added to cart successfully');
                      
                      // Wait a bit for the cart to update, then open cart to check
                      setTimeout(() => {
                                // Open cart to check if product was added with retry logic
                                let cartRetryCount = 0;
                                const maxCartRetries = 3;
                                
                                const attemptCartCheck = () => {
                                  chrome.wootz.createBackgroundWebContents(cartWebContentsId, `https://m.popmart.com/${countryCode.toLowerCase()}/largeShoppingCart`, (cartResult) => {
                          if (cartResult.success) {
                            console.log('🔵 Background: Large shopping cart WebContents created successfully');
                                      
                            setTimeout(() => {
                                        console.log('🔵 Background: Attempting to check cart (attempt ' + (cartRetryCount + 1) + ')');
                                        
                                        chrome.tabs.sendMessage(cartWebContentsId, {type: 'PING'}, function(pingResponse) {
                                          if (chrome.runtime.lastError) {
                                            console.log('🔵 Background: Cart content script not ready, retrying...');
                                            cartRetryCount++;
                                            if (cartRetryCount < maxCartRetries) {
                                              attemptCartCheck();
                                            } else {
                                              console.error('🔵 Background: Cart content script never became ready');
                                              sendResponse({ 
                                                success: true, 
                                                productDetails: response.productDetails,
                                                productPrice: productPrice,
                                                addedToCart: false,
                                                cartCheck: false
                                              });
                                              destroyCartWebContents();
                                              destroyProductWebContents();
                                            }
                                            return;
                                          }
                                          
                                          // Cart content script is ready, proceed with check
                                          chrome.tabs.sendMessage(cartWebContentsId, {
                                type: 'CHECK_PRODUCT_IN_CART',
                                productName: productName
                              }, function(cartResponse) {
                                if (chrome.runtime.lastError) {
                                  console.error('🔵 Background: Error checking product in cart:', chrome.runtime.lastError);
                                  sendResponse({ 
                                    success: true, 
                                    productDetails: response.productDetails,
                                    productPrice: productPrice,
                                    addedToCart: false,
                                    cartCheck: false
                                  });
                                              destroyCartWebContents();
                                              destroyProductWebContents();
                                  return;
                                }
                                
                                console.log('🔵 Background: Received cart check response:', cartResponse);
                                const finalResponse = {
                                  success: true,
                                  productDetails: response.productDetails,
                                  productPrice: productPrice,
                                  addedToCart: cartResponse && cartResponse.inCart,
                                  cartCheck: cartResponse && cartResponse.success,
                                  inCart: cartResponse && cartResponse.inCart
                                };
                                
                                // Add to cart storage if successfully added
                                if (cartResponse && cartResponse.inCart) {
                                  addToCartStorage(response.productDetails, productPrice);
                                }
                                
                                sendResponse(finalResponse);
                                            destroyCartWebContents();
                                            destroyProductWebContents();
                                          });
                              });
                            }, 3000);
                          } else {
                            console.log('🔵 Background: Failed to create large shopping cart WebContents');
                            sendResponse({
                              success: true,
                              productDetails: response.productDetails,
                              productPrice: productPrice,
                              addedToCart: false,
                              cartCheck: false
                            });
                                      destroyProductWebContents();
                          }
                        });
                                };
                                
                                attemptCartCheck();
                      }, 2000);
                    } else {
                      console.log('🔵 Background: Failed to add to cart');
                      
                      // Add to waitlist if failed to add to cart
                      addToWaitlistStorage(response.productDetails, productPrice);
                      
                      // Start automatic retry process
                      startRetryProcess(response.productDetails, productPrice);
                      
                      sendResponse({
                        success: true,
                        productDetails: response.productDetails,
                        productPrice: productPrice,
                        addedToCart: false
                      });
                              destroyProductWebContents();
                    }
                          });
                  });
                }, 2000);
                    };
                    
                    attemptClickAddToCart();
              } else {
                sendResponse({
                  success: false,
                  error: response?.error || 'No product details found'
                });
                    destroyProductWebContents();
                  }
                });
              });
            }, 5000 + (retryCount * 1000)); // Exponential backoff: 5s, 6s, 7s
          };
          
          attemptProductExtraction();
        } else {
          console.log('🔵 Background: Failed to create product details WebContents');
          sendResponse({ success: false, error: 'Failed to create product details WebContents' });
        }
      });
      return true;
      
    case 'LOGOUT':
      console.log('🔵 Background: User logged out');
      clearAuthState();
      stopPeriodicAuthValidation();
      stopBackgroundPeriodicCheck();
      destroyBackgroundWebContents();
      sendResponse({success: true});
      break;
       
    case 'LOAD_CART_PRODUCTS':
      console.log('🔵 Background: Loading cart products');
      loadCartProductsWithWebContents(sendResponse);
      return true;
      
    case 'LOAD_WAITLIST_PRODUCTS':
      console.log('🔵 Background: Loading waitlist products');
      loadWaitlistProducts(sendResponse);
      return true;
      
    case 'REMOVE_FROM_CART':
      console.log('🔵 Background: Removing from cart:', message.productId);
      removeFromCart(message.productId, sendResponse);
      return true;
      
    case 'REMOVE_FROM_WAITLIST':
      console.log('🔵 Background: Removing from waitlist:', message.productId);
      removeFromWaitlist(message.productId, sendResponse);
      return true;
  }
});


function addToCartStorage(productDetails, price) {
  const product = {
    id: Date.now().toString(),
    name: productDetails.name,
    image: productDetails.image,
    price: price,
    url: productDetails.url,
    addedAt: new Date().toISOString()
  };
  
  chrome.storage.local.get(['cartProducts'], (result) => {
    const cartProducts = result.cartProducts || [];
    cartProducts.push(product);
    chrome.storage.local.set({ cartProducts }, () => {
      console.log('🔵 Background: Product added to cart storage:', product);
    });
  });
}

function addToWaitlistStorage(productDetails, price) {
  const product = {
    id: Date.now().toString(),
    name: productDetails.name,
    image: productDetails.image,
    price: price,
    url: productDetails.url,
    addedAt: new Date().toISOString()
  };
  
  chrome.storage.local.get(['waitlistProducts'], (result) => {
    const waitlistProducts = result.waitlistProducts || [];
    waitlistProducts.push(product);
    chrome.storage.local.set({ waitlistProducts }, () => {
      console.log('🔵 Background: Product added to waitlist storage:', product);
    });
  });
}

function loadCartProducts(sendResponse) {
  chrome.storage.local.get(['cartProducts'], (result) => {
    const cartProducts = result.cartProducts || [];
    console.log('🔵 Background: Loaded cart products:', cartProducts);
    sendResponse({
      success: true,
      products: cartProducts
    });
  });
}

function loadCartProductsWithWebContents(sendResponse) {
  console.log('🔵 Background: Loading cart products with WebContents');
  
  chrome.storage.local.get(['cartProducts'], (result) => {
    const storedCartProducts = result.cartProducts || [];
    console.log('🔵 Background: Stored cart products:', storedCartProducts);
    
    const cartUrl = `https://m.popmart.com/${countryCode.toLowerCase()}/largeShoppingCart`;
    
    chrome.wootz.createBackgroundWebContents(cartWebContentsId, cartUrl, (result) => {
      if (result.success) {
        console.log('🔵 Background: Cart WebContents created successfully');
        
        // Add retry logic with exponential backoff for cart extraction
        let retryCount = 0;
        const maxRetries = 10;
        
        const attemptCartExtraction = () => {
        setTimeout(() => {
            console.log('🔵 Background: Attempting to extract cart products (attempt ' + (retryCount + 1) + ')');
            
            // First check if content script is ready
            chrome.tabs.sendMessage(cartWebContentsId, {type: 'PING'}, function(pingResponse) {
              if (chrome.runtime.lastError) {
                console.log('🔵 Background: Content script not ready yet, retrying...');
                retryCount++;
                if (retryCount < maxRetries) {
                  attemptCartExtraction();
                } else {
                  console.error('🔵 Background: Content script never became ready');
                  // Fallback to stored products
                  sendResponse({
                    success: true,
                    products: storedCartProducts
                  });
                  destroyCartWebContents();
                }
                return;
              }
              
              // Content script is ready, proceed with extraction
              chrome.tabs.sendMessage(cartWebContentsId, {
            type: 'EXTRACT_CART_PRODUCTS'
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('🔵 Background: Error extracting cart products:', chrome.runtime.lastError);
              // Fallback to stored products
              sendResponse({
                success: true,
                products: storedCartProducts
              });
                  destroyCartWebContents();
              return;
            }
            
            console.log('🔵 Background: Received cart products from WebContents:', response);
            if (response && response.success) {
              const freshProducts = response.products || [];
              const mergedProducts = mergeCartProducts(storedCartProducts, freshProducts);
              
              chrome.storage.local.set({ cartProducts: mergedProducts }, () => {
                console.log('🔵 Background: Updated cart storage with fresh data');
              });
              
              sendResponse({
                success: true,
                products: mergedProducts
              });
            } else {
              sendResponse({
                success: true,
                products: storedCartProducts
              });
            }
                destroyCartWebContents();
              });
            });
          }, 3000 + (retryCount * 1000)); // Exponential backoff: 3s, 4s, 5s
        };
        
        attemptCartExtraction();
      } else {
        console.log('🔵 Background: Failed to create cart WebContents, using stored data');
        sendResponse({
          success: true,
          products: storedCartProducts
        });
      }
    });
  });
}

function mergeCartProducts(storedProducts, freshProducts) {
  const storedMap = new Map();
  storedProducts.forEach(product => {
    storedMap.set(product.url, product);
  });
  
  const merged = freshProducts.map(freshProduct => {
    const storedProduct = storedMap.get(freshProduct.url);
    if (storedProduct) {
      return {
        ...storedProduct,
        name: freshProduct.name || storedProduct.name,
        price: freshProduct.price || storedProduct.price,
        image: freshProduct.image || storedProduct.image
      };
    }
    return freshProduct;
  });
  
  freshProducts.forEach(product => {
    storedMap.delete(product.url);
  });
  
  storedMap.forEach(product => {
    merged.push(product);
  });
  
  return merged;
}

function loadWaitlistProducts(sendResponse) {
  chrome.storage.local.get(['waitlistProducts'], (result) => {
    const waitlistProducts = result.waitlistProducts || [];
    console.log('🔵 Background: Loaded waitlist products:', waitlistProducts);
    sendResponse({
      success: true,
      products: waitlistProducts
    });
  });
}

function removeFromCart(productId, sendResponse) {
  chrome.storage.local.get(['cartProducts'], (result) => {
    const cartProducts = result.cartProducts || [];
    const updatedCart = cartProducts.filter(p => p.id !== productId);
    chrome.storage.local.set({ cartProducts: updatedCart }, () => {
      console.log('🔵 Background: Product removed from cart:', productId);
      sendResponse({ success: true });
    });
  });
}

function removeFromWaitlist(productId, sendResponse) {
  chrome.storage.local.get(['waitlistProducts'], (result) => {
    const waitlistProducts = result.waitlistProducts || [];
    const updatedWaitlist = waitlistProducts.filter(p => p.id !== productId);
    chrome.storage.local.set({ waitlistProducts: updatedWaitlist }, () => {
      console.log('🔵 Background: Product removed from waitlist:', productId);

      stopRetryProcess(productId);
      
      sendResponse({ success: true });
    });
  });
}

function startRetryProcess(productDetails, productPrice) {
  const productId = productDetails.url;
  
  stopRetryProcess(productId);
  
  console.log('🔵 Background: Starting retry process for product:', productDetails.name);
  
  const intervalId = setInterval(() => {
    addToRetryQueue(productDetails, productPrice, productId);
  }, 60000);
  
  retryIntervals.set(productId, intervalId);
  
  setTimeout(() => {
    addToRetryQueue(productDetails, productPrice, productId);
  }, 60000);
}

function addToRetryQueue(productDetails, productPrice, productId) {
  const existingIndex = retryQueue.findIndex(item => item.productId === productId);
  if (existingIndex !== -1) {
    console.log('🔵 Background: Product already in retry queue:', productDetails.name);
    return;
  }
  
  retryQueue.push({
    productDetails,
    productPrice,
    productId
  });
  
  console.log('🔵 Background: Added to retry queue:', productDetails.name, 'Queue length:', retryQueue.length);
  
  if (!isRetryInProgress) {
    processRetryQueue();
  }
}

function processRetryQueue() {
  if (retryQueue.length === 0) {
    isRetryInProgress = false;
    console.log('🔵 Background: Retry queue empty, stopping processing');
    return;
  }
  
  if (isRetryInProgress) {
    console.log('🔵 Background: Retry already in progress, skipping');
    return;
  }
  
  isRetryInProgress = true;
  const nextProduct = retryQueue.shift();
  
  console.log('🔵 Background: Processing retry for product:', nextProduct.productDetails.name);
  retryAddToCart(nextProduct.productDetails, nextProduct.productPrice, nextProduct.productId);
}

function stopRetryProcess(productId) {
  const intervalId = retryIntervals.get(productId);
  if (intervalId) {
    clearInterval(intervalId);
    retryIntervals.delete(productId);
    console.log('🔵 Background: Stopped retry process for product:', productId);
  }
  
  retryQueue = retryQueue.filter(item => item.productId !== productId);
}

async function retryAddToCart(productDetails, productPrice, productId) {
  console.log('🔵 Background: Retrying add to cart for product:', productDetails.name);
  
  try {
    chrome.wootz.createBackgroundWebContents(retryWebContentsId, productDetails.url, (result) => {
      if (result.success) {
        console.log('🔵 Background: Retry WebContents created successfully for product:', productDetails.name);
        
        // Add retry logic with exponential backoff for retry click
        let retryCount = 0;
        const maxRetries = 10;
        
        const attemptRetryClick = () => {
        setTimeout(() => {
            console.log('🔵 Background: Attempting to click add to cart in retry (attempt ' + (retryCount + 1) + ')');
            
            // First check if content script is ready
            chrome.tabs.sendMessage(retryWebContentsId, {type: 'PING'}, function(pingResponse) {
              if (chrome.runtime.lastError) {
                console.log('🔵 Background: Content script not ready for retry click, retrying...');
                retryCount++;
                if (retryCount < maxRetries) {
                  attemptRetryClick();
                } else {
                  console.error('🔵 Background: Content script never became ready for retry click');
                  destroyRetryWebContents();
                  processNextInQueue();
                }
                return;
              }
              
              // Content script is ready, proceed with click
          chrome.tabs.sendMessage(retryWebContentsId, {
            type: 'CLICK_ADD_TO_CART'
          }, function(clickResponse) {
            if (chrome.runtime.lastError) {
              console.error('🔵 Background: Error clicking add to cart in retry:', chrome.runtime.lastError);
              destroyRetryWebContents();
              processNextInQueue();
              return;
            }
            
            console.log('🔵 Background: Retry click response:', clickResponse);
            if (clickResponse && clickResponse.success) {
              console.log('🔵 Background: Retry click successful, checking cart...');
              
                  // Check cart with retry logic
              setTimeout(() => {
                    let cartRetryCount = 0;
                    const maxCartRetries = 10;
                    
                    const attemptCartCheck = () => {
                      chrome.wootz.createBackgroundWebContents(cartWebContentsId, `https://m.popmart.com/${countryCode.toLowerCase()}/largeShoppingCart`, (cartResult) => {
                  if (cartResult.success) {
                    console.log('🔵 Background: Retry cart WebContents created successfully');
                          
                    setTimeout(() => {
                            console.log('🔵 Background: Attempting to check cart in retry (attempt ' + (cartRetryCount + 1) + ')');
                            
                            // First check if cart content script is ready
                            chrome.tabs.sendMessage(cartWebContentsId, {type: 'PING'}, function(pingResponse) {
                              if (chrome.runtime.lastError) {
                                console.log('🔵 Background: Cart content script not ready for retry, retrying...');
                                cartRetryCount++;
                                if (cartRetryCount < maxCartRetries) {
                                  attemptCartCheck();
                                } else {
                                  console.error('🔵 Background: Cart content script never became ready for retry');
                                  destroyRetryWebContents();
                                  processNextInQueue();
                                }
                                return;
                              }
                              
                              // Cart content script is ready, proceed with check
                              chrome.tabs.sendMessage(cartWebContentsId, {
                        type: 'CHECK_PRODUCT_IN_CART',
                        productName: productDetails.name
                      }, function(cartResponse) {
                        if (chrome.runtime.lastError) {
                          console.error('🔵 Background: Error checking cart in retry:', chrome.runtime.lastError);
                          destroyRetryWebContents();
                          processNextInQueue();
                          return;
                        }
                        
                        console.log('🔵 Background: Retry cart check response:', cartResponse);
                        if (cartResponse && cartResponse.inCart) {
                          console.log('🔵 Background: Product successfully added to cart in retry!');
                          
                          moveFromWaitlistToCart(productDetails, productPrice);
                          
                          stopRetryProcess(productId);
                          
                          chrome.runtime.sendMessage({
                            type: 'RETRY_SUCCESS',
                            productName: productDetails.name
                          });
                        } else {
                          console.log('🔵 Background: Product still not in cart, will retry again');
                        }
                        
                        destroyRetryWebContents();
                        processNextInQueue();
                              });
                      });
                    }, 3000);
                  } else {
                    console.log('🔵 Background: Failed to create retry cart WebContents');
                    destroyRetryWebContents();
                    processNextInQueue();
                  }
                });
                    };
                    
                    attemptCartCheck();
              }, 2000);
            } else {
              console.log('🔵 Background: Retry click failed');
              destroyRetryWebContents();
              processNextInQueue();
            }
          });
            });
          }, 5000 + (retryCount * 1000)); // Exponential backoff: 5s, 6s, 7s
        };
        
        attemptRetryClick();
      } else {
        console.log('🔵 Background: Failed to create retry WebContents');
        processNextInQueue();
      }
    });
  } catch (error) {
    console.error('🔵 Background: Error in retry add to cart:', error);
    processNextInQueue();
  }
}

function processNextInQueue() {
  isRetryInProgress = false;
  console.log('🔵 Background: Current retry completed, processing next in queue');
  
  setTimeout(() => {
    processRetryQueue();
  }, 2000);
}

function moveFromWaitlistToCart(productDetails, productPrice) {
  chrome.storage.local.get(['waitlistProducts', 'cartProducts'], (result) => {
    const waitlistProducts = result.waitlistProducts || [];
    const cartProducts = result.cartProducts || [];
    
    const updatedWaitlist = waitlistProducts.filter(p => p.url !== productDetails.url);
    
    const cartProduct = {
      id: Date.now().toString(),
      name: productDetails.name,
      image: productDetails.image,
      price: productPrice,
      url: productDetails.url,
      addedAt: new Date().toISOString()
    };
    
    const updatedCart = [...cartProducts, cartProduct];
    
    chrome.storage.local.set({ 
      waitlistProducts: updatedWaitlist,
      cartProducts: updatedCart 
    }, () => {
      console.log('🔵 Background: Product moved from waitlist to cart:', productDetails.name);
    });
  });
}

function destroyRetryWebContents() {
  chrome.wootz.destroyBackgroundWebContents(retryWebContentsId, (result) => {
    if (result.success) {
      console.log('🔵 Background: Retry WebContents destroyed');
    }
  });
}

function destroySearchWebContents() {
  chrome.wootz.destroyBackgroundWebContents(searchWebContentsId, (result) => {
    if (result.success) {
      console.log('🔵 Background: Search WebContents destroyed');
    }
  });
}

function destroyProductWebContents() {
  chrome.wootz.destroyBackgroundWebContents(productWebContentsId, (result) => {
    if (result.success) {
      console.log('🔵 Background: Product WebContents destroyed');
    }
  });
}

function destroyCartWebContents() {
  chrome.wootz.destroyBackgroundWebContents(cartWebContentsId, (result) => {
    if (result.success) {
      console.log('🔵 Background: Cart WebContents destroyed');
    }
  });
}
