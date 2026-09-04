/* global chrome */
import { useState, useEffect, useCallback } from 'react';

const checkHasValidKeys = (config = {}) => {
  return !!(
    config.geminiApiKey ||
    config.anthropicApiKey ||
    config.openaiApiKey ||
    config.groqApiKey ||
    config.openrouterApiKey ||
    config.customOpenAIApiKey ||
    config.localLLMApiKey ||
    (config.aiProvider === 'local' && (config.localLLMBaseUrl || config.localLLMApiKey)) ||
    (config.aiProvider === 'openai-compatible' && (config.customOpenAIBaseUrl || config.customOpenAIApiKey))
  );
};

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isLoggedIn: false, // In this context, logged in means has configured API Keys
    loading: true,
    error: null
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        // Checking agentConfig for API keys
        chrome.storage.sync.get(['agentConfig'], (result) => {
          const config = result.agentConfig || {};
          const hasKeys = checkHasValidKeys(config);

          setAuthState({
            isLoggedIn: hasKeys,
            loading: false,
            error: null
          });
        });
      } else {
        // Fallback for non-extension environments (e.g. dev server)
        let hasKeys = false;
        try {
          const local = localStorage.getItem('agentConfig');
          if (local) {
            const config = JSON.parse(local);
            hasKeys = checkHasValidKeys(config);
          }
        } catch (e) {
          // ignore parsing error
        }

        setAuthState({
          isLoggedIn: hasKeys,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error checking API Key status:', error);
      setAuthState({
        isLoggedIn: false,
        loading: false,
        error: error.message
      });
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();

    // Listen to storage changes so auth status updates immediately when settings are saved
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'sync' && changes.agentConfig) {
        const newConfig = changes.agentConfig.newValue || {};
        const hasKeys = checkHasValidKeys(newConfig);
        setAuthState({
          isLoggedIn: hasKeys,
          loading: false,
          error: null
        });
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [checkAuthStatus]);

  // We keep a 'logout' equivalent to clear keys if requested
  const logout = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        // Find existing config, wipe just the keys to preserve other preferences
        const result = await new Promise(resolve => chrome.storage.sync.get(['agentConfig'], resolve));
        const config = result.agentConfig || {};

        const newConfig = {
          ...config,
          anthropicApiKey: '',
          openaiApiKey: '',
          geminiApiKey: '',
          groqApiKey: '',
          openrouterApiKey: '',
          customOpenAIApiKey: '',
          localLLMApiKey: ''
        };

        await new Promise(resolve => chrome.storage.sync.set({ agentConfig: newConfig }, resolve));
      } else {
        try {
          localStorage.removeItem('agentConfig');
        } catch (e) {}
      }

      setAuthState({
        isLoggedIn: false,
        loading: false,
        error: null
      });
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    ...authState,
    logout,
    checkAuthStatus,
    // Provide user object as null to prevent null reference errors in components that expect it
    user: null
  };
};