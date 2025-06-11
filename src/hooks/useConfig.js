import { useState, useEffect } from 'react';
import BrowserStorage from '../services/storage/browserStorage';

const useConfig = () => {
  const [config, setConfig] = useState({
    anthropicApiKey: '',
    twitter: {
      username: '',
      password: '',
      email: ''
    },
    topics: [
      'Artificial Intelligence trends',
      'Machine Learning innovations',
      'Web Development tips',
      'Tech industry news',
      'Programming best practices'
    ],
    settings: {
      interval: 240,
      style: 'professional but engaging',
      enabled: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [storage] = useState(new BrowserStorage());

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await storage.getConfig();
      setConfig(savedConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      await storage.setConfig(updatedConfig);
      setConfig(updatedConfig);
      return { success: true };
    } catch (error) {
      console.error('Error saving config:', error);
      return { success: false, error: error.message };
    }
  };

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return {
    config,
    loading,
    saveConfig,
    updateConfig,
    loadConfig
  };
};

export default useConfig;