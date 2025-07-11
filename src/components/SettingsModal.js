import React, { useState, useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';
import { AI_MODELS } from '../utils/constants';

const SettingsModal = ({ onClose }) => {
  const { config, updateConfig } = useConfig();
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    updateConfig(localConfig);
    onClose();
  };

  // Get available models based on provider
  const getAvailableModels = (provider) => {
    switch (provider) {
      case 'anthropic':
        return [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Latest)', recommended: true },
          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast)' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' }
        ];
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o (Latest)', recommended: true },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Affordable)' }
        ];
      case 'gemini':
        return [
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Latest)', recommended: true },
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
          { value: 'gemini-pro', label: 'Gemini Pro' }
        ];
      default:
        return [];
    }
  };

  // Full page mobile-optimized styles
  const containerStyle = {
    width: '100vw',
    height: '100vh',
    maxWidth: '400px',
    maxHeight: '600px',
    display: 'flex', 
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  };

  const headerStyle = {
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '12px 16px',
    borderBottom: '1px solid #e1e8ed',
    backgroundColor: '#ffffff',
    flexShrink: 0
  };

  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '0'
  };

  const sectionStyle = {
    padding: '16px',
    borderBottom: '1px solid #f7f9fa'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#14171a',
    fontSize: '13px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e1e8ed',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
    backgroundPosition: 'right 8px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '32px'
  };

  const checkboxContainerStyle = {
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f7f9fa',
    borderRadius: '6px',
    marginBottom: '8px'
  };

  const footerStyle = {
    padding: '12px 16px',
    display: 'flex', 
    gap: '8px', 
    borderTop: '1px solid #e1e8ed',
    backgroundColor: '#f7f9fa',
    flexShrink: 0
  };

  const buttonStyle = {
    flex: 1,
    padding: '10px 16px', 
    borderRadius: '8px', 
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    textAlign: 'center'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={{ margin: 0, color: '#14171a', fontSize: '18px', fontWeight: '700' }}>
            ⚙️ Settings
          </h3>
          <p style={{ margin: 0, color: '#657786', fontSize: '12px' }}>
            Configure AI models
          </p>
        </div>
        <button 
          onClick={onClose} 
          style={{ 
            background: '#f7f9fa', 
            border: '1px solid #e1e8ed',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            color: '#657786',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* AI Provider Section */}
        <div style={sectionStyle}>
          <h4 style={{ color: '#14171a', marginBottom: '12px', fontSize: '15px', fontWeight: '600', margin: '0 0 12px 0' }}>
            🤖 AI Provider
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              Choose Provider:
            </label>
            <select 
              value={localConfig.aiProvider || 'anthropic'}
              onChange={(e) => {
                const newProvider = e.target.value;
                const availableModels = getAvailableModels(newProvider);
                const newConfig = {
                  ...localConfig, 
                  aiProvider: newProvider,
                  // Reset to default models for the new provider
                  navigatorModel: availableModels[0]?.value,
                  plannerModel: availableModels[0]?.value,
                  validatorModel: availableModels[2]?.value || availableModels[1]?.value || availableModels[0]?.value
                };
                setLocalConfig(newConfig);
              }}
              style={selectStyle}
            >
              <option value="anthropic">🔮 Anthropic Claude</option>
              <option value="openai">🚀 OpenAI GPT</option>
              <option value="gemini">💎 Google Gemini</option>
            </select>
          </div>

          {/* API Key Input */}
          {localConfig.aiProvider === 'anthropic' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Anthropic API Key:
              </label>
              <input
                type="password"
                value={localConfig.anthropicApiKey || ''}
                onChange={(e) => setLocalConfig({...localConfig, anthropicApiKey: e.target.value})}
                placeholder="sk-ant-api03-..."
                style={inputStyle}
              />
            </div>
          )}

          {localConfig.aiProvider === 'openai' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                OpenAI API Key:
              </label>
              <input
                type="password"
                value={localConfig.openaiApiKey || ''}
                onChange={(e) => setLocalConfig({...localConfig, openaiApiKey: e.target.value})}
                placeholder="sk-proj-..."
                style={inputStyle}
              />
            </div>
          )}

          {localConfig.aiProvider === 'gemini' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>
                Gemini API Key:
              </label>
              <input
                type="password"
                value={localConfig.geminiApiKey || ''}
                onChange={(e) => setLocalConfig({...localConfig, geminiApiKey: e.target.value})}
                placeholder="AIza..."
                style={inputStyle}
              />
              <p style={{ fontSize: '11px', color: '#657786', margin: '4px 0 0 0' }}>
                Get from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2' }}>Google AI Studio</a>
              </p>
            </div>
          )}
        </div>

        {/* Agent Models Section */}
        <div style={sectionStyle}>
          <h4 style={{ color: '#14171a', marginBottom: '12px', fontSize: '15px', fontWeight: '600', margin: '0 0 12px 0' }}>
            🧠 Agent Models
          </h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              🧭 Navigator (actions):
            </label>
            <select
              value={localConfig.navigatorModel || getAvailableModels(localConfig.aiProvider || 'anthropic')[0]?.value}
              onChange={(e) => {
                const newConfig = {...localConfig, navigatorModel: e.target.value};
                if (!localConfig.plannerModel || localConfig.plannerModel === getAvailableModels(localConfig.aiProvider || 'anthropic')[0]?.value) {
                  newConfig.plannerModel = e.target.value;
                }
                setLocalConfig(newConfig);
              }}
              style={selectStyle}
            >
              {getAvailableModels(localConfig.aiProvider || 'anthropic').map(model => (
                <option key={model.value} value={model.value}>
                  {model.label} {model.recommended ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              📋 Planner (strategy):
            </label>
            <select
              value={localConfig.plannerModel || getAvailableModels(localConfig.aiProvider || 'anthropic')[0]?.value}
              onChange={(e) => setLocalConfig({...localConfig, plannerModel: e.target.value})}
              style={selectStyle}
            >
              {getAvailableModels(localConfig.aiProvider || 'anthropic').map(model => (
                <option key={model.value} value={model.value}>
                  {model.label} {model.recommended ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>
              ✅ Validator (check):
            </label>
            <select
              value={localConfig.validatorModel || getAvailableModels(localConfig.aiProvider || 'anthropic')[2]?.value}
              onChange={(e) => setLocalConfig({...localConfig, validatorModel: e.target.value})}
              style={selectStyle}
            >
              {getAvailableModels(localConfig.aiProvider || 'anthropic').map(model => (
                <option key={model.value} value={model.value}>
                  {model.label} {model.recommended ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ 
            backgroundColor: '#e6f3ff', 
            border: '1px solid #b3d9ff',
            borderRadius: '6px', 
            padding: '8px', 
            marginTop: '12px'
          }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#0066cc' }}>
              💡 Use faster models (Haiku, Mini, Flash) for validation to save costs
            </p>
          </div>
        </div>

        {/* Social Media Settings */}
        <div style={sectionStyle}>
          <h4 style={{ color: '#14171a', marginBottom: '12px', fontSize: '15px', fontWeight: '600', margin: '0 0 12px 0' }}>
            📱 Preferences
          </h4>
          
          <label style={checkboxContainerStyle}>
            <input
              type="checkbox"
              checked={localConfig.autoLogin || false}
              onChange={(e) => setLocalConfig({...localConfig, autoLogin: e.target.checked})}
              style={{ width: '16px', height: '16px', margin: '2px 0 0 0' }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#14171a' }}>
                🔐 Auto-login assistance
              </div>
              <div style={{ fontSize: '11px', color: '#657786' }}>
                Help fill login forms
              </div>
            </div>
          </label>

          <label style={checkboxContainerStyle}>
            <input
              type="checkbox"
              checked={localConfig.safeMode !== false}
              onChange={(e) => setLocalConfig({...localConfig, safeMode: e.target.checked})}
              style={{ width: '16px', height: '16px', margin: '2px 0 0 0' }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#14171a' }}>
                🛡️ Safe mode
              </div>
              <div style={{ fontSize: '11px', color: '#657786' }}>
                Human-like delays
              </div>
            </div>
          </label>

          <label style={checkboxContainerStyle}>
            <input
              type="checkbox"
              checked={localConfig.debugMode || false}
              onChange={(e) => setLocalConfig({...localConfig, debugMode: e.target.checked})}
              style={{ width: '16px', height: '16px', margin: '2px 0 0 0' }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#14171a' }}>
                🔍 Debug mode
              </div>
              <div style={{ fontSize: '11px', color: '#657786' }}>
                Show detailed logs
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <button 
          onClick={onClose}
          style={{ 
            ...buttonStyle,
            backgroundColor: '#ffffff',
            color: '#14171a',
            border: '1px solid #e1e8ed'
          }}
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          style={{ 
            ...buttonStyle,
            backgroundColor: '#1da1f2', 
            color: 'white'
          }}
        >
          💾 Save
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
