export class AITaskRouter {
  constructor(llmService) {
    this.llmService = llmService;
  }

  async analyzeAndRoute(userMessage, currentState = {}) {
    // Store userMessage for use in fallback methods.
    this.userMessage = userMessage;

    console.log('[AITaskRouter] userMessage:', userMessage,
      'currentState:', currentState
    );

    try {
      const interactiveElements = currentState.interactiveElements || [];
      const hasElements = interactiveElements.length > 0;
      const elementsSummary = hasElements
        ? this.formatElementsForContext(this.selectRelevantElements(interactiveElements, userMessage, 25))
        : 'None (chrome-native or blank page)';

      const rawText = (currentState.extractedContent || '').trim();
      const pageTextSection = rawText.length > 0
        ? `\n# **PAGE TEXT CONTEXT**\n${rawText.substring(0, 800)}\n`
        : '';

      const intelligentPrompt = `# You are an AI Browser Automation & Chat Agent.
Classify the user request as either CHAT (general conversation, questions, explanations, greetings) or WEB_AUTOMATION (browser tasks, searching, clicking, typing, navigating, data extraction), then provide the appropriate response.

# **USER MESSAGE**
"${userMessage}"

# **CURRENT PAGE STATE**
- URL: ${currentState.pageInfo?.url || 'unknown'}
- Platform: ${this.detectPlatformFromUrl(currentState.pageInfo?.url)}
- Page Title: ${currentState.pageInfo?.title || 'unknown'}
- Elements Count: ${interactiveElements.length}
- Interactive Elements:
${elementsSummary}
${pageTextSection}
# **RESPONSE DELIMITER FORMAT (MANDATORY)**
===CLASSIFICATION_START===
INTENT: CHAT|WEB_AUTOMATION
CONFIDENCE: 0.0-1.0
REASONING: Brief rationale for classification
===CLASSIFICATION_END===
===RESPONSE_START===
For CHAT: Provide your helpful markdown answer directly.
For WEB_AUTOMATION: Provide a JSON action plan:
{
  "observation": "Analysis of current page state and requirements",
  "strategy": "Step-by-step strategy",
  "done": false,
  "next_action": "navigate|click|type|scroll|wait|complete",
  "direct_url": "https://closest-target-url OR null if already on page",
  "index": 12,
  "selector": "optional CSS selector",
  "text": "text to type if typing",
  "direction": "down",
  "amount": 500,
  "requires_auth": false,
  "navigation_needed": true
}
===RESPONSE_END===`;

      const response = await this.llmService.call([
        { role: 'user', content: intelligentPrompt }
      ], { maxTokens: 4000 });

      console.log('[AITaskRouter] LLM response:', response);

      const responseText = typeof response === 'string' ? response : response.text;
      const usage = typeof response === 'object' && response.usage ? response.usage : null;

      const result = this.parseDelimitedResponse(responseText);

      if (usage) {
        result.usage = usage;
      }

      console.log('🎯 Intelligent classification result:', {
        intent: result.intent,
        confidence: result.confidence,
        reasoning: result.reasoning
      });

      return result;

    } catch (error) {
      console.error('Intelligent routing failed:', error);
      throw error;
    }
  }

  detectPlatformFromUrl(url) {
    if (!url) return 'unknown';
    const urlLower = url.toLowerCase();

    if (urlLower.includes('x.com') || urlLower.includes('twitter.com')) return 'twitter';
    if (urlLower.includes('youtube.com')) return 'youtube';
    if (urlLower.includes('amazon.')) return 'amazon';
    if (urlLower.includes('flipkart.')) return 'flipkart';
    if (urlLower.includes('linkedin.com')) return 'linkedin';
    if (urlLower.includes('instagram.com')) return 'instagram';
    if (urlLower.includes('google.com')) return 'google';
    if (urlLower.includes('facebook.com')) return 'facebook';
    if (urlLower.includes('pinterest.com')) return 'pinterest';
    if (urlLower.includes('tiktok.com')) return 'tiktok';
    if (urlLower.includes('reddit.com')) return 'reddit';
    if (urlLower.includes('quora.com')) return 'quora';
    if (urlLower.includes('medium.com')) return 'medium';
    if (urlLower.includes('dev.to')) return 'dev.to';
    if (urlLower.includes('hashnode.com')) return 'hashnode';
    if (urlLower.includes('github.com')) return 'github';
    if (urlLower.includes('stackoverflow.com')) return 'stackoverflow';

    return 'general';
  }

  // Format elements for context display in prompts with minimal token usage
  // Only sends: index, tagName (type), text (name), category, purpose
  formatElementsForContext(elements) {
    if (!elements || elements.length === 0) return "No elements found";

    return elements.map(el => {
      const name = (el.text || el.ariaLabel || '').trim();
      const limitedName = name.length > 100 ? name.substring(0, 100) + '...' : name;

      return `[Index: ${el.index}] Type: ${el.tagName || 'UNKNOWN'} | Name: "${limitedName}" | Category: ${el.category || 'unknown'} | Purpose: ${el.purpose || 'general'}`;
    }).join('\n');
  }

  // New parsing method using delimiters
  parseDelimitedResponse(response) {
    try {
      // Extract classification section with more robust regex
      const classificationMatch = response.match(/===CLASSIFICATION_START===([\s\S]*?)===CLASSIFICATION_END===/);
      const responseMatch = response.match(/===RESPONSE_START===([\s\S]*?)(?:===RESPONSE_END===|$)/);

      if (!classificationMatch || !responseMatch) {
        console.warn('Could not find delimited sections, using fallback parsing');
        return this.parseJSONResponse(response);
      }

      const classificationText = classificationMatch[1].trim();
      let responseText = responseMatch[1].trim();

      // Parse classification with better regex
      const intentMatch = classificationText.match(/INTENT:\s*(CHAT|WEB_AUTOMATION)/i);
      const confidenceMatch = classificationText.match(/CONFIDENCE:\s*([0-9.]+)/);
      const reasoningMatch = classificationText.match(/REASONING:\s*(.+?)(?=\n|$)/s);

      const intent = intentMatch ? intentMatch[1].toUpperCase() : 'CHAT';
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8;
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Classified using enhanced delimiter parsing';

      // Parse response based on intent
      let parsedResponse;
      if (intent === 'CHAT') {
        parsedResponse = {
          message: responseText, // Keep as markdown text
          isMarkdown: true // Flag to indicate markdown formatting
        };
      } else {
        responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/`/g, '');
        responseText = responseText.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        try {
          parsedResponse = JSON.parse(responseText);

          // For done tasks, next_action can be null, but observation and strategy are required
          if (!parsedResponse.observation || !parsedResponse.strategy) {
            throw new Error('Missing required fields in automation response');
          }

          // If task is done but no next_action specified, set it to "complete"
          if (parsedResponse.done && !parsedResponse.next_action) {
            parsedResponse.next_action = "complete";
          }

        } catch (jsonError) {
          console.error('AITaskRouter JSON parsing error:', jsonError.message);
          console.error('Raw text that failed to parse:', responseText);

          // Enhanced error handling with more context
          let errorMessage;
          if (jsonError.message.includes('Unexpected end of JSON input')) {
            errorMessage = `AITaskRouter response parsing failed: The AI response was incomplete or cut off. This often happens with complex routing tasks. Try simplifying your request. Original error: ${jsonError.message}`;
          } else if (jsonError.message.includes('Unexpected token')) {
            errorMessage = `AITaskRouter response parsing failed: The AI response contained invalid formatting. This may be due to model overload. Try again with a simpler request. Original error: ${jsonError.message}`;
          } else {
            errorMessage = `AITaskRouter response parsing failed: Unable to process AI response due to formatting issues. Original error: ${jsonError.message}. Raw response length: ${responseText?.length || 0} characters.`;
          }

          console.error('Enhanced error message:', errorMessage);

          parsedResponse = {
            observation: "Enhanced parsing failed - analyzing current page state",
            done: false,
            strategy: "Analyze current desktop page and determine appropriate actions",
            next_action: "Get current page state and identify interactive elements",
            reasoning: `JSON parsing error occurred: ${errorMessage}`,
            completion_criteria: "Complete user request based on available actions",
            parsing_error: errorMessage
          };
        }
      }

      return {
        intent: intent,
        confidence: confidence,
        reasoning: reasoning,
        response: parsedResponse
      };

    } catch (error) {
      console.error('Enhanced delimiter parsing failed:', error);
      return this.fallbackIntelligentResponse();
    }
  }

  // JSON parsing as fallback
  parseJSONResponse(response) {
    try {
      let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch (error) {
      console.error('JSON parsing failed:', error);
      return this.fallbackIntelligentResponse();
    }
  }

  fallbackIntelligentResponse() {
    // Use stored userMessage
    const userMessage = this.userMessage || 'Unknown message';
    const lowerMessage = userMessage.toLowerCase();

    // Action indicators for web automation
    const actionWords = ['open', 'go', 'navigate', 'search', 'click', 'type', 'post', 'buy', 'find', 'visit', 'play', 'watch', 'scroll', 'fill'];
    const hasActionWords = actionWords.some(word => lowerMessage.includes(word));

    // Conversational indicators
    const chatWords = ['hello', 'hi', 'what', 'how', 'why', 'explain', 'tell me', 'can you', 'help'];
    const hasChatWords = chatWords.some(word => lowerMessage.includes(word));

    if (hasActionWords && !hasChatWords) {
      return {
        intent: 'WEB_AUTOMATION',
        confidence: 0.7,
        reasoning: 'Detected action words indicating web automation request',
        response: {
          observation: `User wants to: ${userMessage}`,
          done: false,
          strategy: 'Analyze current page and execute the requested web automation task',
          next_action: 'Get current page state and determine appropriate actions',
          reasoning: 'Detected automation request from user message',
          completion_criteria: 'Task will be complete when user request is fulfilled'
        }
      };
    } else {
      return {
        intent: 'CHAT',
        confidence: 0.8,
        reasoning: 'Appears to be a conversational request or question',
        response: {
          message: `**I understand you said:** "${userMessage}"\n\n🤖 I'm your universal AI web automation assistant! I can help you with any website - YouTube, social media, shopping, research, and more.\n\n**Here are some examples of what you can ask me to do:**\n\n* **Search & Browse:** "Open YouTube and search for tutorials"\n* **Shopping:** "Navigate to Amazon and find products"\n* **Social Media:** "Post on social media"\n* **Forms & Data:** "Fill out forms automatically"\n\n**What would you like me to help you with?**`,
          isMarkdown: true
        }
      };
    }
  }

  /**
   * Select the most relevant elements for the current task
   * Prioritizes elements based on task keywords and element properties
   */
  selectRelevantElements(allElements, userTask, maxCount = 200) {
    if (!allElements || allElements.length === 0) return [];
    if (allElements.length <= maxCount) return allElements;

    const taskLower = (userTask || '').toLowerCase();

    // Score each element based on relevance
    const scoredElements = allElements.map((el, index) => {
      let score = 0;

      // Base score for element position (earlier elements get slight boost)
      score += Math.max(0, 10 - (index / allElements.length) * 10);

      // High priority for action elements
      if (el.category === 'action') score += 50;
      if (el.category === 'form') score += 30;
      if (el.category === 'navigation') score += 20;

      // Boost for visible elements with good bounds
      if (el.isVisible && el.bounds?.width > 0 && el.bounds?.height > 0) {
        score += 20;
      }

      // Task-specific keyword matching
      const text = `${el.text || ''} ${el.textContent || ''} ${el.attributes?.['aria-label'] || ''}`.toLowerCase();

      // Extract keywords from user task
      const taskWords = taskLower.split(/\s+/).filter(w => w.length > 2);
      for (const word of taskWords) {
        if (text.includes(word)) score += 30;
      }

      // Penalize very generic divs with no text
      if (el.tagName?.toLowerCase() === 'div' && !text.trim() && el.category === 'unknown') {
        score -= 30;
      }

      return { element: el, score };
    });

    // Sort by score (highest first) and take top maxCount
    scoredElements.sort((a, b) => b.score - a.score);
    return scoredElements.slice(0, maxCount).map(item => item.element);
  }
}