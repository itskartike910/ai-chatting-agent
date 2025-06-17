/* global chrome */

export class SocialNavigatorAgent {
  constructor(config) {
    this.config = config;
  }

  async executeAction(action) {
    switch (action.type) {
      case 'LOGIN':
        return await this.handleLogin(action.params);
      case 'POST_CONTENT':
        return await this.postContent(action.params);
      case 'NAVIGATE_TO_COMPOSE':
        return await this.navigateToCompose();
      case 'FILL_CONTENT':
        return await this.fillContent(action.params.text);
      case 'CLICK_POST_BUTTON':
        return await this.clickPostButton();
      case 'WAIT':
        return await this.wait(action.params.duration);
      case 'SCROLL_DOWN':
        return await this.scrollDown();
      case 'CLICK_ELEMENT':
        return await this.clickElement(action.params.selector);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async handleLogin(params) {
    try {
      // Open X login page
      const tab = await chrome.tabs.create({
        url: 'https://x.com/i/flow/login',
        active: true
      });

      // Wait for user to login manually or implement automated login
      return new Promise((resolve) => {
        const checkLogin = setInterval(async () => {
          try {
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                return window.location.href.includes('/home') || 
                       document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') !== null;
              }
            });

            if (result.result) {
              clearInterval(checkLogin);
              resolve({
                success: true,
                message: 'Successfully logged into X',
                url: (await chrome.tabs.get(tab.id)).url
              });
            }
          } catch (error) {
            clearInterval(checkLogin);
            resolve({
              success: false,
              error: 'Login verification failed'
            });
          }
        }, 2000);

        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(checkLogin);
          resolve({
            success: false,
            error: 'Login timeout'
          });
        }, 120000);
      });
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async navigateToCompose() {
    try {
      const tab = await chrome.tabs.create({
        url: 'https://x.com/compose/post',
        active: true
      });

      await this.wait(3000);

      return {
        success: true,
        message: 'Navigated to compose page',
        tabId: tab.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async fillContent(text) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          // Use buildDomTree to find the text area
          if (window.buildDomTree) {
            const domTree = window.buildDomTree();
            // Process DOM tree to find text input
          }
          
          // Fallback to direct selectors
          const textArea = document.querySelector('[data-testid="tweetTextarea_0"]') || 
                         document.querySelector('div[contenteditable="true"]') ||
                         document.querySelector('.public-DraftEditor-content');
          
          if (textArea) {
            textArea.focus();
            
            // Clear existing content
            textArea.innerHTML = '';
            
            // Insert the text
            textArea.textContent = content;
            
            // Trigger input event
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            
            return { success: true, message: 'Content filled successfully' };
          } else {
            return { success: false, error: 'Content text area not found' };
          }
        },
        args: [text]
      });

      return result.result || { success: false, error: 'Script execution failed' };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async clickPostButton() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const postButton = document.querySelector('[data-testid="tweetButtonInline"]') ||
                           document.querySelector('[data-testid="tweetButton"]') ||
                           document.querySelector('div[role="button"][aria-label*="Post"]');
          
          if (postButton && !postButton.disabled) {
            postButton.click();
            return { success: true, message: 'Post button clicked' };
          } else {
            return { success: false, error: 'Post button not found or disabled' };
          }
        }
      });

      return result.result || { success: false, error: 'Script execution failed' };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async postContent(params) {
    const { content } = params;
    
    try {
      // Navigate to compose
      const navResult = await this.navigateToCompose();
      if (!navResult.success) return navResult;

      await this.wait(2000);

      // Fill content
      const fillResult = await this.fillContent(content);
      if (!fillResult.success) return fillResult;

      await this.wait(1000);

      // Click post button
      const postResult = await this.clickPostButton();
      if (!postResult.success) return postResult;

      await this.wait(3000);

      return {
        success: true,
        message: `Content posted successfully: "${content}"`,
        content: content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async wait(duration) {
    await new Promise(resolve => setTimeout(resolve, duration));
    return {
      success: true,
      message: `Waited ${duration}ms`
    };
  }

  async scrollDown() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.scrollBy(0, window.innerHeight);
        }
      });

      return {
        success: true,
        message: 'Scrolled down'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async clickElement(selector) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.click();
            return { success: true, message: `Clicked element: ${sel}` };
          } else {
            return { success: false, error: `Element not found: ${sel}` };
          }
        },
        args: [selector]
      });

      return result.result || { success: false, error: 'Script execution failed' };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}