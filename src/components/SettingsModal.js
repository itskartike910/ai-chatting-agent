/* global chrome */
import React, { useState, useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useNavigate } from 'react-router-dom';
import {
  FaCog,
  FaTimes,
  FaRobot,
  FaBrain,
  FaCompass,
  FaClipboardList,
  FaCheckCircle,
  FaSave,
  FaSpinner,
  FaKey,
  FaExclamationTriangle,
  FaCheck,
  FaDatabase,
  FaEye,
  FaEyeSlash,
  FaExternalLinkAlt,
  FaServer
} from 'react-icons/fa';

const PROVIDER_METADATA = {
  gemini: {
    name: 'Google Gemini',
    icon: '💎',
    badge: 'Recommended',
    tagline: "Google's ultra-fast multimodal models with generous rate limits",
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Get API Key at Google AI Studio',
    defaultModels: {
      planner: 'gemini-2.5-flash',
      navigator: 'gemini-2.5-flash',
      validator: 'gemini-2.5-flash'
    }
  },
  anthropic: {
    name: 'Anthropic Claude',
    icon: '🔮',
    badge: 'High Reasoning',
    tagline: 'Top-tier precision & coding reasoning with Claude 3.5 / 3.7',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Anthropic Console',
    defaultModels: {
      planner: 'claude-3-7-sonnet-20250219',
      navigator: 'claude-3-5-sonnet-20241022',
      validator: 'claude-3-5-haiku-20241022'
    }
  },
  openai: {
    name: 'OpenAI GPT',
    icon: '🚀',
    badge: 'Industry Standard',
    tagline: 'GPT-4o, GPT-4o Mini, and o1 reasoning models',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'OpenAI Platform',
    defaultModels: {
      planner: 'gpt-4o',
      navigator: 'gpt-4o',
      validator: 'gpt-4o-mini'
    }
  },
  groq: {
    name: 'Groq (Fast & Free)',
    icon: '⚡',
    badge: 'Free Tier',
    tagline: 'Ultra-low latency LPU inference with Llama 3.3 70B & Mixtral',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'Groq Console',
    defaultModels: {
      planner: 'llama-3.3-70b-versatile',
      navigator: 'llama-3.3-70b-versatile',
      validator: 'llama-3.1-8b-instant'
    }
  },
  openrouter: {
    name: 'OpenRouter',
    icon: '🌐',
    badge: '100+ Models',
    tagline: 'Universal gateway for Claude, OpenAI, Gemini, Llama, and Mistral',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    docsLabel: 'OpenRouter Keys',
    defaultModels: {
      planner: 'anthropic/claude-3.5-sonnet',
      navigator: 'openai/gpt-4o',
      validator: 'openai/gpt-4o-mini'
    }
  },
  'openai-compatible': {
    name: 'Custom OpenAI-Compatible',
    icon: '🔧',
    badge: 'Custom API',
    tagline: 'Connect any custom endpoint (vLLM, Together AI, Mistral, Anyscale, etc.)',
    placeholder: 'sk-... (optional)',
    docsUrl: null,
    docsLabel: null,
    defaultModels: {
      planner: '',
      navigator: '',
      validator: ''
    }
  },
  local: {
    name: 'Local LLM (Private)',
    icon: '🏠',
    badge: '100% Private',
    tagline: 'Run offline using Ollama, llama-server, LM Studio, or vLLM',
    placeholder: 'Usually not needed for local servers',
    docsUrl: null,
    docsLabel: null,
    defaultModels: {
      planner: '',
      navigator: '',
      validator: ''
    }
  }
};

const SettingsModal = () => {
  const { config, updateConfig } = useConfig();
  const [localConfig, setLocalConfig] = useState(config);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationState, setValidationState] = useState(null); // null, 'valid', 'invalid', 'checking'
  const [validationMessage, setValidationMessage] = useState('');
  const [fetchedModels, setFetchedModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Get API key for current provider
  const getCurrentApiKey = () => {
    switch (localConfig.aiProvider) {
      case 'anthropic': return localConfig.anthropicApiKey || '';
      case 'openai': return localConfig.openaiApiKey || '';
      case 'gemini': return localConfig.geminiApiKey || '';
      case 'groq': return localConfig.groqApiKey || '';
      case 'openrouter': return localConfig.openrouterApiKey || '';
      case 'openai-compatible': return localConfig.customOpenAIApiKey || '';
      case 'local': return localConfig.localLLMApiKey || '';
      default: return '';
    }
  };

  // Get base URL for current provider
  const getCurrentBaseUrl = () => {
    switch (localConfig.aiProvider) {
      case 'openai-compatible': return localConfig.customOpenAIBaseUrl || '';
      case 'local': return localConfig.localLLMBaseUrl || '';
      default: return null;
    }
  };

  // Validate API key
  const validateApiKey = async () => {
    const apiKey = getCurrentApiKey();
    const baseUrl = getCurrentBaseUrl();

    if (localConfig.aiProvider === 'local' && !baseUrl) {
      setValidationState('invalid');
      setValidationMessage('Base URL is required for local LLMs');
      return;
    }

    if (localConfig.aiProvider !== 'local' && !apiKey) {
      setValidationState('invalid');
      setValidationMessage('API key is required');
      return;
    }

    setIsValidating(true);
    setValidationState('checking');
    setValidationMessage('Validating API key...');

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const result = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'VALIDATE_API_KEY',
            provider: localConfig.aiProvider,
            apiKey: apiKey,
            baseUrl: baseUrl
          }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ valid: false, message: chrome.runtime.lastError.message });
            } else {
              resolve(res || { valid: false, message: 'No response from background service' });
            }
          });
        });

        if (result && result.valid) {
          setValidationState('valid');
          setValidationMessage(result.message || 'API key is valid & working');
          if (result.models && result.models.length > 0) {
            setFetchedModels(result.models);
          }
          await fetchModels();
        } else {
          setValidationState('invalid');
          setValidationMessage(result?.message || result?.error || 'Validation failed');
        }
      } else {
        setValidationState('valid');
        setValidationMessage('API key format validated');
      }
    } catch (error) {
      setValidationState('invalid');
      setValidationMessage(`Validation failed: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Fetch models from provider
  const fetchModels = async () => {
    setIsFetchingModels(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'FETCH_MODELS',
            provider: localConfig.aiProvider,
            apiKey: getCurrentApiKey(),
            baseUrl: getCurrentBaseUrl()
          }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, models: [] });
            } else {
              resolve(res || { success: false, models: [] });
            }
          });
        });

        if (response && Array.isArray(response.models) && response.models.length > 0) {
          setFetchedModels(response.models);
        } else if (Array.isArray(response) && response.length > 0) {
          setFetchedModels(response);
        } else {
          setFetchedModels([]);
        }
      } else {
        setFetchedModels([]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setFetchedModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Handle API key change with auto-validation reset
  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setValidationState(null);
    setValidationMessage('');
    setFetchedModels([]);

    switch (localConfig.aiProvider) {
      case 'anthropic':
        setLocalConfig(prev => ({ ...prev, anthropicApiKey: newApiKey }));
        break;
      case 'openai':
        setLocalConfig(prev => ({ ...prev, openaiApiKey: newApiKey }));
        break;
      case 'gemini':
        setLocalConfig(prev => ({ ...prev, geminiApiKey: newApiKey }));
        break;
      case 'groq':
        setLocalConfig(prev => ({ ...prev, groqApiKey: newApiKey }));
        break;
      case 'openrouter':
        setLocalConfig(prev => ({ ...prev, openrouterApiKey: newApiKey }));
        break;
      case 'openai-compatible':
        setLocalConfig(prev => ({ ...prev, customOpenAIApiKey: newApiKey }));
        break;
      case 'local':
        setLocalConfig(prev => ({ ...prev, localLLMApiKey: newApiKey }));
        break;
      default:
        break;
    }
  };

  const handleProviderChange = (newProvider) => {
    const meta = PROVIDER_METADATA[newProvider];
    const availableModels = getAvailableModels(newProvider);
    setValidationState(null);
    setValidationMessage('');
    setFetchedModels([]);

    setLocalConfig(prev => ({
      ...prev,
      aiProvider: newProvider,
      navigatorModel: meta?.defaultModels?.navigator || availableModels[0]?.value || '',
      plannerModel: meta?.defaultModels?.planner || availableModels[0]?.value || '',
      validatorModel: meta?.defaultModels?.validator || availableModels[1]?.value || availableModels[0]?.value || ''
    }));
  };

  const handleClose = () => {
    navigate('/chat');
  };

  const handleSave = async () => {
    try {
      console.log('💾 Saving configuration...');
      const saveButton = document.querySelector('[data-save-button]');
      if (saveButton) {
        saveButton.innerHTML = '<span>⏳ Saving...</span>';
        saveButton.disabled = true;
      }

      await updateConfig(localConfig);

      if (saveButton) {
        saveButton.innerHTML = '<span>✓ Saved!</span>';
        saveButton.style.backgroundColor = '#10b981';
        setTimeout(() => {
          navigate('/chat');
          window.location.reload();
        }, 400);
      } else {
        navigate('/chat');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      const saveButton = document.querySelector('[data-save-button]');
      if (saveButton) {
        saveButton.innerHTML = '<span>✕ Save Error</span>';
        saveButton.disabled = false;
        setTimeout(() => {
          saveButton.innerHTML = '<span>💾 Save & Proceed</span>';
        }, 2000);
      }
    }
  };

  // Categorize models with recommendations
  const categorizeModels = (models, provider) => {
    if (!models || !Array.isArray(models) || models.length === 0) {
      return { categories: [], all: [], categorized: {} };
    }

    const safeHas = (id, sub) => typeof id === 'string' && id.toLowerCase().includes(String(sub).toLowerCase());
    const safeStarts = (id, sub) => typeof id === 'string' && id.toLowerCase().startsWith(String(sub).toLowerCase());
    const safeEq = (id, target) => typeof id === 'string' && id.toLowerCase() === String(target).toLowerCase();

    const categoryRules = {
      anthropic: {
        '🏆 Latest & Best': (id) => safeHas(id, '3-7-sonnet') || safeHas(id, '3-5-sonnet-20241022') || safeHas(id, '3.7-sonnet') || safeHas(id, '3.5-sonnet'),
        '⚡ Fast & Affordable': (id) => safeHas(id, 'haiku'),
        '🧠 Reasoning': (id) => safeHas(id, 'opus') || safeHas(id, '3-7-sonnet') || safeHas(id, '3.7-sonnet'),
        '📦 Previous Gen': (id) => safeHas(id, '3-sonnet-20240229') || safeHas(id, '3-opus-20240229')
      },
      openai: {
        '🏆 Latest & Best': (id) => safeEq(id, 'gpt-4o') || safeEq(id, 'o1') || safeEq(id, 'o1-preview') || safeEq(id, 'o3-mini'),
        '⚡ Fast & Affordable': (id) => safeHas(id, 'mini') || safeHas(id, 'gpt-3.5-turbo'),
        '🧠 Reasoning': (id) => safeStarts(id, 'o1') || safeStarts(id, 'o3'),
        '📦 Previous Gen': (id) => safeHas(id, 'gpt-4-turbo') || safeEq(id, 'gpt-4')
      },
      gemini: {
        '🏆 Latest & Best': (id) => safeHas(id, '2.5-flash') || safeHas(id, '2.5-pro') || safeHas(id, '2.0-flash'),
        '⚡ Fast & Affordable': (id) => safeHas(id, 'flash') && !safeHas(id, '2.5'),
        '🧠 Reasoning': (id) => safeHas(id, '2.5-pro') || safeHas(id, '1.5-pro'),
        '📦 Previous Gen': (id) => safeHas(id, '1.5-pro') || safeHas(id, '1.5-flash')
      },
      groq: {
        '🏆 Latest & Best': (id) => safeHas(id, '3.3-70b') || safeHas(id, '3.1-70b'),
        '⚡ Fast & Affordable': (id) => safeHas(id, '8b') || safeHas(id, 'gemma'),
        '🧠 Reasoning': (id) => safeHas(id, '70b') || safeHas(id, 'deepseek') || safeHas(id, 'r1'),
        '📦 Previous Gen': (id) => safeHas(id, 'mixtral') || safeHas(id, 'llama-3-')
      },
      openrouter: {
        '🏆 Latest & Best': (id) => safeHas(id, 'claude-3.5-sonnet') || safeHas(id, 'gpt-4o') || safeHas(id, 'gemini-2.0') || safeHas(id, 'gemini-pro-1.5'),
        '⚡ Fast & Affordable': (id) => safeHas(id, 'haiku') || safeHas(id, 'flash') || safeHas(id, '8b-instruct') || safeHas(id, 'mini'),
        '🧠 Reasoning': (id) => safeHas(id, 'opus') || safeHas(id, 'mistral-large') || safeHas(id, '70b-instruct') || safeHas(id, 'r1'),
        '📦 Other Models': () => true
      }
    };

    const rules = categoryRules[provider] || {
      '🏆 Recommended': () => true,
      '⚡ Fast': () => false,
      '🧠 Capable': () => false
    };

    const categorized = {};
    const used = new Set();

    Object.entries(rules).forEach(([category, matchFn]) => {
      const categoryModels = models.filter(m => {
        const val = m?.value || '';
        if (!val || used.has(val)) return false;
        if (matchFn(val)) {
          used.add(val);
          return true;
        }
        return false;
      });
      if (categoryModels.length > 0) {
        categorized[category] = categoryModels;
      }
    });

    const remaining = models.filter(m => m?.value && !used.has(m.value));
    if (remaining.length > 0) {
      categorized['📦 Other Models'] = remaining;
    }

    const all = [];
    Object.entries(categorized).forEach(([category, catModels]) => {
      all.push({ isCategory: true, category, label: category });
      catModels.forEach(model => all.push({ ...model, category }));
    });

    return { categories: Object.keys(categorized), all, categorized };
  };

  // Get available models based on provider - uses fetched models if available
  const getAvailableModels = (provider) => {
    if (fetchedModels && Array.isArray(fetchedModels) && fetchedModels.length > 0) {
      return fetchedModels.map(model => {
        if (typeof model === 'string') {
          return { value: model, label: model, description: '' };
        }
        const val = model?.id || model?.value || model?.name || '';
        const lbl = model?.name || model?.label || model?.id || val;
        return {
          value: String(val || ''),
          label: String(lbl || val || 'Model'),
          description: model?.description || ''
        };
      }).filter(m => m.value && m.value.trim() !== '');
    }

    switch (provider) {
      case 'anthropic':
        return [
          { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (Latest Reasoning) ⭐', recommended: true },
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
          { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast & Cheap)' },
          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast)' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' }
        ];
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o (Latest Flagship) ⭐', recommended: true },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
          { value: 'o1-preview', label: 'o1-preview (Deep Reasoning)' },
          { value: 'o1-mini', label: 'o1-mini (Fast Reasoning)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case 'gemini':
        return [
          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast & Smart) ⭐', recommended: true },
          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Deep Reasoning)' },
          { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
        ];
      case 'groq':
        return [
          { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Latest) ⭐', recommended: true },
          { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
          { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Ultra-Fast)' },
          { value: 'gemma2-9b-it', label: 'Gemma 2 9B IT' },
          { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
        ];
      case 'openrouter':
        return [
          { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (OpenRouter) ⭐', recommended: true },
          { value: 'openai/gpt-4o', label: 'GPT-4o (OpenRouter)' },
          { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenRouter)' },
          { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5 (OpenRouter)' },
          { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (OpenRouter)' },
          { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (OpenRouter)' },
          { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (OpenRouter)' },
          { value: 'mistralai/mistral-large', label: 'Mistral Large (OpenRouter)' }
        ];
      case 'openai-compatible':
        return [
          { value: localConfig.customModel || 'custom-model', label: localConfig.customModel || 'Custom Model' }
        ];
      case 'local':
        return [
          { value: localConfig.localLLMModel || 'local-model', label: localConfig.localLLMModel || 'Local Model' }
        ];
      default:
        return [];
    }
  };

  // Render model options with optgroup categories
  const renderModelOptions = (provider) => {
    const rawModels = getAvailableModels(provider);
    if (!rawModels || rawModels.length === 0) return null;
    const { categorized } = categorizeModels(rawModels, provider);
    const categoryEntries = Object.entries(categorized || {});

    if (!categoryEntries || categoryEntries.length === 0) {
      return rawModels.map(model => (
        <option key={model.value} value={model.value} style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>
          {model.label}
        </option>
      ));
    }

    return categoryEntries.map(([category, catModels]) => (
      <optgroup key={category} label={category} style={{ backgroundColor: '#0b0f19', color: '#818cf8', fontWeight: 'bold' }}>
        {catModels.map(model => (
          <option key={model.value} value={model.value} style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>
            {model.label}
          </option>
        ))}
      </optgroup>
    ));
  };

  const applyPreset = (presetType) => {
    const provider = localConfig.aiProvider || 'gemini';
    const models = getAvailableModels(provider);
    if (!models || models.length === 0) return;

    const safeMatch = (m, terms) => {
      const text = `${m?.label || ''} ${m?.value || ''}`.toLowerCase();
      return terms.some(term => text.includes(term.toLowerCase()));
    };

    if (presetType === 'balanced') {
      setLocalConfig(prev => ({
        ...prev,
        plannerModel: models[0]?.value,
        navigatorModel: models[0]?.value,
        validatorModel: models[1]?.value || models[0]?.value
      }));
    } else if (presetType === 'speed') {
      const fastModel = models.find(m => safeMatch(m, ['haiku', 'flash', 'mini', '8b', 'instant', 'fast'])) || models[models.length - 1];
      setLocalConfig(prev => ({
        ...prev,
        plannerModel: models[0]?.value,
        navigatorModel: fastModel?.value || models[0]?.value,
        validatorModel: fastModel?.value || models[0]?.value
      }));
    } else if (presetType === 'reasoning') {
      const smartModel = models.find(m => safeMatch(m, ['3-7', '3.7', 'pro', 'opus', 'o1', 'o3', '70b', 'deepseek', 'r1'])) || models[0];
      setLocalConfig(prev => ({
        ...prev,
        plannerModel: smartModel?.value || models[0]?.value,
        navigatorModel: models[0]?.value,
        validatorModel: models[1]?.value || models[0]?.value
      }));
    }
  };

  const currentProviderMeta = PROVIDER_METADATA[localConfig.aiProvider] || PROVIDER_METADATA.gemini;

  // Modern Styles
  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "var(--font-sans, 'Inter', -apple-system, sans-serif)",
    backgroundColor: '#0a0f1e',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
    background: 'var(--gradient-header, linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%))',
    flexShrink: 0,
    minHeight: '56px',
    boxSizing: 'border-box',
    backdropFilter: 'blur(12px)',
    position: 'relative',
    zIndex: 10
  };

  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px 20px 14px',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
    zIndex: 1
  };

  const sectionStyle = {
    padding: '14px 16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    marginBottom: '14px',
    borderRadius: '14px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: 'var(--text-primary, #f1f5f9)',
    fontSize: '12px',
    letterSpacing: '0.01em'
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    fontSize: '13px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    color: '#f1f5f9',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.25)',
    outline: 'none',
    transition: 'all 0.2s ease'
  };

  const selectStyle = {
    width: '100%',
    padding: '10px 36px 10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    fontSize: '13px',
    fontWeight: '500',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#111827',
    color: '#f1f5f9',
    colorScheme: 'dark',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23818cf8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    outline: 'none',
    transition: 'all 0.2s ease'
  };

  const footerStyle = {
    padding: '12px 16px',
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'linear-gradient(to top, #0a0f1e 0%, #111827 100%)',
    flexShrink: 0,
    position: 'relative',
    zIndex: 10
  };

  return (
    <div className="settings-container" style={containerStyle}>
      {/* Neon App Border */}
      <div className="neon-app-border"></div>

      {/* Background Glows */}
      <div className="bg-glow glow-top"></div>
      <div className="bg-glow glow-bottom"></div>

      {/* Background Animation */}
      <div
        className="background-animation"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div className="settings-orb-1" />
        <div className="settings-orb-2" />
        <div className="settings-orb-3" />
      </div>

      {/* Floating Particles */}
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      <div className="particle particle-4"></div>
      <div className="particle particle-5"></div>
      <div className="particle particle-6"></div>

      {/* Header */}
      <div className="settings-header" style={{
        ...headerStyle,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 50px'
      }}>
        <div style={{ minWidth: 0, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="settings-title" style={{
            margin: 0,
            color: '#f1f5f9',
            fontSize: '17px',
            fontWeight: '700',
            lineHeight: '22px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '-0.02em'
          }}>
            <FaCog style={{ color: '#818cf8', fontSize: '16px' }} />
            <span className="shimmer-text" style={{ fontWeight: '800', letterSpacing: '0.04em' }}>SETTINGS</span>
          </h3>
          <p className="settings-subtitle" style={{
            margin: '2px 0 0 0',
            color: 'var(--text-secondary, rgba(241,245,249,0.65))',
            fontSize: '11px',
            lineHeight: '14px',
            textAlign: 'center'
          }}>
            Configure AI provider, API keys & agent models
          </p>
        </div>
        <button
          onClick={handleClose}
          className="settings-button"
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '7px 9px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            color: 'var(--text-accent, #a5b4fc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Close Settings"
        >
          <FaTimes />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="settings-content" style={contentStyle}>

        {/* ── Section 1: AI Provider ────────────────────────── */}
        <div className="settings-provider-section" style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{
              color: '#f1f5f9',
              fontSize: '14px',
              fontWeight: '700',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaRobot style={{ color: '#818cf8' }} />
              AI Provider
            </h4>
            <span style={{
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc'
            }}>
              {currentProviderMeta.badge}
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Choose Provider:</label>
            <select
              value={localConfig.aiProvider || 'gemini'}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="settings-select"
              style={selectStyle}
            >
              <option value="gemini" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>💎 Google Gemini (Recommended)</option>
              <option value="anthropic" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>🔮 Anthropic Claude (Claude 3.5 / 3.7)</option>
              <option value="openai" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>🚀 OpenAI GPT (GPT-4o, o1)</option>
              <option value="groq" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>⚡ Groq (Ultra-Fast & Free Tier)</option>
              <option value="openrouter" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>🌐 OpenRouter (100+ Models)</option>
              <option value="openai-compatible" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>🔧 Custom OpenAI-Compatible Endpoint</option>
              <option value="local" style={{ backgroundColor: '#111827', color: '#f1f5f9' }}>🏠 Local LLM (Ollama / llama-server)</option>
            </select>
          </div>

          {/* Provider Description Tagline */}
          <div style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '15px' }}>{currentProviderMeta.icon}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, rgba(241,245,249,0.75))', lineHeight: '1.4' }}>
              {currentProviderMeta.tagline}
            </span>
          </div>

          {/* Base URL for Custom & Local providers */}
          {(localConfig.aiProvider === 'openai-compatible' || localConfig.aiProvider === 'local') && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <FaServer style={{ marginRight: '5px', fontSize: '11px', color: '#818cf8' }} />
                  Base URL:
                </label>
              </div>

              <input
                type="text"
                value={localConfig.aiProvider === 'local' ? (localConfig.localLLMBaseUrl || '') : (localConfig.customOpenAIBaseUrl || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (localConfig.aiProvider === 'local') {
                    setLocalConfig(prev => ({ ...prev, localLLMBaseUrl: val }));
                  } else {
                    setLocalConfig(prev => ({ ...prev, customOpenAIBaseUrl: val }));
                  }
                  setValidationState(null);
                  setValidationMessage('');
                }}
                placeholder={localConfig.aiProvider === 'local' ? 'http://localhost:11434/v1' : 'https://api.together.xyz/v1'}
                style={inputStyle}
                className="settings-input"
              />

              {/* Quick-fill preset chips for Local LLMs */}
              {localConfig.aiProvider === 'local' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setLocalConfig(prev => ({ ...prev, localLLMBaseUrl: 'http://localhost:11434/v1' }))}
                  >
                    Ollama (11434)
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setLocalConfig(prev => ({ ...prev, localLLMBaseUrl: 'http://localhost:8080/v1' }))}
                  >
                    llama-server (8080)
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setLocalConfig(prev => ({ ...prev, localLLMBaseUrl: 'http://localhost:1234/v1' }))}
                  >
                    LM Studio (1234)
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setLocalConfig(prev => ({ ...prev, localLLMBaseUrl: 'http://localhost:8000/v1' }))}
                  >
                    vLLM (8000)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── API Key Input (Unified, Beautiful & Fully Accessible) ── */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                {localConfig.aiProvider === 'local' ? 'API Key (Optional):' : `${currentProviderMeta.name} API Key:`}
              </label>
              {currentProviderMeta.docsUrl && (
                <a
                  href={currentProviderMeta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px',
                    color: '#818cf8',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500'
                  }}
                >
                  {currentProviderMeta.docsLabel} <FaExternalLinkAlt style={{ fontSize: '9px' }} />
                </a>
              )}
            </div>

            <div className={`settings-key-wrapper ${validationState || ''}`}>
              <FaKey style={{ color: '#818cf8', fontSize: '13px', marginLeft: '4px', flexShrink: 0 }} />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={getCurrentApiKey()}
                onChange={handleApiKeyChange}
                placeholder={currentProviderMeta.placeholder}
                className="settings-key-input"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="settings-icon-btn"
                title={showApiKey ? 'Hide API Key' : 'Show API Key'}
              >
                {showApiKey ? <FaEyeSlash /> : <FaEye />}
              </button>
              <button
                type="button"
                onClick={validateApiKey}
                disabled={isValidating || (!getCurrentApiKey() && localConfig.aiProvider !== 'local')}
                className={`settings-validate-pill ${validationState || (isValidating ? 'checking' : 'default')}`}
              >
                {isValidating ? (
                  <>
                    <FaSpinner className="fa-spin" /> Testing...
                  </>
                ) : validationState === 'valid' ? (
                  <>
                    <FaCheck /> Valid
                  </>
                ) : validationState === 'invalid' ? (
                  <>
                    <FaExclamationTriangle /> Retry
                  </>
                ) : (
                  <>
                    <FaKey /> Test Key
                  </>
                )}
              </button>
            </div>

            {/* Validation Feedback Message */}
            {validationMessage && (
              <div style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: validationState === 'valid' ? 'rgba(16, 185, 129, 0.12)' : validationState === 'invalid' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${validationState === 'valid' ? 'rgba(16, 185, 129, 0.3)' : validationState === 'invalid' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                color: validationState === 'valid' ? '#34d399' : validationState === 'invalid' ? '#f87171' : '#fbbf24'
              }}>
                {validationState === 'valid' && <FaCheckCircle style={{ flexShrink: 0 }} />}
                {validationState === 'invalid' && <FaExclamationTriangle style={{ flexShrink: 0 }} />}
                {validationState === 'checking' && <FaSpinner className="fa-spin" style={{ flexShrink: 0 }} />}
                <span style={{ lineHeight: '1.3' }}>{validationMessage}</span>
              </div>
            )}

            {isFetchingModels && (
              <p style={{ fontSize: '11px', color: '#a5b4fc', margin: '6px 0 0 2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaSpinner className="fa-spin" /> Fetching available model registry...
              </p>
            )}
          </div>

          {/* Model Name Input for Custom/Local */}
          {(localConfig.aiProvider === 'openai-compatible' || localConfig.aiProvider === 'local') && (
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Model Identifier / Name:</label>
              <input
                type="text"
                value={localConfig.aiProvider === 'local' ? (localConfig.localLLMModel || '') : (localConfig.customModel || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (localConfig.aiProvider === 'local') {
                    setLocalConfig(prev => ({ ...prev, localLLMModel: val, navigatorModel: val, plannerModel: val, validatorModel: val }));
                  } else {
                    setLocalConfig(prev => ({ ...prev, customModel: val, navigatorModel: val, plannerModel: val, validatorModel: val }));
                  }
                }}
                placeholder={localConfig.aiProvider === 'local' ? 'e.g., llama3.1, qwen2.5, mistral' : 'e.g., meta-llama/Llama-3-70b-chat-hf'}
                style={inputStyle}
                className="settings-input"
              />
            </div>
          )}
        </div>

        {/* ── Section 2: Agent Models & Presets ──────────────── */}
        <div className="settings-provider-section" style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{
              color: '#f1f5f9',
              fontSize: '14px',
              fontWeight: '700',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaBrain style={{ color: '#818cf8' }} />
              Agent Models
            </h4>
            <button
              type="button"
              onClick={fetchModels}
              disabled={isFetchingModels || !['anthropic', 'openai', 'gemini', 'groq', 'openrouter'].includes(localConfig.aiProvider)}
              style={{
                padding: '5px 10px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                borderRadius: '8px',
                color: '#a5b4fc',
                cursor: isFetchingModels ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                opacity: isFetchingModels ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              title="Fetch live models from provider API"
            >
              {isFetchingModels ? <FaSpinner className="fa-spin" /> : <FaDatabase />} Refresh Models
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary, rgba(241,245,249,0.5))', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Presets:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => applyPreset('balanced')}
                className="preset-card-btn"
                style={{
                  padding: '8px 6px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                🚀 Balanced
              </button>
              <button
                type="button"
                onClick={() => applyPreset('speed')}
                className="preset-card-btn"
                style={{
                  padding: '8px 6px',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                ⚡ High Speed
              </button>
              <button
                type="button"
                onClick={() => applyPreset('reasoning')}
                className="preset-card-btn"
                style={{
                  padding: '8px 6px',
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                🧠 Deep Think
              </button>
            </div>
          </div>

          {/* Model Recommendation Cards (When models are fetched) */}
          {fetchedModels.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
              marginBottom: '14px'
            }}>
              {(() => {
                const available = getAvailableModels(localConfig.aiProvider);
                const safeFind = (terms) => available.find(m => {
                  const text = `${m?.label || ''} ${m?.value || ''}`.toLowerCase();
                  return terms.some(term => text.includes(term.toLowerCase()));
                });

                return [
                  { label: '🏆 Best Overall', model: available[0] },
                  { label: '⚡ Fastest', model: safeFind(['fast', 'flash', 'mini', '8b', 'instant', 'haiku']) },
                  { label: '🧠 Smartest', model: safeFind(['pro', 'opus', 'reasoning', '3-7', '3.7', 'o1', '70b', 'deepseek']) },
                  { label: '💰 Cheapest', model: safeFind(['affordable', '8b', '3.5-turbo', 'mini', 'flash', 'haiku']) }
                ].filter(item => item.model && item.model.value);
              })().map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setLocalConfig(prev => ({
                      ...prev,
                      navigatorModel: item.model.value,
                      plannerModel: prev.plannerModel || item.model.value
                    }));
                  }}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#a5b4fc', fontWeight: '600', marginBottom: '2px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.model.label}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Granular Model Dropdowns with Categorized Optgroups */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              <FaClipboardList style={{ marginRight: '6px', color: '#818cf8' }} />
              Planner Model (Strategy & Reasoning):
            </label>
            <select
              value={localConfig.plannerModel || getAvailableModels(localConfig.aiProvider || 'gemini')[0]?.value}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, plannerModel: e.target.value }))}
              className="settings-select"
              style={selectStyle}
            >
              {renderModelOptions(localConfig.aiProvider || 'gemini')}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              <FaCompass style={{ marginRight: '6px', color: '#818cf8' }} />
              Navigator Model (Browser Actions & Vision):
            </label>
            <select
              value={localConfig.navigatorModel || getAvailableModels(localConfig.aiProvider || 'gemini')[0]?.value}
              onChange={(e) => {
                const val = e.target.value;
                setLocalConfig(prev => ({
                  ...prev,
                  navigatorModel: val,
                  plannerModel: (!prev.plannerModel || prev.plannerModel === getAvailableModels(prev.aiProvider)[0]?.value) ? val : prev.plannerModel
                }));
              }}
              className="settings-select"
              style={selectStyle}
            >
              {renderModelOptions(localConfig.aiProvider || 'gemini')}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              <FaCheckCircle style={{ marginRight: '6px', color: '#818cf8' }} />
              Validator Model (Goal Verification):
            </label>
            <select
              value={localConfig.validatorModel || getAvailableModels(localConfig.aiProvider || 'gemini')[1]?.value || getAvailableModels(localConfig.aiProvider || 'gemini')[0]?.value}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, validatorModel: e.target.value }))}
              className="settings-select"
              style={selectStyle}
            >
              {renderModelOptions(localConfig.aiProvider || 'gemini')}
            </select>
          </div>

          <div style={{
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
            padding: '8px 10px',
            marginTop: '10px'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary, rgba(241,245,249,0.7))', lineHeight: '1.4' }}>
              💡 <strong>Tip:</strong> You can use fast models (Flash, Haiku, Mini) for Navigator/Validator to speed up automation and save API tokens.
            </p>
          </div>
        </div>

      </div>

      {/* ── Fixed Footer ──────────────────────────────────── */}
      <div style={footerStyle}>
        <button
          data-save-button
          className="neon-btn"
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '11px 16px',
            backgroundColor: 'var(--accent-primary, #6366f1)',
            color: 'white',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          <FaSave />
          Save & Proceed
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
