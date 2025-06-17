import { MultiLLMService } from '../services/multiLLM.js';

export class SocialPlannerAgent {
  constructor(config) {
    this.config = config;
    this.llmService = new MultiLLMService();
  }

  async planTask(userPrompt, context) {
    // Analyze the user prompt to determine the required actions
    const plan = this.analyzePlan(userPrompt, context);
    
    // If AI planning is available, enhance with AI
    if (this.config.anthropicApiKey || this.config.openaiApiKey) {
      return await this.aiEnhancedPlanning(userPrompt, plan, context);
    }
    
    return plan;
  }

  analyzePlan(userPrompt, context) {
    const prompt = userPrompt.toLowerCase();
    const actions = [];

    // Check if login is needed
    if (!context.isLoggedIn) {
      actions.push({
        type: 'LOGIN',
        description: 'Log into X account',
        params: {}
      });
    }

    // Determine content actions
    if (prompt.includes('post') || prompt.includes('tweet') || prompt.includes('share')) {
      // Extract content or generate it
      let content = this.extractContent(userPrompt);
      
      if (!content) {
        content = '[AI Generated Content]';
      }

      // Add posting actions
      actions.push(
        {
          type: 'NAVIGATE_TO_COMPOSE',
          description: 'Navigate to post compose page',
          params: {}
        },
        {
          type: 'FILL_CONTENT',
          description: 'Fill post content',
          params: { text: content }
        },
        {
          type: 'WAIT',
          description: 'Wait before posting',
          params: { duration: 2000 }
        },
        {
          type: 'CLICK_POST_BUTTON',
          description: 'Click post button',
          params: {}
        }
      );
    }

    // Handle engagement actions
    if (prompt.includes('like') || prompt.includes('follow') || prompt.includes('retweet')) {
      actions.push({
        type: 'SCROLL_DOWN',
        description: 'Scroll to find content',
        params: {}
      });
    }

    return {
      success: true,
      actions: actions,
      estimatedTime: actions.length * 3000
    };
  }

  async aiEnhancedPlanning(userPrompt, basePlan, context) {
    try {
      const systemPrompt = `
You are a social media automation planner. Analyze the user request and create a detailed action plan.

Available actions:
- LOGIN: Log into X account
- POST_CONTENT: Create and post content
- NAVIGATE_TO_COMPOSE: Navigate to compose page
- FILL_CONTENT: Fill post content
- CLICK_POST_BUTTON: Submit the post
- WAIT: Wait for a specified duration
- SCROLL_DOWN: Scroll down the page
- CLICK_ELEMENT: Click on specific elements

User request: "${userPrompt}"
Current context: ${JSON.stringify(context)}
Base plan: ${JSON.stringify(basePlan)}

Provide an improved step-by-step plan. Consider:
1. Login requirements
2. Content generation needs
3. Proper timing between actions
4. User safety and platform compliance

Return a JSON object with: { "actions": [...], "reasoning": "...", "estimatedTime": number }
      `;

      const llmModel = await this.getLLMModel();
      const response = await llmModel.call([
        { role: 'user', content: systemPrompt }
      ]);
      
      const aiPlan = JSON.parse(response);
      
      return {
        success: true,
        actions: aiPlan.actions || basePlan.actions,
        reasoning: aiPlan.reasoning,
        estimatedTime: aiPlan.estimatedTime || basePlan.estimatedTime,
        aiEnhanced: true
      };
    } catch (error) {
      console.error('AI planning failed, using base plan:', error);
      return basePlan;
    }
  }

  async getLLMModel() {
    if (this.config.anthropicApiKey) {
      return await this.llmService.createAnthropicModel(
        this.config.anthropicApiKey,
        this.config.plannerModel || 'claude-3-sonnet-20240229'
      );
    } else if (this.config.openaiApiKey) {
      return await this.llmService.createOpenAIModel(
        this.config.openaiApiKey,
        this.config.plannerModel || 'gpt-4'
      );
    }
    throw new Error('No AI API key configured');
  }

  extractContent(prompt) {
    // Simple extraction logic - look for quoted content
    const match = prompt.match(/"([^"]+)"/);
    if (match) return match[1];
    
    // Look for "about" keyword
    const aboutMatch = prompt.match(/about (.+)/i);
    if (aboutMatch) return null; // Needs generation
    
    return null;
  }
}