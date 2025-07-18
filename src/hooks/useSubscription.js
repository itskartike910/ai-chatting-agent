/* global chrome */
import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useSubscription = (user) => {
  const [subscriptionState, setSubscriptionState] = useState({
    status: null,
    plan_type: null,
    monthly_request_limit: 0,
    requests_used: 0,
    remaining_requests: 0,
    trial_end: null,
    usingPersonalAPI: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      setSubscriptionState(prev => ({ ...prev, loading: true }));

      // Check if using personal API keys
      const hasPersonalKeys = await checkPersonalAPIKeys();
      
      if (hasPersonalKeys) {
        setSubscriptionState({
          status: 'personal_api',
          plan_type: 'personal_api',
          monthly_request_limit: -1,
          requests_used: 0,
          remaining_requests: -1,
          trial_end: null,
          usingPersonalAPI: true,
          loading: false,
          error: null
        });
      } else {
        const subscription = await apiService.getUserSubscription();
        
        // Handle both subscription API and usage API response formats
        let monthly_limit = subscription.monthly_request_limit;
        let requests_used = subscription.requests_used;
        
        // If the subscription doesn't have usage data, get it from usage endpoint
        if (typeof requests_used === 'undefined') {
          try {
            const usage = await apiService.getUsageStats();
            monthly_limit = usage.monthly_limit || monthly_limit;
            requests_used = usage.requests_used || 0;
          } catch (usageError) {
            console.warn('Could not fetch usage stats:', usageError);
            requests_used = 0;
          }
        }
        
        const remaining = Math.max(0, monthly_limit - requests_used);
        
        setSubscriptionState({
          status: subscription.status,
          plan_type: subscription.plan_type,
          monthly_request_limit: monthly_limit,
          requests_used: requests_used,
          remaining_requests: remaining,
          trial_end: subscription.trial_end,
          current_period_end: subscription.current_period_end,
          usingPersonalAPI: false,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setSubscriptionState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const checkPersonalAPIKeys = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(['agentConfig']);
        const config = result.agentConfig || {};
        return !!(config.anthropicApiKey || config.openaiApiKey || config.geminiApiKey);
      }
    } catch (error) {
      console.error('Error checking personal API keys:', error);
    }
    return false;
  };

  const refreshUsage = async () => {
    if (subscriptionState.usingPersonalAPI) {
      return subscriptionState;
    }

    try {
      const usage = await apiService.getUsageStats();
      const remaining = Math.max(0, usage.monthly_limit - usage.requests_used);
      
      setSubscriptionState(prev => ({
        ...prev,
        requests_used: usage.requests_used,
        remaining_requests: remaining,
        monthly_request_limit: usage.monthly_limit
      }));

      return { ...usage, remaining_requests: remaining };
    } catch (error) {
      console.error('Error refreshing usage:', error);
      throw error;
    }
  };

  const makeAIRequest = async (prompt, options = {}) => {
    try {
      let response;
      
      if (subscriptionState.usingPersonalAPI) {
        // Use personal API fallback (existing background script logic)
        throw new Error('USE_PERSONAL_API');
      } else {
        if (subscriptionState.remaining_requests <= 0) {
          throw new Error('TRIAL_EXPIRED');
        }
        
        response = await apiService.generateContent(prompt, options);
        await refreshUsage();
      }
      
      return response;
    } catch (error) {
      if (error.message === 'TRIAL_EXPIRED' || error.message === 'RATE_LIMITED') {
        try {
          await refreshUsage();
        } catch (refreshError) {
          console.error('Error refreshing usage after limit:', refreshError);
        }
      }
      throw error;
    }
  };

  const isTrialExpired = () => {
    if (subscriptionState.usingPersonalAPI) {
      return false;
    }
    
    return subscriptionState.remaining_requests <= 0 || 
           subscriptionState.status === 'expired' ||
           (subscriptionState.trial_end && new Date(subscriptionState.trial_end) < new Date());
  };

  const getStatusDisplay = () => {
    if (subscriptionState.loading) {
      return { text: 'Loading...', color: '#657786' };
    }

    if (subscriptionState.usingPersonalAPI) {
      return { text: 'Using Personal API', color: '#17bf63' };
    }

    if (subscriptionState.remaining_requests === -1) {
      return { text: 'Unlimited', color: '#17bf63' };
    }

    if (subscriptionState.remaining_requests <= 0) {
      return { text: 'Trial Expired', color: '#e0245e' };
    }

    if (subscriptionState.remaining_requests <= 2) {
      return { 
        text: `${subscriptionState.remaining_requests}/${subscriptionState.monthly_request_limit} left`, 
        color: '#ffad1f' 
      };
    }

    return { 
      text: `${subscriptionState.remaining_requests}/${subscriptionState.monthly_request_limit} requests`, 
      color: '#17bf63' 
    };
  };

  return {
    ...subscriptionState,
    loadSubscriptionData,
    refreshUsage,
    makeAIRequest,
    isTrialExpired,
    getStatusDisplay
  };
};