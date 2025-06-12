/* global chrome */
import ArcadeTwitterService from './arcadeTwitterService';

class BrowserTwitterService {
  constructor() {
    this.isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    this.arcadeService = new ArcadeTwitterService();
    this.useArcade = false;
  }

  async initialize(config) {
    try {
      console.log('BrowserTwitterService: Initializing...');
      console.log('Config has arcadeApiKey:', !!config.arcadeApiKey);
      
      // Check if Arcade is configured
      if (config.arcadeApiKey) {
        console.log('BrowserTwitterService: Initializing Arcade service...');
        const arcadeResult = await this.arcadeService.initialize(config);
        if (arcadeResult.success) {
          this.useArcade = true;
          console.log('Arcade Twitter service enabled');
        } else {
          console.log('Arcade initialization failed:', arcadeResult.error);
        }
      } else {
        console.log('BrowserTwitterService: No Arcade API key found');
      }
      
      return { success: true, message: 'Twitter service initialized' };
    } catch (error) {
      console.error('Error initializing Twitter service:', error);
      return { success: false, error: error.message };
    }
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

      // Try Arcade first if available
      if (this.useArcade) {
        console.log('BrowserTwitterService: Using Arcade for Twitter posting...');
        const arcadeResult = await this.arcadeService.postTweet(content, credentials);
        console.log('BrowserTwitterService: Arcade result:', arcadeResult);
        
        if (arcadeResult.success && arcadeResult.posted) {
          return arcadeResult;
        } else if (arcadeResult.needsAuth) {
          console.log('BrowserTwitterService: Arcade needs authorization');
          return arcadeResult;
        } else {
          console.log('BrowserTwitterService: Arcade failed, trying fallback...', arcadeResult.error);
        }
      } else {
        console.log('BrowserTwitterService: Arcade not configured, using fallback');
      }

      // Fallback to content script automation
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