import { SocialNavigatorAgent } from './socialNavigator.js';
import { SocialPlannerAgent } from './socialPlanner.js';
import { SocialValidatorAgent } from './socialValidator.js';
import { MessageManager } from '../services/messageManager.js';

export class SocialExecutor {
  constructor(config, port = null) {
    this.config = config;
    this.port = port;
    this.messageManager = new MessageManager();
    
    // Initialize agents
    this.navigator = new SocialNavigatorAgent(config);
    this.planner = new SocialPlannerAgent(config);
    this.validator = new SocialValidatorAgent(config);
    
    this.isExecuting = false;
    this.currentTask = null;
    this.executionHistory = [];
  }

  async executeTask(userPrompt) {
    if (this.isExecuting) {
      throw new Error('Another task is already executing');
    }

    this.isExecuting = true;
    this.currentTask = {
      prompt: userPrompt,
      status: 'planning',
      startTime: Date.now(),
      steps: []
    };

    try {
      this.sendStatusUpdate('🤔 Planning your social media task...');

      // 1. Planning Phase
      const plan = await this.planner.planTask(userPrompt, this.getContext());
      this.currentTask.plan = plan;
      this.currentTask.status = 'executing';
      
      this.sendStatusUpdate(`🚀 Executing plan with ${plan.actions.length} steps...`);

      // 2. Execution Phase
      const results = [];
      for (let i = 0; i < plan.actions.length; i++) {
        const action = plan.actions[i];
        
        this.sendStatusUpdate(`📋 Step ${i + 1}/${plan.actions.length}: ${action.description}`);
        
        try {
          const result = await this.navigator.executeAction(action);
          results.push(result);
          
          this.currentTask.steps.push({
            action: action,
            result: result,
            timestamp: Date.now()
          });

          // Human-like delay between actions
          if (i < plan.actions.length - 1) {
            await this.delay(1000 + Math.random() * 2000);
          }
        } catch (error) {
          console.error(`Error executing action ${i + 1}:`, error);
          results.push({
            success: false,
            error: error.message,
            action: action
          });
        }
      }

      // 3. Validation Phase
      this.currentTask.status = 'validating';
      this.sendStatusUpdate('✅ Validating results...');
      
      const validation = await this.validator.validateResults(plan, results);
      
      this.currentTask.status = validation.success ? 'completed' : 'failed';
      this.currentTask.endTime = Date.now();
      this.currentTask.validation = validation;

      // Store in history
      this.executionHistory.push({ ...this.currentTask });

      this.sendStatusUpdate(
        validation.success ? '🎉 Task completed successfully!' : '⚠️ Task completed with some issues'
      );

      return {
        success: validation.success,
        response: validation.summary,
        actions: results,
        executionTime: this.currentTask.endTime - this.currentTask.startTime
      };

    } catch (error) {
      this.currentTask.status = 'error';
      this.currentTask.error = error.message;
      this.currentTask.endTime = Date.now();
      
      this.sendStatusUpdate(`❌ Error: ${error.message}`);
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  sendStatusUpdate(message) {
    if (this.port) {
      this.port.postMessage({
        type: 'status_update',
        message: message,
        task: this.currentTask
      });
    }
  }

  getContext() {
    return {
      currentUrl: 'https://x.com',
      isLoggedIn: false,
      executionHistory: this.executionHistory.slice(-3)
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}