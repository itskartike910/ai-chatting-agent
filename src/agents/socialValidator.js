
import { MultiLLMService } from '../services/multiLLM.js';

export class SocialValidatorAgent {
  constructor(config) {
    this.config = config;
    this.llmService = new MultiLLMService();
  }

  async validateResults(plan, results) {
    try {
      // Basic validation
      const basicValidation = this.performBasicValidation(plan, results);
      
      // AI-enhanced validation if available
      if (this.config.anthropicApiKey || this.config.openaiApiKey) {
        return await this.aiEnhancedValidation(plan, results, basicValidation);
      }
      
      return basicValidation;
    } catch (error) {
      return {
        success: false,
        summary: `Validation failed: ${error.message}`,
        details: []
      };
    }
  }

  performBasicValidation(plan, results) {
    const successfulActions = results.filter(r => r.success);
    const failedActions = results.filter(r => !r.success);
    
    const success = successfulActions.length > failedActions.length;
    
    let summary = '';
    if (success) {
      summary = `✅ Task completed successfully! ${successfulActions.length}/${results.length} actions succeeded.`;
    } else {
      summary = `⚠️ Task completed with issues. ${failedActions.length}/${results.length} actions failed.`;
    }

    return {
      success: success,
      summary: summary,
      details: results.map(r => ({
        action: r.action?.description || 'Unknown action',
        success: r.success,
        message: r.message || r.error || 'No details'
      }))
    };
  }

  async aiEnhancedValidation(plan, results, basicValidation) {
    try {
      const systemPrompt = `
You are a social media task validator. Analyze the execution results and provide validation.

Original plan: ${JSON.stringify(plan)}
Execution results: ${JSON.stringify(results)}
Basic validation: ${JSON.stringify(basicValidation)}

Evaluate:
1. Were the actions executed successfully?
2. Did the task achieve its intended goal?
3. Are there any issues or concerns?
4. What was the final outcome?

Provide a comprehensive validation summary.

Return JSON: { "success": boolean, "summary": "detailed summary", "confidence": number }
      `;

      const llmModel = await this.getLLMModel();
      const response = await llmModel.call([
        { role: 'user', content: systemPrompt }
      ]);
      
      const aiValidation = JSON.parse(response);
      
      return {
        success: aiValidation.success,
        summary: aiValidation.summary,
        confidence: aiValidation.confidence,
        details: basicValidation.details,
        aiEnhanced: true
      };
    } catch (error) {
      console.error('AI validation failed, using basic validation:', error);
      return basicValidation;
    }
  }

  async getLLMModel() {
    if (this.config.anthropicApiKey) {
      return await this.llmService.createAnthropicModel(
        this.config.anthropicApiKey,
        this.config.validatorModel || 'claude-3-sonnet-20240229'
      );
    } else if (this.config.openaiApiKey) {
      return await this.llmService.createOpenAIModel(
        this.config.openaiApiKey,
        this.config.validatorModel || 'gpt-4'
      );
    }
    throw new Error('No AI API key configured');
  }
}