/* global chrome */
import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we have a valid session
      const authResult = await apiService.checkAuthentication();
      
      if (authResult.isAuthenticated) {
        setAuthState({
          isLoggedIn: true,
          user: authResult.user,
          loading: false,
          error: null
        });
      } else {
        await apiService.clearAuthSession();
        setAuthState({
          isLoggedIn: false,
          user: null,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState({
        isLoggedIn: false,
        user: null,
        loading: false,
        error: error.message
      });
    }
  };

  const authenticateWithPopup = async () => {
    setAuthState(prev => ({ ...prev, error: null, loading: true }));
    
    try {
      // Open authentication popup
      const popup = await apiService.openAuthPopup();
      
      // Poll for authentication completion
      const pollInterval = setInterval(async () => {
        try {
          const authResult = await apiService.checkAuthentication();
          
          if (authResult.isAuthenticated) {
            clearInterval(pollInterval);
            
            // Close the popup
            if (popup && popup.id) {
              try {
                await chrome.windows.remove(popup.id);
              } catch (e) {
                console.warn('Could not close popup:', e);
              }
            }
            
            setAuthState({
              isLoggedIn: true,
              user: authResult.user,
              loading: false,
              error: null
            });
          }
        } catch (error) {
          console.error('Error during auth polling:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Authentication timeout. Please try again.'
        }));
      }, 300000);
      
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const authenticateWithBackgroundTab = async () => {
    setAuthState(prev => ({ ...prev, error: null, loading: true }));
    
    try {
      // Open authentication background tab
      const tab = await apiService.openAuthBackgroundTab();
      
      // Poll for authentication completion
      const pollInterval = setInterval(async () => {
        try {
          const authResult = await apiService.checkAuthentication();
          
          if (authResult.isAuthenticated) {
            clearInterval(pollInterval);
            
            setAuthState({
              isLoggedIn: true,
              user: authResult.user,
              loading: false,
              error: null
            });
            
            // Optionally close the tab after successful authentication
            if (tab && tab.id) {
              try {
                await chrome.tabs.remove(tab.id);
              } catch (e) {
                console.warn('Could not close auth tab:', e);
              }
            }
          }
        } catch (error) {
          console.error('Error during auth polling:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Authentication timeout. Please try again.'
        }));
      }, 300000);
      
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const startGitHubLogin = async () => {
    setAuthState(prev => ({ ...prev, error: null, loading: true }));
    
    try {
      // Use the new API service method that follows the DeepHUD pattern
      const user = await apiService.startGitHubLogin();
      
      if (user) {
        setAuthState({
          isLoggedIn: true,
          user: user,
          loading: false,
          error: null
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Authentication failed or timed out.'
        }));
      }
    } catch (error) {
      console.error('GitHub login error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const login = async (credentials) => {
    // Check if using background tab authentication
    if (credentials && credentials.useBackgroundTab) {
      return await authenticateWithBackgroundTab();
    }
    
    // Check if using GitHub login
    if (credentials && credentials.useGitHub) {
      return await startGitHubLogin();
    }
    
    // For Chrome extension, use popup authentication
    return await authenticateWithPopup();
  };

  const signup = async (userData) => {
    // Check if using background tab authentication
    if (userData && userData.useBackgroundTab) {
      return await authenticateWithBackgroundTab();
    }
    
    // Check if using GitHub login
    if (userData && userData.useGitHub) {
      return await startGitHubLogin();
    }
    
    // For Chrome extension, use popup authentication
    return await authenticateWithPopup();
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setAuthState({
        isLoggedIn: false,
        user: null,
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
    login,
    signup,
    logout,
    checkAuthStatus,
    authenticateWithPopup,
    authenticateWithBackgroundTab,
    startGitHubLogin
  };
};