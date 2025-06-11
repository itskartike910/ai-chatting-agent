/*global chrome*/
class TwitterContentScript {
  constructor() {
    this.isLoggedIn = false;
    this.setupMessageListener();
    this.checkLoginStatus();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'postTweet') {
        this.postTweet(request.content).then(sendResponse);
        return true;
      } else if (request.action === 'checkLogin') {
        this.checkLoginStatus().then(sendResponse);
        return true;
      } else if (request.action === 'login') {
        this.performLogin(request.credentials).then(sendResponse);
        return true;
      }
    });
  }

  async checkLoginStatus() {
    try {
      const homeLink = document.querySelector('[data-testid="AppTabBar_Home_Link"]');
      this.isLoggedIn = !!homeLink;
      return { loggedIn: this.isLoggedIn };
    } catch (error) {
      return { loggedIn: false, error: error.message };
    }
  }

  async performLogin(credentials) {
    try {
      if (!window.location.href.includes('login')) {
        window.location.href = 'https://x.com/i/flow/login';
        return { success: false, message: 'Redirecting to login page...' };
      }

      await this.waitForElement('input[name="text"]');
      
      const usernameField = document.querySelector('input[name="text"]');
      usernameField.value = credentials.username;
      usernameField.dispatchEvent(new Event('input', { bubbles: true }));

      await this.sleep(1000);
      const nextButton = Array.from(document.querySelectorAll('div[role="button"]'))
        .find(el => el.textContent.includes('Next'));
      if (nextButton) nextButton.click();

      await this.sleep(2000);
      const emailField = document.querySelector('input[data-testid="ocfEnterTextTextInput"]');
      if (emailField && credentials.email) {
        emailField.value = credentials.email;
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        
        const emailNextButton = document.querySelector('[data-testid="ocfEnterTextNextButton"]');
        if (emailNextButton) emailNextButton.click();
        await this.sleep(2000);
      }

      await this.waitForElement('input[name="password"]');
      
      const passwordField = document.querySelector('input[name="password"]');
      passwordField.value = credentials.password;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));

      await this.sleep(1000);
      const loginButton = document.querySelector('[data-testid="LoginForm_Login_Button"]');
      if (loginButton) loginButton.click();

      return { success: true, message: 'Login attempted' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async postTweet(content) {
    try {
      if (!this.isLoggedIn) {
        return { success: false, error: 'Not logged in' };
      }

      if (!window.location.href.includes('compose')) {
        window.location.href = 'https://x.com/compose/tweet';
        await this.sleep(2000);
      }

      await this.waitForElement('[data-testid="tweetTextarea_0"]');
      
      const textArea = document.querySelector('[data-testid="tweetTextarea_0"]');
      
      textArea.focus();
      textArea.innerHTML = '';
      
      document.execCommand('insertText', false, content);
      textArea.dispatchEvent(new Event('input', { bubbles: true }));
      
      await this.sleep(1000);
      
      const tweetButton = document.querySelector('[data-testid="tweetButtonInline"]');
      if (!tweetButton || tweetButton.disabled) {
        return { success: false, error: 'Tweet button not available' };
      }
      
      tweetButton.click();
      await this.sleep(3000);
      
      return { success: true, message: 'Tweet posted successfully' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
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
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

new TwitterContentScript();