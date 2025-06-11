import React, { useState, useEffect } from 'react';
import useConfig from '../hooks/useConfig';
import { validateApiKey, validateTwitterCredentials } from '../utils/browserHelpers';

function Settings({ onConfigUpdate }) {
  const { config, loading, saveConfig } = useConfig();
  const [localConfig, setLocalConfig] = useState(config);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // Validate config
      if (localConfig.anthropicApiKey && !validateApiKey(localConfig.anthropicApiKey)) {
        throw new Error('Invalid Anthropic API key format');
      }

      if (localConfig.twitter.username && !validateTwitterCredentials(localConfig.twitter)) {
        throw new Error('Twitter credentials incomplete');
      }

      // Save config
      const result = await saveConfig(localConfig);
      
      if (result.success) {
        setMessage('Configuration updated successfully!');
        if (onConfigUpdate) {
          await onConfigUpdate(localConfig);
        }
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTopicChange = (index, value) => {
    const newTopics = [...localConfig.topics];
    newTopics[index] = value;
    setLocalConfig({ ...localConfig, topics: newTopics });
  };

  const addTopic = () => {
    setLocalConfig({ 
      ...localConfig, 
      topics: [...localConfig.topics, ''] 
    });
  };

  const removeTopic = (index) => {
    const newTopics = localConfig.topics.filter((_, i) => i !== index);
    setLocalConfig({ ...localConfig, topics: newTopics });
  };

  const handleSettingChange = (key, value) => {
    setLocalConfig({
      ...localConfig,
      settings: {
        ...localConfig.settings,
        [key]: value
      }
    });
  };

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  return (
    <div className="settings">
      <h2>Configuration</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>AI Configuration</h3>
          <div className="form-group">
            <label>Anthropic API Key:</label>
            <input
              type="password"
              value={localConfig.anthropicApiKey}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                anthropicApiKey: e.target.value
              })}
              placeholder="Enter your Anthropic API key (sk-ant-...)"
            />
            <small>Get your API key from: https://console.anthropic.com/</small>
          </div>
        </div>

        <div className="form-section">
          <h3>Twitter Credentials</h3>
          <div className="form-group">
            <label>Username/Email:</label>
            <input
              type="text"
              value={localConfig.twitter.username}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                twitter: { ...localConfig.twitter, username: e.target.value }
              })}
              placeholder="Twitter username or email"
            />
          </div>
          
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={localConfig.twitter.password}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                twitter: { ...localConfig.twitter, password: e.target.value }
              })}
              placeholder="Twitter password"
            />
          </div>
          
          <div className="form-group">
            <label>Email (for verification):</label>
            <input
              type="email"
              value={localConfig.twitter.email}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                twitter: { ...localConfig.twitter, email: e.target.value }
              })}
              placeholder="Email for verification"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Agent Settings</h3>
          <div className="form-group">
            <label>Tweet Interval (minutes):</label>
            <input
              type="number"
              min="1"
              max="1440"
              value={localConfig.settings.interval}
              onChange={(e) => handleSettingChange('interval', parseInt(e.target.value))}
            />
            <small>How often to post tweets (30 minutes to 24 hours)</small>
          </div>
          
          <div className="form-group">
            <label>Writing Style:</label>
            <select
              value={localConfig.settings.style}
              onChange={(e) => handleSettingChange('style', e.target.value)}
            >
              <option value="professional but engaging">Professional but Engaging</option>
              <option value="casual and friendly">Casual and Friendly</option>
              <option value="technical and informative">Technical and Informative</option>
              <option value="creative and inspiring">Creative and Inspiring</option>
              <option value="news and factual">News and Factual</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Tweet Topics</h3>
          {localConfig.topics.map((topic, index) => (
            <div key={index} className="topic-group">
              <input
                type="text"
                value={topic}
                onChange={(e) => handleTopicChange(index, e.target.value)}
                placeholder="Enter topic"
              />
              <button 
                type="button" 
                onClick={() => removeTopic(index)}
                className="btn btn-small btn-danger"
                disabled={localConfig.topics.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button 
            type="button" 
            onClick={addTopic}
            className="btn btn-small btn-secondary"
          >
            Add Topic
          </button>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Updating...' : 'Update Configuration'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Settings;