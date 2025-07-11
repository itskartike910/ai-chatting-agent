/* global chrome */

// Simplified Android-Optimized Content Script
// Note: Primary page state and actions now handled by chrome.wootz APIs in background.js
// This content script is kept for backward compatibility only
class AndroidContentScript {
  constructor() {
    this.setupMessageHandlers();
    this.isInitialized = false;
    this.debugMode = false;
    console.log('🔧 Simplified Android content script loaded (Wootz API primary)');
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'GET_ENHANCED_PAGE_STATE':
          console.log('📊 Content script fallback: Page state now handled by Wootz APIs');
          const fallbackState = this.getFallbackPageState();
          sendResponse({ success: true, pageState: fallbackState });
          break;
          
        case 'GET_PAGE_STATE':
          console.log('📊 Content script fallback: Page state now handled by Wootz APIs');
          const pageState = this.getFallbackPageState();
          sendResponse({ success: true, pageState: pageState });
          break;

        case 'CLICK_ELEMENT':
          console.log('🖱️ Content script fallback: Click actions now handled by Wootz APIs');
          sendResponse({ success: false, message: 'Click actions handled by Wootz APIs' });
          break;

        case 'FILL_ELEMENT':
          console.log('⌨️ Content script fallback: Fill actions now handled by Wootz APIs');
          sendResponse({ success: false, message: 'Fill actions handled by Wootz APIs' });
          break;

        case 'SCROLL_DOWN':
          console.log('📜 Content script fallback: Scroll actions now handled by Wootz APIs');
          sendResponse({ success: false, message: 'Scroll actions handled by Wootz APIs' });
          break;

        case 'ENABLE_DEBUG_MODE':
          this.debugMode = true;
          console.log('🔍 Debug mode enabled (limited functionality in content script)');
          sendResponse({ success: true, message: 'Debug mode enabled' });
          break;

        case 'DISABLE_DEBUG_MODE':
          this.debugMode = false;
          console.log('🔍 Debug mode disabled');
          sendResponse({ success: true, message: 'Debug mode disabled' });
          break;

        case 'PING':
          sendResponse({ success: true, status: 'ready', note: 'Wootz APIs primary' });
          break;

        default:
          console.log(`⚠️ Unknown action: ${request.action} - Consider using Wootz APIs`);
          sendResponse({ success: false, error: 'Unknown action - Wootz APIs recommended' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Minimal fallback page state for compatibility
  getFallbackPageState() {
    return {
      url: window.location.href,
      title: document.title,
      platform: this.detectPlatform(window.location.href),
      pageType: this.determinePageType(window.location.href),
      
      interactiveElements: [], // Empty - handled by Wootz APIs
      
      loginStatus: {
        isLoggedIn: this.checkBasicLoginStatus(),
        hasLoginForm: false
      },
      
      contentContext: {
        hasComposeForm: false,
        hasPostForm: false,
        canPost: false,
        composerState: {}
      },
      
      domStats: {
        totalElements: document.querySelectorAll('*').length,
        interactiveElements: 0,
        visibleElements: 0,
        loginElements: 0,
        postElements: 0
      },

      note: 'Primary functionality handled by Wootz APIs',
      timestamp: Date.now()
    };
  }

  // Basic utility functions for fallback compatibility
  detectPlatform(url = window.location.href) {
    if (url.includes('x.com') || url.includes('twitter.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    return 'unknown';
  }

  determinePageType(url = window.location.href) {
    if (url.includes('/compose') || url.includes('/intent/tweet')) return 'compose';
    if (url.includes('/home') || url.includes('/timeline')) return 'home';
    if (url.includes('/login') || url.includes('/signin')) return 'login';
    if (url.includes('/profile') || url.includes('/user/')) return 'profile';
    return 'general';
  }

  checkBasicLoginStatus() {
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'twitter':
        return !!(
          document.querySelector('[data-testid="AppTabBar_Profile_Link"]') ||
          document.querySelector('[aria-label*="Account menu"]') ||
          document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
        );
      default:
        return !window.location.href.includes('/login') && 
               !window.location.href.includes('/signin');
    }
  }
}

// Initialize the simplified content script
// eslint-disable-next-line no-unused-vars
const androidContentScript = new AndroidContentScript();
console.log('✅ Simplified Android content script ready - Wootz APIs handle main functionality');