export class AIPageAnalyzer {
  constructor(llmService) {
    this.llmService = llmService;
  }

  async analyzeCurrentPage(domTree, goal) {
    try {
      const analysisPrompt = `
You are a web page analyzer for browser automation. Analyze the current page state and determine the best actions to achieve the user's goal.

Current page DOM structure (key interactive elements):
${JSON.stringify(domTree?.interactiveElements?.slice(0, 20) || [], null, 2)}

User's goal: "${goal}"

Current page info:
- URL: ${domTree?.url || 'unknown'}
- Title: ${domTree?.title || 'unknown'}
- Has login form: ${this.hasLoginElements(domTree)}
- Has compose form: ${this.hasComposeElements(domTree)}

Based on the page state and user goal, determine the next actions needed:

Respond with JSON:
{
  "currentPageType": "login|compose|home|profile|unknown",
  "canAchieveGoal": boolean,
  "nextActions": [
    {
      "type": "click|fill|navigate|wait",
      "target": "element_index_or_url",
      "value": "text_to_fill_if_applicable",
      "description": "what this action does"
    }
  ],
  "needsNavigation": boolean,
  "navigationUrl": "url_if_needed",
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}
`;

      const response = await this.llmService.call([
        { role: 'user', content: analysisPrompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('AI page analysis failed:', error);
      return this.fallbackPageAnalysis(domTree, goal);
    }
  }

  hasLoginElements(domTree) {
    if (!domTree?.interactiveElements) return false;
    return domTree.interactiveElements.some(el => 
      el.type === 'input' && (el.placeholder?.includes('email') || el.placeholder?.includes('username'))
    );
  }

  hasComposeElements(domTree) {
    if (!domTree?.interactiveElements) return false;
    return domTree.interactiveElements.some(el => 
      el.placeholder?.includes('tweet') || el.placeholder?.includes('What') || 
      el.testId === 'tweetTextarea_0'
    );
  }

  fallbackPageAnalysis(domTree, goal) {
    const url = domTree?.url || '';
    
    if (url.includes('login')) {
      return {
        currentPageType: 'login',
        canAchieveGoal: goal.toLowerCase().includes('login'),
        nextActions: [
          {
            type: 'fill',
            target: 'input[name="text"]',
            description: 'Fill username/email'
          }
        ],
        confidence: 0.6,
        reasoning: 'Detected login page by URL'
      };
    }
    
    if (url.includes('compose') || url.includes('tweet')) {
      return {
        currentPageType: 'compose',
        canAchieveGoal: goal.toLowerCase().includes('post') || goal.toLowerCase().includes('tweet'),
        nextActions: [
          {
            type: 'fill',
            target: '[data-testid="tweetTextarea_0"]',
            description: 'Fill tweet content'
          }
        ],
        confidence: 0.7,
        reasoning: 'Detected compose page by URL'
      };
    }
    
    return {
      currentPageType: 'unknown',
      canAchieveGoal: false,
      needsNavigation: true,
      confidence: 0.3,
      reasoning: 'Unknown page, fallback analysis'
    };
  }
}