export class AITaskRouter {
  constructor(llmService) {
    this.llmService = llmService;
  }

  async analyzeAndRoute(userMessage, currentContext = {}) {
    try {
      const analysisPrompt = `
You are an intelligent task router for a social media automation system. Analyze the user's message and determine what actions should be taken.

User message: "${userMessage}"

Current context:
- Current URL: ${currentContext.url || 'unknown'}
- Is logged in: ${currentContext.isLoggedIn || false}
- Available actions: chat, navigate, post_content, login, general_automation

Based on the user's message, determine:
1. Intent: What does the user want to accomplish?
2. Actions: What specific actions need to be taken?
3. Content: Any content that needs to be generated or used?
4. Requirements: Prerequisites needed (login, navigation, etc.)

Respond with JSON in this format:
{
  "intent": "chat|social_action|automation",
  "actionType": "chat|post_tweet|login|navigate|fill_form|click_element",
  "needsLogin": boolean,
  "needsNavigation": boolean,
  "targetUrl": "url if navigation needed",
  "content": "content to post/fill if applicable",
  "needsContentGeneration": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "explanation of decision"
}

Examples:
- "Hello" → {"intent": "chat", "actionType": "chat", ...}
- "Post a tweet about AI" → {"intent": "social_action", "actionType": "post_tweet", "needsLogin": true, "needsNavigation": true, "targetUrl": "https://x.com/compose/post", "needsContentGeneration": true, ...}
- "What's the weather?" → {"intent": "chat", "actionType": "chat", ...}
- "Login to X" → {"intent": "social_action", "actionType": "login", "needsLogin": true, "targetUrl": "https://x.com/i/flow/login", ...}
`;

      const response = await this.llmService.call([
        { role: 'user', content: analysisPrompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('AI routing failed:', error);
      // Fallback to simple keyword detection
      return this.fallbackRouting(userMessage);
    }
  }

  fallbackRouting(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('post') || message.includes('tweet') || message.includes('share')) {
      return {
        intent: 'social_action',
        actionType: 'post_tweet',
        needsLogin: true,
        needsNavigation: true,
        targetUrl: 'https://x.com/compose/post',
        needsContentGeneration: !this.extractQuotedContent(userMessage),
        confidence: 0.7,
        reasoning: 'Fallback keyword detection for posting'
      };
    }
    
    if (message.includes('login')) {
      return {
        intent: 'social_action',
        actionType: 'login',
        needsLogin: true,
        targetUrl: 'https://x.com/i/flow/login',
        confidence: 0.8,
        reasoning: 'Fallback keyword detection for login'
      };
    }
    
    return {
      intent: 'chat',
      actionType: 'chat',
      confidence: 0.6,
      reasoning: 'Fallback to chat - no action keywords detected'
    };
  }

  extractQuotedContent(text) {
    const match = text.match(/"([^"]+)"/);
    return match ? match[1] : null;
  }
}