/* global chrome */

const API_BASE_URL = 'https://nextjs-app-410940835135.us-central1.run.app/api';
const PRICE_ID = '';

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
        
        // Capture screenshot using the API: chrome.wootz.captureScreenshot()
        const screenshotResult = await chrome.wootz.captureScreenshot();
        
        if (screenshotResult && screenshotResult.success && screenshotResult.dataUrl) {
          console.log(`✅ Screenshot captured: ~${Math.round(screenshotResult.dataUrl.length * 0.75 / 1024)}KB`);
          console.log('🔍 Screenshot dataUrl:', screenshotResult.dataUrl);
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
      
      // For llmGenerate provider, all models are valid
      if (provider === 'llmGenerate' || provider === 'geminiGenerate') {
        return true;
      }
      
      return modelProviderMap[model] === provider;
    }
  
    async call(messages, options = {}, agentType = 'planner') {
      return await this.callForAgent(messages, options, agentType);
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
        console.log('📩📫 Messages', messages);
        return await this.callProvider(provider, messages, { ...options, model: modelName, screenshot });
      } catch (error) {
        console.error(`❌ ${provider} failed:`, error);
        throw error;
      }
    }
  
    async determineProvider(forChat = false) {
      // Use the config passed to constructor instead of calling getConfig()
      
      // Check for llmGenerate first (new DeepHUD API)
      if (this.config.llmGenerate && this.config.llmGenerate.enabled) {
        return 'llmGenerate';
      }
      
      // Check for geminiGenerate (legacy)
      if (this.config.geminiGenerate && this.config.geminiGenerate.enabled) {
        return 'llmGenerate'; // Map to new name
      }
      
      // Check other providers
      if (this.config.anthropic && this.config.anthropic.enabled && this.config.anthropic.apiKey) {
        return 'anthropic';
      }
      
      if (this.config.openai && this.config.openai.enabled && this.config.openai.apiKey) {
        return 'openai';
      }
      
      if (this.config.gemini && this.config.gemini.enabled && this.config.gemini.apiKey) {
        return 'gemini';
      }
      
      throw new Error('No valid LLM provider configured');
    }
  
    checkApiKey(provider) {
      switch (provider) {
        case 'anthropic':
          return !!this.config.anthropicApiKey;
        case 'openai':
          return !!this.config.openaiApiKey;
        case 'gemini':
          return !!this.config.geminiApiKey;
        case 'llmGenerate':
          return true; // Always valid for llmGenerate
        case 'geminiGenerate':
          return true; // Legacy support 
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
                  case 'llmGenerate':
            return await this.callLlmGenerate(messages, options);
          case 'geminiGenerate':
            return await this.callLlmGenerate(messages, options); // Map legacy to new
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
  
    async callLlmGenerate(messages, options = {}) {
      try {
        console.log('🤖 Calling DeepHUD LLM API...');
        
        // Get authentication data from chrome.storage.local
        const authData = await this.getAuthData();
        if (!authData) {
          throw new Error('Authentication data not found. Please sign in first.');
        }

        // Get user's organization for the default price ID
        const priceId = PRICE_ID;
        const orgResponse = await fetch(`${API_BASE_URL}/products/${priceId}/organizations/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
          },
          credentials: 'include'
        });

        if (!orgResponse.ok) {
          throw new Error(`Failed to get organization: ${orgResponse.status}`);
        }

        const orgData = await orgResponse.json();
        const organizations = orgData.organizations || [];
        
        if (organizations.length === 0) {
          throw new Error('No organizations found. Please create an organization first.');
        }

        // Use the first active organization
        const activeOrg = organizations.find(org => org.isActive) || organizations[0];
        
        // Create streaming session
        const sessionResponse = await fetch(`${API_BASE_URL}/streamMobile/createSession/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
          },
          credentials: 'include'
        });

        if (!sessionResponse.ok) {
          throw new Error(`Failed to create session: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        const clientId = sessionData.clientId;

        // Get Ably token for streaming
        const tokenResponse = await fetch(`${API_BASE_URL}/streamMobile/getToken/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
          },
          credentials: 'include',
          body: JSON.stringify({ clientId: clientId })
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get Ably token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        
        // Get the last user message as prompt
        const lastUserMessage = messages.findLast(msg => msg.role === 'user');
        if (!lastUserMessage) {
          throw new Error('No user message found in messages array');
        }

        // Start AI chat session
        const chatResponse = await fetch(`${API_BASE_URL}/streamMobile/startChat/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `__Secure-authjs.session-token=${authData.sessionToken}`
          },
          credentials: 'include',
          body: JSON.stringify({
            prompt: lastUserMessage.content,
            clientId: clientId,
            orgId: activeOrg.id
          })
        });

        if (!chatResponse.ok) {
          throw new Error(`Failed to start chat: ${chatResponse.status}`);
        }

        const chatData = await chatResponse.json();
        return chatData;
        
      } catch (error) {
        console.error('❌ DeepHUD LLM API error:', error);
        throw error;
      }
    }

    async getAuthData() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['authData'], (result) => {
          resolve(result.authData || null);
        });
      });
    }

    async saveAuthData(authData) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ authData }, () => {
          resolve();
        });
      });
    }
  }