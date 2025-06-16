/* global chrome */
import ArcadeTwitterService from './arcadeTwitterService';

class BrowserTwitterService {
  constructor() {
    this.isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    this.arcadeService = new ArcadeTwitterService();
    this.useArcade = false;
  }

  async initialize(config) {
    console.log('BrowserTwitterService: Initializing with config:', {
      hasArcadeKey: !!config.arcadeApiKey,
      useArcade: config.useArcade
    });

    if (config.arcadeApiKey) {
      this.useArcade = true;
      try {
        const result = await this.arcadeService.initialize(config);
        console.log('BrowserTwitterService: Arcade service initialized:', result);
        return result;
      } catch (error) {
        console.warn('BrowserTwitterService: Arcade initialization failed, will fallback to tab automation:', error);
        this.useArcade = false;
      }
    } else {
      console.log('BrowserTwitterService: No Arcade API key, using tab automation');
    }

    return { success: true, message: 'Twitter service initialized with tab automation method' };
  }

  async postTweet(content, credentials) {
    try {
      console.log('BrowserTwitterService: Attempting to post tweet:', content);
      console.log('BrowserTwitterService: useArcade:', this.useArcade);
      
      if (!this.isExtension) {
        console.log('Twitter posting only available in extension mode');
        return { 
          success: false, 
          error: 'Twitter posting requires Chrome extension environment',
          posted: false
        };
      }

      // NEW: Try tab automation first (primary method)
      console.log('BrowserTwitterService: Trying tab automation method...');
      const tabResult = await this.postViaTabAutomation(content);
      console.log('BrowserTwitterService: Tab automation result:', tabResult);
      
      if (tabResult.success) {
        return tabResult;
      }

      // Try Arcade as fallback if available
      if (this.useArcade) {
        console.log('BrowserTwitterService: Tab automation failed, trying Arcade fallback...');
        const arcadeResult = await this.arcadeService.postTweet(content, credentials);
        console.log('BrowserTwitterService: Arcade result:', arcadeResult);
        
        if (arcadeResult.success && arcadeResult.posted) {
          return arcadeResult;
        } else if (arcadeResult.needsAuth) {
          console.log('BrowserTwitterService: Arcade needs authorization');
          return arcadeResult;
        } else {
          console.log('BrowserTwitterService: Arcade failed, trying content script fallback...', arcadeResult.error);
        }
      } else {
        console.log('BrowserTwitterService: Tab automation failed, trying content script fallback...');
      }

      // Final fallback to content script automation
      return await this.postViaContentScript(content, credentials);
      
    } catch (error) {
      console.error('BrowserTwitterService: Error posting tweet:', error);
      return { 
        success: false, 
        error: error.message,
        posted: false
      };
    }
  }

  // NEW: Post tweet via tab automation (primary method)
  async postViaTabAutomation(content) {
    console.log('BrowserTwitterService: Using tab automation method');
    
    return new Promise((resolve) => {
      if (!this.isExtension) {
        resolve({
          success: false,
          error: 'Tab automation requires extension environment',
          posted: false
        });
        return;
      }

      // Send message to background script to handle tab automation
      chrome.runtime.sendMessage({
        action: 'POST_TWEET_VIA_TAB',
        content: content
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('BrowserTwitterService: Background message error:', chrome.runtime.lastError);
          resolve({ 
            success: false, 
            error: chrome.runtime.lastError.message,
            posted: false 
          });
        } else {
          console.log('BrowserTwitterService: Background response:', response);
          resolve(response || { 
            success: false, 
            error: 'No response from background script',
            posted: false 
          });
        }
      });
    });
  }

  // KEEP: Existing content script fallback method unchanged
  async postViaContentScript(content, credentials) {
    console.log('BrowserTwitterService: Using content script fallback');
    
    return new Promise((resolve) => {
      if (!this.isExtension) {
        resolve({
          success: false,
          error: 'Content script method requires extension environment',
          posted: false
        });
        return;
      }

      // Check for Twitter tabs
      chrome.tabs.query({url: ["https://twitter.com/*", "https://x.com/*"]}, (tabs) => {
        if (tabs.length > 0) {
          // Try to use existing Twitter tab
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'postTweet',
            content: content
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Content script not responding, simulating post');
              resolve({
                success: true,
                posted: false,
                message: 'Tweet generated (content script unavailable)',
                content: content
              });
            } else {
              resolve(response || { 
                success: true, 
                posted: false,
                message: 'Tweet sent to content script',
                content: content
              });
            }
          });
        } else {
          // No Twitter tabs - simulate successful generation
          console.log('No Twitter tabs found, simulating post');
          resolve({
            success: true,
            posted: false,
            message: 'Tweet generated successfully (no Twitter tabs open)',
            content: content
          });
        }
      });
    });
  }

  // KEEP: Existing methods unchanged
  async checkLogin() {
    try {
      if (this.useArcade) {
        return await this.arcadeService.checkLogin();
      }
      
      // Fallback check
      return { loggedIn: false, message: 'Login check not implemented for content script method' };
    } catch (error) {
      return { loggedIn: false, error: error.message };
    }
  }

  async authorizeTwitter() {
    if (this.useArcade) {
      console.log('BrowserTwitterService: Starting Twitter authorization via Arcade');
      return await this.arcadeService.authorizeTwitter();
    }
    return { success: false, error: 'Arcade not configured' };
  }
}

export default BrowserTwitterService;