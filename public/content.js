/*global chrome, buildDomTree */

console.log('Enhanced content script loaded on:', window.location.href);

// Enhanced content script with DOM tree integration
class EnhancedContentScript {
  constructor() {
    this.isReady = false;
    this.domObserver = null;
    this.setupMessageHandlers();
    this.waitForPageReady();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request.action);
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  async waitForPageReady() {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Additional wait for X's dynamic content
    await this.waitForElement('[data-testid="primaryColumn"]', 10000);
    
    this.isReady = true;
    this.notifyBackgroundReady();
  }

  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  notifyBackgroundReady() {
    chrome.runtime.sendMessage({
      action: 'CONTENT_SCRIPT_READY',
      url: window.location.href
    }, (response) => {
      console.log('Background response to ready notification:', response);
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'POST_TWEET':
          const result = await this.postTweet(request.content);
          sendResponse(result);
          // Also notify background with result
          chrome.runtime.sendMessage({
            action: 'TWEET_RESULT',
            result: result
          });
          break;

        case 'FILL_CONTENT':
          const fillResult = await this.fillContent(request.content);
          sendResponse(fillResult);
          break;

        case 'CLICK_ELEMENT':
          const clickResult = await this.clickElement(request.selector);
          sendResponse(clickResult);
          break;

        case 'GET_DOM_INFO':
          const domInfo = await this.getDomInfo();
          sendResponse(domInfo);
          break;

        case 'CHECK_LOGIN_STATUS':
          const loginStatus = await this.checkLoginStatus();
          sendResponse(loginStatus);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async postTweet(content) {
    try {
      console.log('Content script: Starting tweet posting process');
      console.log('Content:', content);

      // Step 1: Wait for compose area to be available
      const composeArea = await this.waitForElement(
        '[data-testid="tweetTextarea_0"], div[contenteditable="true"]', 
        10000
      );

      if (!composeArea) {
        return { success: false, error: 'Compose area not found' };
      }

      // Step 2: Fill the content
      const fillResult = await this.fillContent(content);
      if (!fillResult.success) {
        return fillResult;
      }

      // Step 3: Wait a moment for the UI to update
      await this.delay(1500);

      // Step 4: Find and click the post button
      const postButton = await this.waitForElement(
        '[data-testid="tweetButtonInline"], [data-testid="tweetButton"]',
        5000
      );

      if (!postButton) {
        return { success: false, error: 'Post button not found' };
      }

      if (postButton.disabled) {
        return { success: false, error: 'Post button is disabled' };
      }

      // Click the post button
      postButton.click();
      console.log('Content script: Post button clicked');

      // Step 5: Wait for posting to complete
      await this.delay(3000);

      // Step 6: Verify posting (look for success indicators)
      const successIndicator = document.querySelector('[data-testid="toast"]') || 
                              document.querySelector('[aria-label*="posted"]') ||
                              !document.querySelector('[data-testid="tweetTextarea_0"]');

      if (successIndicator) {
        return { 
          success: true, 
          message: 'Tweet posted successfully',
          content: content,
          timestamp: Date.now()
        };
      } else {
        return { 
          success: false, 
          error: 'Could not verify tweet posting',
          content: content 
        };
      }

    } catch (error) {
      console.error('Content script: Error posting tweet:', error);
      return { success: false, error: error.message };
    }
  }

  async fillContent(content) {
    try {
      // Use buildDomTree if available for better element detection
      let textArea = null;
      
      if (typeof buildDomTree === 'function') {
        try {
          const domTree = buildDomTree({
            showHighlightElements: false,
            debugMode: false
          });
          
          // Look for text input elements in the DOM tree
          // This would be more sophisticated with full DOM tree analysis
          console.log('DOM tree analysis available');
        } catch (domError) {
          console.log('DOM tree analysis failed, using fallback:', domError);
        }
      }

      // Fallback to direct selectors
      textArea = document.querySelector('[data-testid="tweetTextarea_0"]') || 
                document.querySelector('div[contenteditable="true"]') ||
                document.querySelector('.public-DraftEditor-content');

      if (!textArea) {
        return { success: false, error: 'Text area not found' };
      }

      // Focus the text area
      textArea.focus();
      
      // Clear existing content
      textArea.innerHTML = '';
      textArea.textContent = '';
      
      // Insert new content
      textArea.textContent = content;
      textArea.innerHTML = content;
      
      // Trigger input events to notify the application
      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      
      textArea.dispatchEvent(inputEvent);
      textArea.dispatchEvent(changeEvent);
      
      // Additional trigger for React applications
      const reactEvent = new Event('input', { bubbles: true });
      Object.defineProperty(reactEvent, 'target', {
        writable: false,
        value: textArea
      });
      textArea.dispatchEvent(reactEvent);

      console.log('Content filled successfully');
      return { success: true, message: 'Content filled successfully' };
      
    } catch (error) {
      console.error('Error filling content:', error);
      return { success: false, error: error.message };
    }
  }

  async clickElement(selector) {
    try {
      const element = await this.waitForElement(selector, 5000);
      
      if (!element) {
        return { success: false, error: `Element not found: ${selector}` };
      }

      if (element.disabled) {
        return { success: false, error: 'Element is disabled' };
      }

      element.click();
      return { success: true, message: `Clicked element: ${selector}` };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getDomInfo() {
    try {
      const info = {
        url: window.location.href,
        title: document.title,
        isComposePageOpen: !!document.querySelector('[data-testid="tweetTextarea_0"]'),
        isLoggedIn: !!document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]'),
        hasPostButton: !!document.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]'),
        readyState: document.readyState
      };

      // Use buildDomTree if available for more detailed analysis
      if (typeof buildDomTree === 'function') {
        try {
          const domTree = buildDomTree({
            showHighlightElements: false,
            debugMode: false
          });
          info.domTreeAvailable = true;
          info.interactiveElements = Object.keys(domTree).length;
        } catch (error) {
          info.domTreeAvailable = false;
          info.domTreeError = error.message;
        }
      }

      return { success: true, info: info };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkLoginStatus() {
    try {
      const isLoggedIn = !!(
        document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') ||
        document.querySelector('[data-testid="AppTabBar_Profile_Link"]') ||
        window.location.href.includes('/home')
      );

      return { 
        success: true, 
        isLoggedIn: isLoggedIn,
        currentUrl: window.location.href
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the enhanced content script
const enhancedContentScript = new EnhancedContentScript();

// Export for testing
window.enhancedContentScript = enhancedContentScript;