/* global chrome */
import { isExtension } from './browserHelpers';

class MessageHandler {
  constructor() {
    this.handlers = new Map();
    this.setupListeners();
  }

  setupListeners() {
    if (isExtension()) {
      // Extension message listeners
      if (chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          this.handleMessage(request, sender, sendResponse);
          return true; // Keep message channel open for async responses
        });
      }
    } else {
      // Web app message listeners (for postMessage communication)
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        this.handleMessage(event.data, event.source);
      });
    }
  }

  registerHandler(action, handler) {
    this.handlers.set(action, handler);
  }

  unregisterHandler(action) {
    this.handlers.delete(action);
  }

  async handleMessage(request, sender, sendResponse) {
    const handler = this.handlers.get(request.action);
    
    if (handler) {
      try {
        const result = await handler(request, sender);
        if (sendResponse) {
          sendResponse(result);
        }
        return result;
      } catch (error) {
        const errorResult = { success: false, error: error.message };
        if (sendResponse) {
          sendResponse(errorResult);
        }
        return errorResult;
      }
    } else {
      console.warn(`No handler registered for action: ${request.action}`);
      const errorResult = { success: false, error: `Unknown action: ${request.action}` };
      if (sendResponse) {
        sendResponse(errorResult);
      }
      return errorResult;
    }
  }

  async sendMessage(action, data = {}) {
    const message = { action, ...data };

    if (isExtension()) {
      // Send to background script
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } else {
      // Send to self (for web app internal communication)
      return this.handleMessage(message);
    }
  }

  async sendMessageToTab(tabId, action, data = {}) {
    if (!isExtension()) {
      throw new Error('Tab messaging only available in extension mode');
    }

    const message = { action, ...data };

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  async broadcastMessage(action, data = {}) {
    const message = { action, ...data };

    if (isExtension()) {
      // Broadcast to all tabs
      const tabs = await chrome.tabs.query({});
      const promises = tabs.map(tab => 
        this.sendMessageToTab(tab.id, action, data).catch(() => null)
      );
      return Promise.all(promises);
    } else {
      // Web app broadcast (could use localStorage events or custom events)
      window.dispatchEvent(new CustomEvent('agent-broadcast', { detail: message }));
      return [message];
    }
  }
}

// Export singleton instance
export const messageHandler = new MessageHandler();

// Common message types
export const MESSAGE_TYPES = {
  // Agent control
  AGENT_START: 'agent_start',
  AGENT_STOP: 'agent_stop',
  AGENT_STATUS: 'agent_status',
  
  // Tweet operations
  TWEET_GENERATE: 'tweet_generate',
  TWEET_POST: 'tweet_post',
  TWEET_TEST: 'tweet_test',
  
  // Configuration
  CONFIG_UPDATE: 'config_update',
  CONFIG_GET: 'config_get',
  
  // Twitter operations
  TWITTER_LOGIN: 'twitter_login',
  TWITTER_CHECK_LOGIN: 'twitter_check_login',
  TWITTER_POST: 'twitter_post',
  
  // Claude API
  CLAUDE_TEST: 'claude_test',
  CLAUDE_GENERATE: 'claude_generate'
};

// Utility functions for specific message types
export const createAgentMessage = (action, data) => ({
  action,
  timestamp: Date.now(),
  ...data
});

export const createTweetMessage = (content, options = {}) => ({
  action: MESSAGE_TYPES.TWEET_POST,
  content,
  options,
  timestamp: Date.now()
});

export const createConfigMessage = (config) => ({
  action: MESSAGE_TYPES.CONFIG_UPDATE,
  config,
  timestamp: Date.now()
});

export default MessageHandler;