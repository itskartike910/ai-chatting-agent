/* global chrome */

const API_BASE_URL = 'https://nextjs-app-410940835135.us-central1.run.app/api';

/**
 * Provider configuration registry
 * Supports: Anthropic, OpenAI, Gemini, Groq, OpenRouter, Custom OpenAI-compatible, Local LLMs
 */
const PROVIDER_REGISTRY = {
  // Built-in providers with fixed endpoints
  anthropic: {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    authType: 'api-key-header',
    authHeader: 'x-api-key',
    versionHeader: 'anthropic-version',
    versionValue: '2023-06-01',
    modelMapping: {
      navigator: 'claude-3-5-sonnet-20241022',
      planner: 'claude-3-5-sonnet-20241022',
      validator: 'claude-3-haiku-20240307',
      chat: 'claude-3-5-sonnet-20241022'
    },
    supportedModels: [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229'
    ],
    modelsEndpoint: 'https://api.anthropic.com/v1/models',
    healthCheckEndpoint: 'https://api.anthropic.com/v1/messages',
    requestFormat: 'anthropic',
    responseFormat: 'anthropic'
  },
  openai: {
    name: 'OpenAI GPT',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    authType: 'bearer',
    authHeader: 'Authorization',
    modelMapping: {
      navigator: 'gpt-4o',
      planner: 'gpt-4o',
      validator: 'gpt-4o-mini',
      chat: 'gpt-4o'
    },
    supportedModels: [
      'o1-preview',
      'o1-mini',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ],
    modelsEndpoint: 'https://api.openai.com/v1/models',
    healthCheckEndpoint: 'https://api.openai.com/v1/models',
    requestFormat: 'openai',
    responseFormat: 'openai'
  },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    authType: 'query-param',
    authParam: 'key',
    modelMapping: {
      navigator: 'gemini-2.5-flash',
      planner: 'gemini-2.5-flash',
      validator: 'gemini-2.5-flash',
      chat: 'gemini-2.5-flash'
    },
    supportedModels: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ],
    modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    healthCheckEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    requestFormat: 'gemini',
    responseFormat: 'gemini'
  },

  // New providers
  groq: {
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    authType: 'bearer',
    authHeader: 'Authorization',
    modelMapping: {
      navigator: 'llama-3.1-8b-instant',
      planner: 'llama-3.3-70b-versatile',
      validator: 'llama-3.1-8b-instant',
      chat: 'llama-3.3-70b-versatile'
    },
    supportedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview',
      'deepseek-r1-distill-llama-70b',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ],
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    healthCheckEndpoint: 'https://api.groq.com/openai/v1/models',
    requestFormat: 'openai',
    responseFormat: 'openai'
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authType: 'bearer',
    authHeader: 'Authorization',
    modelMapping: {
      navigator: 'anthropic/claude-3.5-sonnet',
      planner: 'anthropic/claude-3.5-sonnet',
      validator: 'google/gemini-flash-1.5',
      chat: 'anthropic/claude-3.5-sonnet'
    },
    supportedModels: [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-haiku',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'google/gemini-pro-1.5',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'mistralai/mistral-large'
    ],
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    healthCheckEndpoint: 'https://openrouter.ai/api/v1/models',
    requestFormat: 'openai',
    responseFormat: 'openai'
  },

  // Custom OpenAI-compatible (user provides base URL)
  'openai-compatible': {
    name: 'Custom OpenAI-Compatible',
    endpoint: '', // User configured
    authType: 'bearer',
    authHeader: 'Authorization',
    modelMapping: {
      navigator: '',
      planner: '',
      validator: '',
      chat: ''
    },
    supportedModels: [],
    modelsEndpoint: '', // User configured (will use baseUrl + /models)
    healthCheckEndpoint: '', // User configured (will use baseUrl + /models)
    requestFormat: 'openai',
    responseFormat: 'openai',
    isCustom: true
  },

  // Local LLMs (llama-server, ollama, etc.)
  local: {
    name: 'Local LLM (llama-server/Ollama)',
    endpoint: '', // User configured
    authType: 'none', // Usually no auth for local
    authHeader: '',
    modelMapping: {
      navigator: '',
      planner: '',
      validator: '',
      chat: ''
    },
    supportedModels: [],
    modelsEndpoint: '', // User configured (will use baseUrl + /models)
    healthCheckEndpoint: '', // User configured (will use baseUrl + /models)
    requestFormat: 'openai',
    responseFormat: 'openai',
    isCustom: true,
    isLocal: true
  }
};

/**
 * Model to provider mapping for validation
 */
const MODEL_PROVIDER_MAP = {
  // Anthropic
  'claude-3-7-sonnet-20250219': 'anthropic',
  'claude-3-5-sonnet-20241022': 'anthropic',
  'claude-3-5-haiku-20241022': 'anthropic',
  'claude-3-sonnet-20240229': 'anthropic',
  'claude-3-haiku-20240307': 'anthropic',
  'claude-3-opus-20240229': 'anthropic',
  // OpenAI
  'o1': 'openai',
  'o1-preview': 'openai',
  'o1-mini': 'openai',
  'o3-mini': 'openai',
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'gpt-4-turbo': 'openai',
  'gpt-4': 'openai',
  'gpt-3.5-turbo': 'openai',
  // Gemini
  'gemini-2.5-flash': 'gemini',
  'gemini-2.5-pro': 'gemini',
  'gemini-2.0-flash': 'gemini',
  'gemini-1.5-pro': 'gemini',
  'gemini-1.5-flash': 'gemini',
  // Groq
  'llama-3.3-70b-versatile': 'groq',
  'llama-3.1-8b-instant': 'groq',
  'llama-3.1-70b-versatile': 'groq',
  'llama-3.2-11b-vision-preview': 'groq',
  'llama-3.2-90b-vision-preview': 'groq',
  'deepseek-r1-distill-llama-70b': 'groq',
  'gemma2-9b-it': 'groq',
  'mixtral-8x7b-32768': 'groq',
  // OpenRouter (prefix-based)
  'anthropic/': 'openrouter',
  'openai/': 'openrouter',
  'google/': 'openrouter',
  'meta-llama/': 'openrouter',
  'mistralai/': 'openrouter'
};

export class MultiLLMService {
  constructor(config = {}) {
    this.config = config;
    console.log('🤖 Universal LLM Service initialized with provider:', this.config.aiProvider || 'gemini');
  }

  // Capture screenshot - this method will be overridden by background script
  async captureScreenshot() {
    try {
      console.log('📸 Capturing screenshot...');

      if (this.captureScreenshot) {
        return await this.captureScreenshot();
      } else {
        console.log('❌ Screenshot method not provided by background script');
        return null;
      }

    } catch (error) {
      console.error('❌ Screenshot capture error:', error);
      return null;
    }
  }

  getProviderConfig(provider) {
    return PROVIDER_REGISTRY[provider] || null;
  }

  getModelName(provider, agentType = 'planner') {
    const configuredModel = agentType === 'navigator' ? this.config.navigatorModel :
      agentType === 'planner' ? this.config.plannerModel :
        agentType === 'validator' ? this.config.validatorModel :
          agentType === 'chat' ? this.config.chatModel : null;

    if (configuredModel && this.isModelValidForProvider(configuredModel, provider)) {
      return configuredModel;
    }

    const providerConfig = this.getProviderConfig(provider);
    if (providerConfig && providerConfig.modelMapping) {
      return providerConfig.modelMapping[agentType] || providerConfig.modelMapping.navigator || providerConfig.modelMapping.planner;
    }

    // Fallback defaults
    const defaultModels = {
      'anthropic': {
        'navigator': 'claude-3-5-sonnet-20241022',
        'planner': 'claude-3-7-sonnet-20250219',
        'validator': 'claude-3-5-haiku-20241022',
        'chat': 'claude-3-5-sonnet-20241022'
      },
      'openai': {
        'navigator': 'gpt-4o',
        'planner': 'gpt-4o',
        'validator': 'gpt-4o-mini',
        'chat': 'gpt-4o'
      },
      'gemini': {
        'navigator': 'gemini-2.5-flash',
        'planner': 'gemini-2.5-flash',
        'validator': 'gemini-2.5-flash',
        'chat': 'gemini-2.5-flash'
      },
      'groq': {
        'navigator': 'llama-3.1-8b-instant',
        'planner': 'llama-3.3-70b-versatile',
        'validator': 'llama-3.1-8b-instant',
        'chat': 'llama-3.3-70b-versatile'
      },
      'openrouter': {
        'navigator': 'openai/gpt-4o',
        'planner': 'anthropic/claude-3.5-sonnet',
        'validator': 'openai/gpt-4o-mini',
        'chat': 'anthropic/claude-3.5-sonnet'
      }
    };

    return defaultModels[provider]?.[agentType] || defaultModels[provider]?.['navigator'] || 'gemini-2.5-flash';
  }

  isModelValidForProvider(model, provider) {
    if (!model || typeof model !== 'string') return false;

    // For custom or local providers, any non-empty model is valid
    const providerConfig = this.getProviderConfig(provider);
    if (providerConfig?.isCustom || providerConfig?.isLocal) {
      return true;
    }

    // Direct match in MODEL_PROVIDER_MAP
    if (MODEL_PROVIDER_MAP[model] === provider) {
      return true;
    }

    // Direct match in provider's supportedModels list
    if (providerConfig?.supportedModels?.includes(model)) {
      return true;
    }

    // Prefix mapping (e.g. openrouter namespaces: "anthropic/...", "openai/...", "meta-llama/...")
    for (const [prefix, mappedProvider] of Object.entries(MODEL_PROVIDER_MAP)) {
      if (model.startsWith(prefix) && mappedProvider === provider) {
        return true;
      }
    }

    // Provider heuristics: prevent cross-provider misconfigurations while allowing dynamic models
    const m = model.toLowerCase();
    if (provider === 'anthropic') {
      return m.includes('claude');
    }
    if (provider === 'openai') {
      return m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('davinci');
    }
    if (provider === 'gemini') {
      return m.includes('gemini') || m.includes('gemma') || m.includes('learnlm');
    }
    if (provider === 'groq') {
      // Allow any Groq-compatible models (llama, mixtral, gemma, deepseek, qwen, etc.)
      return !m.includes('claude') && !m.startsWith('gpt-');
    }
    if (provider === 'openrouter') {
      return true;
    }

    return true;
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
    const activeProvider = this.config.aiProvider || 'gemini';

    // Check if the active provider has a valid API key
    switch (activeProvider) {
      case 'anthropic':
        if (this.config.anthropicApiKey) {
          return 'anthropic';
        }
        break;
      case 'openai':
        if (this.config.openaiApiKey) {
          return 'openai';
        }
        break;
      case 'gemini':
        if (this.config.geminiApiKey) {
          return 'gemini';
        }
        break;
      case 'groq':
        if (this.config.groqApiKey) {
          return 'groq';
        }
        break;
      case 'openrouter':
        if (this.config.openrouterApiKey) {
          return 'openrouter';
        }
        break;
      case 'openai-compatible':
        if (this.config.customOpenAIBaseUrl && this.config.customOpenAIApiKey) {
          return 'openai-compatible';
        }
        break;
      case 'local':
        if (this.config.localLLMBaseUrl) {
          return 'local';
        }
        break;
      default:
        console.warn('Unknown provider selected, falling back to gemini if available');
    }

    return 'gemini';
  }

  checkApiKey(provider) {
    switch (provider) {
      case 'anthropic':
        return !!this.config.anthropicApiKey;
      case 'openai':
        return !!this.config.openaiApiKey;
      case 'gemini':
        return !!this.config.geminiApiKey;
      case 'groq':
        return !!this.config.groqApiKey;
      case 'openrouter':
        return !!this.config.openrouterApiKey;
      case 'openai-compatible':
        return !!(this.config.customOpenAIBaseUrl && this.config.customOpenAIApiKey);
      case 'local':
        return !!this.config.localLLMBaseUrl;
      case 'llmGenerate':
        return true;
      case 'geminiGenerate':
        return true;
      default:
        return false;
    }
  }

  async callProvider(provider, messages, options) {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Handle custom providers with user-configured endpoints
    if (providerConfig.isCustom) {
      return await this.callCustomProvider(provider, messages, options, providerConfig);
    }

    switch (provider) {
      case 'anthropic':
        return await this.callAnthropic(messages, options);
      case 'openai':
        return await this.callOpenAI(messages, options);
      case 'gemini':
        return await this.callGemini(messages, options);
      case 'groq':
        return await this.callGroq(messages, options);
      case 'openrouter':
        return await this.callOpenRouter(messages, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Call custom OpenAI-compatible endpoint or local LLM
   * Supports both streaming (SSE) and non-streaming responses
   */
  async callCustomProvider(provider, messages, options, providerConfig) {
    const baseUrl = provider === 'openai-compatible'
      ? this.config.customOpenAIBaseUrl
      : this.config.localLLMBaseUrl;
    const apiKey = provider === 'openai-compatible'
      ? this.config.customOpenAIApiKey
      : this.config.localLLMApiKey; // Optional for local

    const model = options.model || this.config.customModel || this.config.localLLMModel;
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    console.log(`🔥 Calling ${providerConfig.name} at ${endpoint} with model: ${model}`);

    // Prepare messages with screenshot if available
    let processedMessages = [...messages];

    if (options.screenshot) {
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

      const lastUserIndex = processedMessages.findLastIndex(msg => msg.role === 'user');
      if (lastUserIndex !== -1) {
        processedMessages.splice(lastUserIndex, 0, screenshotMessage);
      } else {
        processedMessages.unshift(screenshotMessage);
      }
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add auth if provided (optional for local LLMs)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Use streaming only if explicitly requested (default: false for faster responses)
    const useStream = options.stream === true;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: processedMessages,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.4,
        stream: useStream
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${providerConfig.name} API error: ${response.status} - ${errorText}`);
    }

    // Check if response is streaming (SSE)
    const contentType = response.headers.get('content-type') || '';
    if (useStream && contentType.includes('text/event-stream')) {
      return await this.parseSSEStream(response);
    }

    // Non-streaming response
    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      }
    };
  }

  /**
   * Parse Server-Sent Events (SSE) stream from OpenAI-compatible APIs
   * Handles both standard streaming and omniroute-style streaming
   */
  async parseSSEStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let usage = { prompt: 0, completion: 0, total: 0 };
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          // Handle SSE format: "data: {...}"
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const chunk = JSON.parse(jsonStr);

              // Extract content from delta
              if (chunk.choices && chunk.choices.length > 0) {
                const delta = chunk.choices[0].delta;
                if (delta && delta.content) {
                  fullContent += delta.content;
                }
              }

              // Extract usage if present (usually in final chunk)
              if (chunk.usage) {
                usage = {
                  prompt: chunk.usage.prompt_tokens || 0,
                  completion: chunk.usage.completion_tokens || 0,
                  total: chunk.usage.total_tokens || 0
                };
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
              console.warn('Failed to parse SSE chunk:', jsonStr.slice(0, 100));
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim() && buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const chunk = JSON.parse(jsonStr);
            if (chunk.choices && chunk.choices.length > 0) {
              const delta = chunk.choices[0].delta;
              if (delta && delta.content) {
                fullContent += delta.content;
              }
            }
            if (chunk.usage) {
              usage = {
                prompt: chunk.usage.prompt_tokens || 0,
                completion: chunk.usage.completion_tokens || 0,
                total: chunk.usage.total_tokens || 0
              };
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      return {
        text: fullContent,
        usage
      };
    } finally {
      reader.releaseLock();
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
      const screenshotMessage = {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: options.screenshot.split(',')[1]
            }
          },
          {
            type: 'text',
            text: 'This is a screenshot of the current web page with highlighted interactive elements. Use this visual context along with the text prompt to provide accurate responses.'
          }
        ]
      };

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
    return {
      text: data.content[0].text,
      usage: {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  async callOpenAI(messages, options = {}) {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options.model || 'gpt-4o';
    console.log(`🔥 Calling OpenAI with model: ${model}`);

    let processedMessages = [...messages];

    if (options.screenshot) {
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

      const lastUserIndex = processedMessages.findLastIndex(msg => msg.role === 'user');
      if (lastUserIndex !== -1) {
        processedMessages.splice(lastUserIndex, 0, screenshotMessage);
      } else {
        processedMessages.unshift(screenshotMessage);
      }
    }

    const useStream = options.stream === true;

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
        temperature: options.temperature || 0.4,
        stream: useStream
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (useStream && contentType.includes('text/event-stream')) {
      return await this.parseSSEStream(response);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      }
    };
  }

  async callGroq(messages, options = {}) {
    if (!this.config.groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    const model = options.model || 'llama-3.3-70b-versatile';
    console.log(`🔥 Calling Groq with model: ${model}`);

    let processedMessages = [...messages];

    if (options.screenshot) {
      const isVisionModel = model.toLowerCase().includes('vision') || model.toLowerCase().includes('llava') || model.toLowerCase().includes('vl');
      if (isVisionModel) {
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

        const lastUserIndex = processedMessages.findLastIndex(msg => msg.role === 'user');
        if (lastUserIndex !== -1) {
          processedMessages.splice(lastUserIndex, 0, screenshotMessage);
        } else {
          processedMessages.unshift(screenshotMessage);
        }
      }
    }

    const useStream = options.stream === true;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: processedMessages,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.4,
        stream: useStream
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (useStream && contentType.includes('text/event-stream')) {
      return await this.parseSSEStream(response);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      }
    };
  }

  async callOpenRouter(messages, options = {}) {
    if (!this.config.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = options.model || 'anthropic/claude-3.5-sonnet';
    console.log(`🔥 Calling OpenRouter with model: ${model}`);

    let processedMessages = [...messages];

    if (options.screenshot) {
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

      const lastUserIndex = processedMessages.findLastIndex(msg => msg.role === 'user');
      if (lastUserIndex !== -1) {
        processedMessages.splice(lastUserIndex, 0, screenshotMessage);
      } else {
        processedMessages.unshift(screenshotMessage);
      }
    }

    const useStream = options.stream === true;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://omnibrowse.app',
        'X-Title': 'OmniBrowse'
      },
      body: JSON.stringify({
        model: model,
        messages: processedMessages,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.4,
        stream: useStream
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (useStream && contentType.includes('text/event-stream')) {
      return await this.parseSSEStream(response);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      }
    };
  }

  async callGemini(messages, options = {}) {
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || 'gemini-1.5-pro';
    console.log(`🔥 Calling Gemini with model: ${model}`);

    let processedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (options.screenshot) {
      if (processedMessages.length > 0 && processedMessages[0].role === 'user') {
        const base64Data = options.screenshot.split(',')[1];
        processedMessages[0].parts.unshift({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Data
          }
        });
      } else {
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
        maxOutputTokens: options.maxTokens || 16000,
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

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    const candidate = data.candidates[0];

    if (candidate.finishReason === 'MAX_TOKENS') {
      const partialText = candidate.content?.parts?.[0]?.text;
      if (partialText && partialText.length > 50) {
        console.warn('⚠️ Gemini response truncated (MAX_TOKENS) - using partial response');
        return {
          text: partialText,
          usage: {
            prompt: data.usageMetadata?.promptTokenCount || 0,
            completion: data.usageMetadata?.candidatesTokenCount || 0,
            total: data.usageMetadata?.totalTokenCount || 0
          },
          truncated: true
        };
      }
      throw new Error('Response exceeded maximum token limit. Try breaking down the task into smaller steps.');
    }

    if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      throw new Error('Incomplete response from Gemini API - missing content parts');
    }

    if (!candidate.content.parts[0].text) {
      throw new Error('Incomplete response from Gemini API - missing text content');
    }

    return {
      text: candidate.content.parts[0].text,
      usage: {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        completion: data.usageMetadata?.candidatesTokenCount || 0,
        total: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  /**
   * Fetch available models from a provider's /models endpoint
   * Returns array of model objects with id, name, capabilities
   */
  async fetchModels(provider) {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Get the API key for this provider
    const apiKey = this.getApiKeyForProvider(provider);
    const baseUrl = this.getBaseUrlForProvider(provider);

    let modelsEndpoint = providerConfig.modelsEndpoint;

    // For custom/local providers, construct endpoint from base URL
    if (provider === 'openai-compatible' || provider === 'local') {
      if (!baseUrl) {
        throw new Error('Base URL not configured');
      }
      modelsEndpoint = `${baseUrl.replace(/\/$/, '')}/models`;
    }

    if (!modelsEndpoint) {
      throw new Error(`Models endpoint not configured for ${provider}`);
    }

    console.log(`📡 Fetching models from ${modelsEndpoint}`);

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add auth if we have an API key
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(modelsEndpoint, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        // If models endpoint fails, return default models from registry
        console.warn(`Models endpoint failed (${response.status}), using defaults`);
        return this.getDefaultModels(provider);
      }

      const data = await response.json();

      // Parse based on provider format (OpenAI-compatible or Gemini)
      if (provider === 'gemini') {
        // Gemini returns { models: [...] }
        return (data.models || []).map(m => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name,
          description: m.description || '',
          inputTokenLimit: m.inputTokenLimit,
          outputTokenLimit: m.outputTokenLimit,
          supportedMethods: m.supportedGenerationMethods || []
        })).filter(m => m.supportedMethods.includes('generateContent'));
      } else {
        // OpenAI-compatible format: { data: [{ id, ... }] }
        return (data.data || []).map(m => ({
          id: m.id,
          name: m.id,
          description: m.owned_by || '',
          created: m.created
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch models from ${provider}:`, error);
      // Return default models from registry on error
      return this.getDefaultModels(provider);
    }
  }

  /**
   * Get default models from provider registry
   */
  getDefaultModels(provider) {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return [];

    return providerConfig.supportedModels.map(modelId => ({
      id: modelId,
      name: modelId,
      description: 'Default model'
    }));
  }

  /**
   * Validate API key by making a health check request
   * Returns { valid: boolean, message: string, models?: array }
   */
  async validateApiKey(provider, apiKey, baseUrl = null) {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) {
      return { valid: false, message: 'Unsupported provider' };
    }

    let endpoint = providerConfig.healthCheckEndpoint;
    let headers = {
      'Content-Type': 'application/json'
    };

    // For custom/local providers, use the provided base URL
    if (provider === 'openai-compatible' || provider === 'local') {
      if (!baseUrl) {
        return { valid: false, message: 'Base URL not provided' };
      }
      endpoint = `${baseUrl.replace(/\/$/, '')}/models`;
    }

    if (!endpoint) {
      return { valid: false, message: 'Health check endpoint not configured' };
    }

    // Add auth based on provider type
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      console.log(`🔍 Validating API key for ${provider} at ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        // Try to extract models list
        let models = [];
        if (provider === 'gemini') {
          models = (data.models || []).slice(0, 5).map(m => m.name.replace('models/', ''));
        } else {
          models = (data.data || []).slice(0, 5).map(m => m.id);
        }

        return {
          valid: true,
          message: 'API key is valid',
          models
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          message: 'Invalid API key'
        };
      } else {
        return {
          valid: false,
          message: `API error: ${response.status}`
        };
      }
    } catch (error) {
      console.error(`Health check failed for ${provider}:`, error);
      // Network error might still mean valid key (e.g., CORS issues)
      return {
        valid: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get API key for a provider from config
   */
  getApiKeyForProvider(provider) {
    switch (provider) {
      case 'anthropic':
        return this.config.anthropicApiKey;
      case 'openai':
        return this.config.openaiApiKey;
      case 'gemini':
        return this.config.geminiApiKey;
      case 'groq':
        return this.config.groqApiKey;
      case 'openrouter':
        return this.config.openrouterApiKey;
      case 'openai-compatible':
        return this.config.customOpenAIApiKey;
      case 'local':
        return this.config.localLLMApiKey;
      default:
        return null;
    }
  }

  /**
   * Get base URL for a provider from config
   */
  getBaseUrlForProvider(provider) {
    switch (provider) {
      case 'openai-compatible':
        return this.config.customOpenAIBaseUrl;
      case 'local':
        return this.config.localLLMBaseUrl;
      default:
        return null;
    }
  }
}