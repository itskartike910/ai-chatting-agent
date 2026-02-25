/* global chrome */
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isLoggedIn: false, // In this context, logged in means has configured API Keys
    loading: true,
    error: null
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Checking agentConfig for API keys
        chrome.storage.sync.get(['agentConfig'], (result) => {
          const config = result.agentConfig || {};
          const hasKeys = !!(config.anthropicApiKey || config.openaiApiKey || config.geminiApiKey);

          setAuthState({
            isLoggedIn: hasKeys,
            loading: false,
            error: null
          });
        });
      } else {
        // Fallback for non-extension environments
        setAuthState({
          isLoggedIn: false,
          loading: false,
          error: 'Chrome storage not available'
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
  };

  // We keep a 'logout' equivalent to clear keys if requested
  const logout = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Find existing config, wipe just the keys to preserve other preferences
        const result = await new Promise(resolve => chrome.storage.sync.get(['agentConfig'], resolve));
        const config = result.agentConfig || {};

        const newConfig = {
          ...config,
          anthropicApiKey: '',
          openaiApiKey: '',
          geminiApiKey: ''
        };

        await new Promise(resolve => chrome.storage.sync.set({ agentConfig: newConfig }, resolve));
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