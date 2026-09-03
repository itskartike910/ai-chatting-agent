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
  FaDatabase
} from 'react-icons/fa';

const SettingsModal = () => {
  const { config, updateConfig } = useConfig();
  const [localConfig, setLocalConfig] = useState(config);
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
      case 'anthropic': return localConfig.anthropicApiKey;
      case 'openai': return localConfig.openaiApiKey;
      case 'gemini': return localConfig.geminiApiKey;
      case 'groq': return localConfig.groqApiKey;
      case 'openrouter': return localConfig.openrouterApiKey;
      case 'openai-compatible': return localConfig.customOpenAIApiKey;
      case 'local': return localConfig.localLLMApiKey;
      default: return '';
    }
  };

  // Get base URL for current provider
  const getCurrentBaseUrl = () => {
    switch (localConfig.aiProvider) {
      case 'openai-compatible': return localConfig.customOpenAIBaseUrl;
      case 'local': return localConfig.localLLMBaseUrl;
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
          setValidationMessage(result.message || 'API key is valid');
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

  // Handle API key change with auto-validation
  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setValidationState(null);
    setValidationMessage('');
    setFetchedModels([]);

    // Update the config based on provider
    switch (localConfig.aiProvider) {
      case 'anthropic':
        setLocalConfig({ ...localConfig, anthropicApiKey: newApiKey });
        break;
      case 'openai':
        setLocalConfig({ ...localConfig, openaiApiKey: newApiKey });
        break;
      case 'gemini':
        setLocalConfig({ ...localConfig, geminiApiKey: newApiKey });
        break;
      case 'groq':
        setLocalConfig({ ...localConfig, groqApiKey: newApiKey });
        break;
      case 'openrouter':
        setLocalConfig({ ...localConfig, openrouterApiKey: newApiKey });
        break;
      case 'openai-compatible':
        setLocalConfig({ ...localConfig, customOpenAIApiKey: newApiKey });
        break;
      case 'local':
        setLocalConfig({ ...localConfig, localLLMApiKey: newApiKey });
        break;
      default:
        break;
    }
  };

  const handleClose = () => {
    navigate('/chat');
  };

  const handleSave = async () => {
    try {
      console.log('💾 Saving configuration...');

      // Show saving state
      const saveButton = document.querySelector('[data-save-button]');
      if (saveButton) {
        saveButton.textContent = '💾 Saving...';
        saveButton.disabled = true;
      }

      // Update config
      await updateConfig(localConfig);

      // Since we only use personal API now, no need to set userPreferPersonalAPI

      // Return authentication success back to useAuth through chrome storage changes,
      // handled automatically if useAuth re-renders on route or storage changes.

      // Show success briefly
      if (saveButton) {
        saveButton.textContent = '✅ Saved!';
        setTimeout(() => {
          // Hard reload if coming from settings to reload useAuth properly 
          // (or a react router nav is enough if useAuth listens appropriately)
          navigate('/chat');
          window.location.reload();
        }, 500);
      } else {
        navigate('/chat');
        window.location.reload();
      }

    } catch (error) {
      console.error('Failed to save config:', error);

      // Show error
      const saveButton = document.querySelector('[data-save-button]');
      if (saveButton) {
        saveButton.textContent = '❌ Error';
        saveButton.disabled = false;
        setTimeout(() => {
          saveButton.textContent = '💾 Save';
        }, 2000);
      }
    }
  };

  // Categorize models with recommendations
  const categorizeModels = (models, provider) => {
    if (!models || models.length === 0) return { categories: [], all: [] };

    // Define categorization rules per provider
    const categoryRules = {
      anthropic: {
        '🏆 Latest & Best': (id) => id.includes('3-7-sonnet') || id.includes('3-5-sonnet-20241022'),
        '⚡ Fast & Affordable': (id) => id.includes('haiku'),
        '🧠 Reasoning': (id) => id.includes('opus') || id.includes('3-7-sonnet'),
        '📦 Previous Gen': (id) => id.includes('3-sonnet-20240229') || id.includes('3-opus-20240229')
      },
      openai: {
        '🏆 Latest & Best': (id) => id === 'gpt-4o' || id === 'o1-preview',
        '⚡ Fast & Affordable': (id) => id.includes('mini') || id === 'gpt-3.5-turbo',
        '🧠 Reasoning': (id) => id.startsWith('o1-'),
        '📦 Previous Gen': (id) => id.includes('gpt-4-turbo') || id === 'gpt-4'
      },
      gemini: {
        '🏆 Latest & Best': (id) => id.includes('2.5-flash') || id.includes('2.5-pro'),
        '⚡ Fast & Affordable': (id) => id.includes('flash') && !id.includes('2.5'),
        '🧠 Reasoning': (id) => id.includes('2.5-pro'),
        '📦 Previous Gen': (id) => id.includes('1.5-pro') || id.includes('1.5-flash')
      },
      groq: {
        '🏆 Latest & Best': (id) => id.includes('3.3-70b') || id.includes('3.1-70b'),
        '⚡ Fast & Affordable': (id) => id.includes('8b-instant') || id.includes('gemma2-9b'),
        '🧠 Reasoning': (id) => id.includes('70b'),
        '📦 Previous Gen': (id) => id.includes('mixtral')
      },
      openrouter: {
        '🏆 Latest & Best': (id) => id.includes('claude-3.5-sonnet') || id.includes('gpt-4o') || id.includes('gemini-pro-1.5'),
        '⚡ Fast & Affordable': (id) => id.includes('haiku') || id.includes('flash') || id.includes('8b-instruct'),
        '🧠 Reasoning': (id) => id.includes('opus') || id.includes('mistral-large') || id.includes('70b-instruct'),
        '📦 Other Models': (id) => true // fallback
      }
    };

    const rules = categoryRules[provider] || {
      '🏆 Recommended': (id) => true,
      '⚡ Fast': (id) => false,
      '🧠 Capable': (id) => false
    };

    const categorized = {};
    const used = new Set();

    // Assign models to categories
    Object.entries(rules).forEach(([category, matchFn]) => {
      const categoryModels = models.filter(m => {
        if (used.has(m.value)) return false;
        if (matchFn(m.value)) {
          used.add(m.value);
          return true;
        }
        return false;
      });
      if (categoryModels.length > 0) {
        categorized[category] = categoryModels;
      }
    });

    // Add remaining models to "Other" category
    const remaining = models.filter(m => !used.has(m.value));
    if (remaining.length > 0) {
      categorized['📦 Other Models'] = remaining;
    }

    // Flatten for dropdown with category headers
    const all = [];
    Object.entries(categorized).forEach(([category, catModels]) => {
      all.push({ isCategory: true, category, label: category });
      catModels.forEach(model => all.push({ ...model, category }));
    });

    return { categories: Object.keys(categorized), all, categorized };
  };

  // Get available models based on provider - uses fetched models if available
  const getAvailableModels = (provider) => {
    // If we have fetched models, use those
    if (fetchedModels.length > 0) {
      return fetchedModels.map(model => ({
        value: model.id,
        label: model.name || model.id,
        description: model.description
      }));
    }

    // Fallback to static models
    switch (provider) {
      case 'anthropic':
        return [
          { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (Latest, Reasoning)' },
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)' },
          { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Latest Fast)' },
          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast)' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' }
        ];
      case 'openai':
        return [
          { value: 'o1-preview', label: 'o1-preview (Latest Reasoning)' },
          { value: 'o1-mini', label: 'o1-mini (Fast Reasoning)' },
          { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Affordable)' }
        ];
      case 'gemini':
        return [
          { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Latest)' },
          { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Latest, Reasoning)' },
          { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' }
        ];
      case 'groq':
        return [
          { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Latest)' },
          { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
          { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Fast)' },
          { value: 'gemma2-9b-it', label: 'Gemma 2 9B IT' },
          { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
        ];
      case 'openrouter':
        return [
          { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (via OpenRouter)' },
          { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus (via OpenRouter)' },
          { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (via OpenRouter)' },
          { value: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
          { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (via OpenRouter)' },
          { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5 (via OpenRouter)' },
          { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (via OpenRouter)' },
          { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct (via OpenRouter)' },
          { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct (via OpenRouter)' },
          { value: 'mistralai/mistral-large', label: 'Mistral Large (via OpenRouter)' }
        ];
      case 'openai-compatible':
        // For custom OpenAI-compatible, we show a text input for model name
        return [
          { value: localConfig.customModel || '', label: 'Custom Model (enter name below)' }
        ];
      case 'local':
        // For local LLMs, we show a text input for model name
        return [
          { value: localConfig.localLLMModel || '', label: 'Local Model (enter name below)' }
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
        <option key={model.value} value={model.value}>
          {model.label} {model.recommended ? ' ⭐' : ''}
        </option>
      ));
    }
    return categoryEntries.map(([category, catModels]) => (
      <optgroup key={category} label={category}>
        {catModels.map(model => (
          <option key={model.value} value={model.value}>
            {model.label} {model.recommended ? ' ⭐' : ''}
          </option>
        ))}
      </optgroup>
    ));
  };

  // Consistent styling with other pages
  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#0a0f1e',
    overflow: 'hidden',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
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
    backdropFilter: 'blur(12px)'
  };

  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '0',
    WebkitOverflowScrolling: 'touch'
  };

  const sectionStyle = {
    padding: '16px',
    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
    backgroundColor: 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
    backdropFilter: 'blur(8px)',
    margin: '8px',
    borderRadius: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: 'var(--text-primary, #f1f5f9)',
    fontSize: '13px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-medium, rgba(255,255,255,0.12))',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(8px)',
    color: 'var(--text-primary, #f1f5f9)',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a5b4fc' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 8px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '32px',
    backdropFilter: 'blur(10px)'
  };

  const footerStyle = {
    padding: '12px 16px',
    display: 'flex',
    gap: '8px',
    borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
    background: 'linear-gradient(to top, var(--bg-primary, #0a0f1e), var(--bg-secondary, #111827))',
    flexShrink: 0
  };

  const buttonStyle = {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  };

  return (
    <div className="settings-container" style={containerStyle}>
      {/* Neon App Border */}
      <div className="neon-app-border"></div>

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
        <div
          className="settings-orb-1"
          style={{
            position: "absolute",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.3), rgba(139,92,246,0.1))",
            filter: "blur(40px)",
            opacity: 0.2,
            top: "10%",
            left: "10%",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          className="settings-orb-2"
          style={{
            position: "absolute",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.2), rgba(99,102,241,0.1))",
            filter: "blur(40px)",
            opacity: 0.2,
            top: "60%",
            right: "15%",
            animation: "float 6s ease-in-out infinite 2s",
          }}
        />
        <div
          className="settings-orb-3"
          style={{
            position: "absolute",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.2), rgba(99,102,241,0.08))",
            filter: "blur(40px)",
            opacity: 0.2,
            bottom: "20%",
            left: "20%",
            animation: "float 6s ease-in-out infinite 4s",
          }}
        />
      </div>

      {/* Floating Particles */}
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      <div className="particle particle-4"></div>
      <div className="particle particle-5"></div>
      <div className="particle particle-6"></div>
      <div className="particle particle-7"></div>
      <div className="particle particle-8"></div>
      <div className="particle particle-9"></div>
      <div className="particle particle-10"></div>
      <div className="particle particle-11"></div>
      <div className="particle particle-12"></div>

      {/* Custom CSS for placeholder styling */}
      <style>
        {`
          .settings-input::placeholder {
            color: rgba(165, 180, 252, 0.5) !important;
            opacity: 1 !important;
          }
          .settings-input::-webkit-input-placeholder {
            color: rgba(165, 180, 252, 0.5) !important;
          }
          .settings-input::-moz-placeholder {
            color: rgba(255, 220, 220, 0.6) !important;
          }
          .settings-input:-ms-input-placeholder {
            color: rgba(255, 220, 220, 0.6) !important;
          }
        `}
      </style>

      {/* Header */}
      <div className="settings-header" style={headerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="settings-title" style={{
            margin: 0,
            color: '#FFDCDCFF',
            fontSize: '18px',
            fontWeight: '700',
            lineHeight: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <FaCog />
            SETTINGS
          </h3>
          <p className="settings-subtitle" style={{
            margin: 0,
            color: 'var(--text-secondary, rgba(241,245,249,0.7))',
            fontSize: '12px',
            lineHeight: '14px',
            marginTop: '2px'
          }}>
            Configure AI models and preferences
          </p>
        </div>
        <button
          onClick={handleClose}
          className="settings-button"
          style={{
            padding: '6px 8px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--text-accent, #a5b4fc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FaTimes />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="settings-content" style={contentStyle}>
        {/* AI Provider Section */}
        <div className="settings-provider-section" style={sectionStyle}>
          <h4 style={{
            color: '#FFDCDCFF',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaRobot />
            AI Provider
          </h4>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              Choose Provider:
            </label>
            <select
              value={localConfig.aiProvider || 'gemini'}
              onChange={(e) => {
                const newProvider = e.target.value;
                const availableModels = getAvailableModels(newProvider);
                const newConfig = {
                  ...localConfig,
                  aiProvider: newProvider,
                  navigatorModel: availableModels[0]?.value,
                  plannerModel: availableModels[0]?.value,
                  validatorModel: availableModels[2]?.value || availableModels[1]?.value || availableModels[0]?.value
                };
                setLocalConfig(newConfig);
              }}
              style={selectStyle}
            >
              <option value="gemini">💎 Google Gemini</option>
              <option value="anthropic">🔮 Anthropic Claude</option>
              <option value="openai">🚀 OpenAI GPT</option>
              <option value="groq">⚡ Groq (Fast & Free)</option>
              <option value="openrouter">🌐 OpenRouter (Multi-Provider)</option>
              <option value="openai-compatible">🔧 Custom OpenAI-Compatible</option>
              <option value="local">🏠 Local LLM (Ollama/llama-server)</option>
            </select>
          </div>

          {/* API Key Inputs */}
          {localConfig.aiProvider === 'anthropic' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Anthropic API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.anthropicApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="sk-ant-api03-..."
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || !localConfig.anthropicApiKey}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || !localConfig.anthropicApiKey ? 'not-allowed' : 'pointer',
                    opacity: isValidating || !localConfig.anthropicApiKey ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
            </div>
          )}

          {localConfig.aiProvider === 'openai' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                OpenAI API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.openaiApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="sk-proj-..."
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || !localConfig.openaiApiKey}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || !localConfig.openaiApiKey ? 'not-allowed' : 'pointer',
                    opacity: isValidating || !localConfig.openaiApiKey ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
            </div>
          )}

          {localConfig.aiProvider === 'gemini' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Gemini API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.geminiApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="AIza..."
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || !localConfig.geminiApiKey}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || !localConfig.geminiApiKey ? 'not-allowed' : 'pointer',
                    opacity: isValidating || !localConfig.geminiApiKey ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
              <p style={{ fontSize: '11px', color: 'rgba(255, 220, 220, 0.7)', margin: '4px 0 0 0' }}>
                Get from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Google AI Studio</a>
              </p>
            </div>
          )}

          {localConfig.aiProvider === 'groq' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Groq API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.groqApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="gsk_..."
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || !localConfig.groqApiKey}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || !localConfig.groqApiKey ? 'not-allowed' : 'pointer',
                    opacity: isValidating || !localConfig.groqApiKey ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
              <p style={{ fontSize: '11px', color: 'rgba(255, 220, 220, 0.7)', margin: '4px 0 0 0' }}>
                Get from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Groq Console</a> (Free tier available)
              </p>
            </div>
          )}

          {localConfig.aiProvider === 'openrouter' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                OpenRouter API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.openrouterApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="sk-or-v1-..."
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || !localConfig.openrouterApiKey}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || !localConfig.openrouterApiKey ? 'not-allowed' : 'pointer',
                    opacity: isValidating || !localConfig.openrouterApiKey ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
              <p style={{ fontSize: '11px', color: 'rgba(255, 220, 220, 0.7)', margin: '4px 0 0 0' }}>
                Get from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>OpenRouter</a> (Access 100+ models)
              </p>
            </div>
          )}

          {localConfig.aiProvider === 'openai-compatible' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Base URL:
              </label>
              <input
                type="text"
                value={localConfig.customOpenAIBaseUrl || ''}
                onChange={(e) => {
                  setLocalConfig({ ...localConfig, customOpenAIBaseUrl: e.target.value });
                  setValidationState(null);
                  setValidationMessage('');
                  setFetchedModels([]);
                }}
                placeholder="https://api.example.com/v1"
                style={inputStyle}
                className="settings-input"
              />
              <label style={{ ...labelStyle, marginTop: '8px' }}>
                API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.customOpenAIApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="sk-... (optional for some endpoints)"
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || (!localConfig.customOpenAIApiKey && !localConfig.customOpenAIBaseUrl)}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || (!localConfig.customOpenAIApiKey && !localConfig.customOpenAIBaseUrl) ? 'not-allowed' : 'pointer',
                    opacity: isValidating || (!localConfig.customOpenAIApiKey && !localConfig.customOpenAIBaseUrl) ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
              <label style={{ ...labelStyle, marginTop: '8px' }}>
                Model Name:
              </label>
              <input
                type="text"
                value={localConfig.customModel || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, customModel: e.target.value })}
                placeholder="e.g., llama-3.1-70b, gpt-4o, etc."
                style={inputStyle}
                className="settings-input"
              />
              <p style={{ fontSize: '11px', color: 'rgba(255, 220, 220, 0.7)', margin: '4px 0 0 0' }}>
                Any OpenAI-compatible API (vLLM, LM Studio, Together AI, etc.)
              </p>
            </div>
          )}

          {localConfig.aiProvider === 'local' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Base URL:
              </label>
              <input
                type="text"
                value={localConfig.localLLMBaseUrl || ''}
                onChange={(e) => {
                  setLocalConfig({ ...localConfig, localLLMBaseUrl: e.target.value });
                  setValidationState(null);
                  setValidationMessage('');
                  setFetchedModels([]);
                }}
                placeholder="http://localhost:11434/v1 (Ollama) or http://localhost:8080/v1 (llama-server)"
                style={inputStyle}
                className="settings-input"
              />
              <label style={{ ...labelStyle, marginTop: '8px' }}>
                API Key (optional):
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="password"
                  value={localConfig.localLLMApiKey || ''}
                  onChange={handleApiKeyChange}
                  placeholder="Usually not needed for local servers"
                  style={{ ...inputStyle, flex: 1 }}
                  className="settings-input"
                />
                <button
                  type="button"
                  onClick={validateApiKey}
                  disabled={isValidating || !localConfig.localLLMBaseUrl}
                  style={{
                    ...inputStyle,
                    padding: '10px 16px',
                    backgroundColor: validationState === 'valid' ? 'rgba(23, 191, 99, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: validationState === 'valid' ? '#17bf63' : 'rgba(99, 102, 241, 0.5)',
                    color: validationState === 'valid' ? '#17bf63' : 'var(--text-accent, #a5b4fc)',
                    cursor: isValidating || !localConfig.localLLMBaseUrl ? 'not-allowed' : 'pointer',
                    opacity: isValidating || !localConfig.localLLMBaseUrl ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isValidating ? <FaSpinner className="fa-spin" /> : validationState === 'valid' ? <FaCheck /> : <FaKey />}
                </button>
              </div>
              {validationMessage && (
                <p style={{
                  fontSize: '11px',
                  color: validationState === 'valid' ? '#17bf63' : validationState === 'invalid' ? '#e0245e' : '#ffad1f',
                  margin: '4px 0 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {validationState === 'valid' && <FaCheckCircle />}
                  {validationState === 'invalid' && <FaExclamationTriangle />}
                  {validationMessage}
                </p>
              )}
              {isFetchingModels && <p style={{ fontSize: '11px', color: '#ffad1f', margin: '4px 0 0 0' }}><FaSpinner className="fa-spin" /> Fetching models...</p>}
              <label style={{ ...labelStyle, marginTop: '8px' }}>
                Model Name:
              </label>
              <input
                type="text"
                value={localConfig.localLLMModel || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, localLLMModel: e.target.value })}
                placeholder="e.g., llama3.1, qwen2.5, mistral, etc."
                style={inputStyle}
                className="settings-input"
              />
              <p style={{ fontSize: '11px', color: 'rgba(255, 220, 220, 0.7)', margin: '4px 0 0 0' }}>
                Supports Ollama, llama-server, LM Studio, vLLM, etc. No API key usually required.
              </p>
            </div>
          )}
        </div>

        {/* Agent Models Section */}
        <div className="settings-provider-section" style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{
              color: '#FFDCDCFF',
              fontSize: '16px',
              fontWeight: '600',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaBrain />
              Agent Models
            </h4>
            <button
              type="button"
              onClick={fetchModels}
              disabled={isFetchingModels || !['anthropic', 'openai', 'gemini', 'groq', 'openrouter'].includes(localConfig.aiProvider)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.5)',
                borderRadius: '6px',
                color: 'var(--text-accent, #a5b4fc)',
                cursor: isFetchingModels ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: isFetchingModels ? 0.6 : 1
              }}
              title="Fetch latest models from provider"
            >
              {isFetchingModels ? <FaSpinner className="fa-spin" /> : <FaDatabase />} Refresh Models
            </button>
          </div>

          {/* Model Recommendation Cards */}
          {fetchedModels.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              marginBottom: '16px'
            }}>
              {[
                { label: '🏆 Best Overall', model: getAvailableModels(localConfig.aiProvider)[0] },
                { label: '⚡ Fastest', model: getAvailableModels(localConfig.aiProvider).find(m => m.label?.toLowerCase().includes('fast') || m.label?.toLowerCase().includes('flash') || m.label?.toLowerCase().includes('mini')) },
                { label: '🧠 Smartest', model: getAvailableModels(localConfig.aiProvider).find(m => m.label?.toLowerCase().includes('pro') || m.label?.toLowerCase().includes('opus') || m.label?.toLowerCase().includes('reasoning')) },
                { label: '💰 Cheapest', model: getAvailableModels(localConfig.aiProvider).find(m => m.label?.toLowerCase().includes('affordable') || m.label?.toLowerCase().includes('8b') || m.label?.toLowerCase().includes('3.5-turbo')) }
              ].filter(item => item.model).map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const newConfig = { ...localConfig, navigatorModel: item.model.value };
                    if (!localConfig.plannerModel) {
                      newConfig.plannerModel = item.model.value;
                    }
                    setLocalConfig(newConfig);
                  }}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#a5b4fc', fontWeight: '600', marginBottom: '4px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.model.label}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Detailed Model Dropdowns */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              <FaClipboardList style={{ marginRight: '6px' }} />
              Planner (strategy):
            </label>
            <select
              value={localConfig.plannerModel || getAvailableModels(localConfig.aiProvider || 'anthropic')[0]?.value}
              onChange={(e) => setLocalConfig({ ...localConfig, plannerModel: e.target.value })}
              style={selectStyle}
            >
              {renderModelOptions(localConfig.aiProvider || 'anthropic')}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              <FaCompass style={{ marginRight: '6px' }} />
              Navigator (actions):
            </label>
            <select
              value={localConfig.navigatorModel || getAvailableModels(localConfig.aiProvider || 'anthropic')[0]?.value}
              onChange={(e) => {
                const newConfig = { ...localConfig, navigatorModel: e.target.value };
                if (!localConfig.plannerModel || localConfig.plannerModel === getAvailableModels(localConfig.aiProvider || 'anthropic')[0]?.value) {
                  newConfig.plannerModel = e.target.value;
                }
                setLocalConfig(newConfig);
              }}
              style={selectStyle}
            >
              {renderModelOptions(localConfig.aiProvider || 'anthropic')}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              <FaCheckCircle style={{ marginRight: '6px' }} />
              Validator (check):
            </label>
            <select
              value={localConfig.validatorModel || getAvailableModels(localConfig.aiProvider || 'anthropic')[2]?.value}
              onChange={(e) => setLocalConfig({ ...localConfig, validatorModel: e.target.value })}
              style={selectStyle}
            >
              {renderModelOptions(localConfig.aiProvider || 'anthropic')}
            </select>
          </div>

          <div style={{
            backgroundColor: '#1e1b4b',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '6px',
            padding: '8px',
            marginTop: '10px'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary, rgba(241,245,249,0.7))' }}>
              💡 Click a recommendation card above to auto-fill the Navigator model. Use faster models (Haiku, Mini, Flash) for validation to save costs.
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div style={footerStyle}>
        {/* <button 
          onClick={handleClose}
          style={{ 
            ...buttonStyle,
            backgroundColor: 'rgba(255, 220, 220, 0.2)',
            color: '#FFDCDCFF',
            border: '1px solid rgba(255, 220, 220, 0.3)'
          }}
        >
          <FaTimes />
          Cancel
        </button> */}
        <button
          data-save-button
          className="neon-btn"
          onClick={handleSave}
          style={{
            ...buttonStyle,
            backgroundColor: 'var(--accent-primary, #6366f1)',
            color: 'white',
            borderRadius: '10px',
            position: 'relative',
            zIndex: 1
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
