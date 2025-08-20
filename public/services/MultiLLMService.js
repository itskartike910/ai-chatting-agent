/* global chrome */

const API_BASE_URL = '';

export class MultiLLMService {
    constructor(config = {}) {
      this.config = config;
      console.log('🤖 Universal LLM Service initialized with provider:', this.config.aiProvider || 'anthropic');
    }

    // Capture screenshot using Wootz API
    async captureScreenshot() {
      try {
        console.log('📸 Capturing screenshot using chrome.wootz.captureScreenshot()...');
        
        // First highlight elements with debug mode
        console.log('🔍 Highlighting elements with debug mode...');
        await new Promise((resolve) => {
          chrome.wootz.getPageState({
            debugMode: true,
            includeHidden: true
          }, (result) => {
            if (result.success) {
              console.log('✅ Elements highlighted successfully');
            } else {
              console.log('⚠️ Element highlighting failed:', result.error);
            }
            resolve();
          });
        });
        
        // Wait a moment for highlighting to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Capture screenshot using the correct API: chrome.wootz.captureScreenshot()
        // It returns a Promise directly and takes no parameters.
        const screenshotResult = await chrome.wootz.captureScreenshot();
        
        if (screenshotResult && screenshotResult.success && screenshotResult.dataUrl) {
          console.log(`✅ Screenshot captured: ~${Math.round(screenshotResult.dataUrl.length * 0.75 / 1024)}KB`);
          return screenshotResult.dataUrl;
        } else {
          console.log('❌ Screenshot capture failed:', screenshotResult?.error || 'No dataUrl returned');
          return null;
        }
      } catch (error) {
        console.error('❌ Screenshot capture error:', error);
        return null;
      }
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
        // Capture screenshot for chat calls too
        const screenshot = await this.captureScreenshot();
        return await this.callProvider(provider, messages, { ...options, model: modelName, screenshot });
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
        // Always capture screenshot for agent calls
        const screenshot = await this.captureScreenshot();
        return await this.callProvider(provider, messages, { ...options, model: modelName, screenshot });
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
  
      // Prepare messages with screenshot if available
      let processedMessages = [...messages];
      
      if (options.screenshot) {
        // For Anthropic, add screenshot as a separate message with image content
        const screenshotMessage = {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: options.screenshot.split(',')[1] // Remove data URL prefix
              }
            },
            {
              type: 'text',
              text: 'This is a screenshot of the current web page with highlighted interactive elements. Use this visual context along with the text prompt to provide accurate responses.'
            }
          ]
        };
        
        // Insert screenshot message before the last user message
        const lastUserIndex = processedMessages.findLastIndex(msg => msg.role === 'user');
        if (lastUserIndex !== -1) {
          processedMessages.splice(lastUserIndex, 0, screenshotMessage);
        } else {
          processedMessages.unshift(screenshotMessage);
        }
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
          model: model,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.4,
          messages: processedMessages
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
  
      // Prepare messages with screenshot if available
      let processedMessages = [...messages];
      
      if (options.screenshot) {
        // For OpenAI, add screenshot as a separate message with image content
        const screenshotMessage = {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: options.screenshot
              }
            },
            {
              type: 'text',
              text: 'This is a screenshot of the current web page with highlighted interactive elements. Use this visual context along with the text prompt to provide accurate responses.'
            }
          ]
        };
        
        // Insert screenshot message before the last user message
        const lastUserIndex = processedMessages.findLastIndex(msg => msg.role === 'user');
        if (lastUserIndex !== -1) {
          processedMessages.splice(lastUserIndex, 0, screenshotMessage);
        } else {
          processedMessages.unshift(screenshotMessage);
        }
      }
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: processedMessages,
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.4
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
  
      // Prepare messages with screenshot if available
      let processedMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      if (options.screenshot) {
        // For Gemini, add screenshot as inline_data in the first user message
        if (processedMessages.length > 0 && processedMessages[0].role === 'user') {
          const base64Data = options.screenshot.split(',')[1]; // Remove data URL prefix
          processedMessages[0].parts.unshift({
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          });
        } else {
          // Create a new user message with screenshot
          const base64Data = options.screenshot.split(',')[1];
          processedMessages.unshift({
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              },
              {
                text: 'This is a screenshot of the current web page with highlighted interactive elements. Use this visual context along with the text prompt to provide accurate responses.'
              }
            ]
          });
        }
      }
  
      const requestBody = {
        contents: processedMessages,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.4
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
      console.log('🔍 Raw Gemini response:', JSON.stringify(data, null, 2));
      
      // Handle empty or incomplete responses
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Empty response from Gemini API');
      }
  
      const candidate = data.candidates[0];
      
      // Handle MAX_TOKENS case
      if (candidate.finishReason === 'MAX_TOKENS') {
        throw new Error('Response exceeded maximum token limit. Try breaking down the task into smaller steps.');
      }
  
      // Handle empty content
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('Incomplete response from Gemini API - missing content parts');
      }
  
      // Handle missing text
      if (!candidate.content.parts[0].text) {
        throw new Error('Incomplete response from Gemini API - missing text content');
      }
  
      return candidate.content.parts[0].text;
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
        let prompt = messages.map(msg => msg.content).join('\n\n');
        
        // Add screenshot context if available
        if (options.screenshot) {
          prompt = `[SCREENSHOT CONTEXT: A screenshot of the current web page with highlighted interactive elements is available. Use this visual context to provide accurate responses.]\n\n${prompt}`;
        }
        
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