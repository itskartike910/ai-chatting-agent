/* global chrome, buildDomTree */

// Android-Optimized Content Script
class AndroidContentScript {
  constructor() {
    this.setupMessageHandlers();
    this.isInitialized = false;
    this.pageState = null;
    this.lastDomUpdate = 0;
    this.domCache = null;
    console.log('Android content script initialized');
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
        case 'GET_ENHANCED_PAGE_STATE': // ✅ ADD THIS CASE
          const enhancedState = await this.getEnhancedPageState(request.options);
          sendResponse({ success: true, pageState: enhancedState });
          break;
          
        case 'GET_PAGE_STATE':
          const pageState = await this.getFullPageState();
          sendResponse({ success: true, pageState: pageState });
          break;

        case 'CLICK_ELEMENT':
          const clickResult = await this.clickElement(request.selector || request.index);
          sendResponse(clickResult);
          break;

        case 'FILL_ELEMENT':
          const fillResult = await this.fillElement(request.selector || request.index, request.text);
          sendResponse(fillResult);
          break;

        case 'SCROLL_DOWN':
          const scrollResult = await this.scrollDown();
          sendResponse(scrollResult);
          break;

        case 'POST_TWEET':
          const tweetResult = await this.postTweet(request.content);
          sendResponse(tweetResult);
          break;

        case 'PING':
          sendResponse({ success: true, status: 'ready' });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getFullPageState() {
    try {
      const domResult = await this.buildCurrentDomTree({
        showHighlightElements: false,
        debugMode: false,
        viewportExpansion: 200
      });

      const pageInfo = {
        url: window.location.href,
        title: document.title,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        },
        platform: this.detectPlatform(),
        loginStatus: this.checkLoginStatus(),
        readyState: document.readyState,
        isMobile: this.isMobileView()
      };

      const interactiveElements = this.extractInteractiveElements(domResult);
      const pageContext = this.analyzePageContext();

      return {
        pageInfo,
        interactiveElements,
        pageContext,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting Android page state:', error);
      return {
        pageInfo: {
          url: window.location.href,
          title: document.title,
          error: error.message
        },
        interactiveElements: [],
        pageContext: { platform: 'unknown' },
        timestamp: Date.now()
      };
    }
  }

  async buildCurrentDomTree(options = {}) {
    if (typeof buildDomTree !== 'function') {
      console.warn('buildDomTree function not available, creating fallback');
      return this.createFallbackDomTree();
    }

    const defaultOptions = {
      showHighlightElements: false,
      focusHighlightIndex: -1,
      viewportExpansion: 200,
      debugMode: false,
      ...options
    };

    try {
      const result = buildDomTree(defaultOptions);
      this.domCache = result;
      this.lastDomUpdate = Date.now();
      return result;
    } catch (error) {
      console.error('Error building DOM tree:', error);
      return this.createFallbackDomTree();
    }
  }

  createFallbackDomTree() {
    const interactiveElements = [];
    let index = 0;

    // Find Twitter-specific elements first
    const twitterElements = [
      // Tweet compose area
      '[data-testid="tweetTextarea_0"]',
      '[role="textbox"][contenteditable="true"]',
      // Post buttons
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButtonInline"]',
      // Like buttons
      '[data-testid="like"]',
      '[aria-label*="Like"]',
      // General buttons
      'button',
      '[role="button"]',
      // Input elements
      'input',
      'textarea'
    ];

    twitterElements.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (this.isElementVisible(el) && !this.isElementAlreadyAdded(el, interactiveElements)) {
          interactiveElements.push({
            index: index++,
            element: el,
            tagName: el.tagName.toLowerCase(),
            text: this.getElementText(el),
            ariaLabel: el.getAttribute('aria-label') || '',
            dataTestId: el.getAttribute('data-testid') || '',
            xpath: this.getXPath(el),
            isLikeButton: this.isLikeButtonFromElement(el),
            isTweetButton: this.isTweetButtonFromElement(el),
            isTextArea: this.isTextAreaFromElement(el)
          });
        }
      });
    });

    return {
      rootId: 'fallback-root',
      map: {},
      interactiveElements: interactiveElements
    };
  }

  isElementAlreadyAdded(element, list) {
    return list.some(item => item.element === element);
  }

  getElementText(element) {
    return (element.textContent || element.value || element.placeholder || '').trim().substring(0, 100);
  }

  extractInteractiveElements(domResult) {
    // If using fallback DOM tree
    if (domResult.interactiveElements) {
      return domResult.interactiveElements.map(el => ({
        index: el.index,
        tagName: el.tagName,
        attributes: {
          'data-testid': el.dataTestId,
          'aria-label': el.ariaLabel
        },
        xpath: el.xpath,
        isVisible: true,
        isTopElement: true,
        isInViewport: true,
        text: el.text,
        ariaLabel: el.ariaLabel,
        role: el.element?.getAttribute('role'),
        type: el.element?.type,
        isLikeButton: el.isLikeButton,
        isTweetButton: el.isTweetButton,
        isTextArea: el.isTextArea
      }));
    }

    // Original DOM tree processing
    const interactiveElements = [];
    if (!domResult || !domResult.map) return interactiveElements;

    const processNode = (nodeId) => {
      const node = domResult.map[nodeId];
      if (!node) return;

      if (node.isInteractive && typeof node.highlightIndex === 'number') {
        const text = this.extractElementText(node);
        const ariaLabel = node.attributes?.['aria-label'] || '';
        
        interactiveElements.push({
          index: node.highlightIndex,
          tagName: node.tagName,
          attributes: node.attributes || {},
          xpath: node.xpath,
          isVisible: node.isVisible,
          isTopElement: node.isTopElement,
          isInViewport: node.isInViewport,
          text: text,
          ariaLabel: ariaLabel,
          role: node.attributes?.role,
          type: node.attributes?.type,
          isLikeButton: this.isLikeButton(node, text, ariaLabel),
          isTweetButton: this.isTweetButton(node, text, ariaLabel),
          isTextArea: this.isTextArea(node, text, ariaLabel)
        });
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(processNode);
      }
    };

    if (domResult.rootId) {
      processNode(domResult.rootId);
    }

    return interactiveElements.sort((a, b) => a.index - b.index);
  }

  isLikeButton(node, text, ariaLabel) {
    const lowerText = (text || '').toLowerCase();
    const lowerAria = (ariaLabel || '').toLowerCase();
    
    return (
      lowerText.includes('like') ||
      lowerAria.includes('like') ||
      lowerAria.includes('favorite') ||
      node.attributes?.['data-testid']?.includes('like')
    );
  }

  isLikeButtonFromElement(element) {
    if (!element) return false;
    const text = this.getElementText(element).toLowerCase();
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    const dataTestId = element.getAttribute('data-testid') || '';
    
    return (
      text.includes('like') ||
      ariaLabel.includes('like') ||
      dataTestId.includes('like')
    );
  }

  isTweetButton(node, text, ariaLabel) {
    const lowerText = (text || '').toLowerCase();
    const lowerAria = (ariaLabel || '').toLowerCase();
    
    return (
      lowerText.includes('tweet') ||
      lowerText.includes('post') ||
      lowerAria.includes('tweet') ||
      lowerAria.includes('post') ||
      node.attributes?.['data-testid']?.includes('tweet') ||
      node.attributes?.['data-testid']?.includes('post')
    );
  }

  isTweetButtonFromElement(element) {
    if (!element) return false;
    const text = this.getElementText(element).toLowerCase();
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    const dataTestId = element.getAttribute('data-testid') || '';
    
    return (
      text.includes('tweet') ||
      text.includes('post') ||
      ariaLabel.includes('tweet') ||
      ariaLabel.includes('post') ||
      dataTestId.includes('tweet') ||
      dataTestId.includes('post')
    );
  }

  isTextArea(node, text, ariaLabel) {
    return (
      node.tagName === 'textarea' ||
      node.attributes?.contenteditable === 'true' ||
      node.attributes?.role === 'textbox'
    );
  }

  isTextAreaFromElement(element) {
    if (!element) return false;
    return (
      element.tagName === 'TEXTAREA' ||
      element.contentEditable === 'true' ||
      element.getAttribute('role') === 'textbox'
    );
  }

  extractElementText(node) {
    let text = '';
    
    if (node.children && Array.isArray(node.children)) {
      for (const childId of node.children) {
        const child = this.domCache?.map[childId];
        if (child) {
          if (child.type === 'TEXT_NODE' && child.text) {
            text += child.text + ' ';
          } else {
            text += this.extractElementText(child) + ' ';
          }
        }
      }
    }
    
    return text.trim();
  }

  isMobileView() {
    return window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);
  }

  detectPlatform() {
    const url = window.location.href;
    
    if (url.includes('x.com') || url.includes('twitter.com')) {
      return {
        name: 'twitter',
        isMobile: this.isMobileView()
      };
    }
    
    return { name: 'unknown', isMobile: this.isMobileView() };
  }

  analyzePageContext() {
    const url = window.location.href;
    const context = {
      platform: 'unknown',
      pageType: 'unknown',
      capabilities: [],
      isMobile: this.isMobileView()
    };

    if (url.includes('x.com') || url.includes('twitter.com')) {
      context.platform = 'twitter';
      context.capabilities = ['post', 'like', 'retweet', 'follow'];
      
      if (url.includes('/compose')) {
        context.pageType = 'compose';
      } else if (url.includes('/home')) {
        context.pageType = 'home';
      } else {
        context.pageType = 'feed';
      }
    }

    return context;
  }

  async getEnhancedPageState(options = {}) {
    try {
      const domState = await this.buildCurrentDomTree(options);
      
      return {
        url: window.location.href,
        title: document.title,
        platform: this.detectPlatform(window.location.href),
        pageType: this.determinePageType(window.location.href),
        
        interactiveElements: domState.interactiveElements || [],
        
        loginStatus: {
          isLoggedIn: this.checkLoginStatus(),
          hasLoginForm: this.hasLoginElements(),
          hasSignupPrompts: this.hasSignupElements()
        },
        
        contentContext: {
          hasComposeForm: this.hasComposeElements(),
          hasPostForm: this.hasPostElements(),
          canPost: this.canUserPost(),
          composerState: this.getComposerState()
        },
        
        domStats: {
          totalElements: domState.totalElements || 0,
          interactiveElements: domState.interactiveElements?.length || 0,
          visibleElements: domState.visibleElements || 0
        }
      };
    } catch (error) {
      console.error('Enhanced page state extraction failed:', error);
      return this.getFullPageState();
    }
  }

  detectPlatform(url) {
    if (url.includes('x.com') || url.includes('twitter.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    return 'unknown';
  }

  determinePageType(url) {
    if (url.includes('/compose') || url.includes('/intent/tweet')) return 'compose';
    if (url.includes('/home') || url.includes('/timeline')) return 'home';
    if (url.includes('/login') || url.includes('/signin')) return 'login';
    if (url.includes('/profile') || url.includes('/user/')) return 'profile';
    return 'general';
  }

  checkLoginStatus() {
    const platform = this.detectPlatform(window.location.href);
    
    switch (platform) {
      case 'twitter':
        const userAvatar = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
        const loggedInIndicators = document.querySelectorAll('[aria-label*="Account menu"]');
        return userAvatar !== null || loggedInIndicators.length > 0;
      default:
        return !window.location.href.includes('/login') && 
               !window.location.href.includes('/signin');
    }
  }

  hasComposeElements() {
    const platform = this.detectPlatform(window.location.href);
    
    switch (platform) {
      case 'twitter':
        const composeButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
        const tweetTextarea = document.querySelector('[data-testid="tweetTextarea_0"]');
        return composeButton !== null || tweetTextarea !== null;
      default:
        return false;
    }
  }

  getComposerState() {
    const platform = this.detectPlatform(window.location.href);
    
    switch (platform) {
      case 'twitter':
        const textarea = document.querySelector('[data-testid="tweetTextarea_0"]');
        const postButton = document.querySelector('[data-testid="tweetButtonInline"]');
        
        return {
          isOpen: textarea !== null,
          hasContent: textarea?.textContent?.trim().length > 0,
          canPost: postButton && !postButton.disabled,
          characterCount: textarea?.textContent?.length || 0,
          maxCharacters: 280
        };
      default:
        return { isOpen: false, hasContent: false, canPost: false };
    }
  }

  hasLoginElements() {
    return document.querySelector('input[type="password"]') !== null ||
           document.querySelector('[data-testid="loginButton"]') !== null;
  }

  hasSignupElements() {
    return document.querySelector('[data-testid="signupButton"]') !== null ||
           document.querySelector('a[href*="signup"]') !== null;
  }

  hasPostElements() {
    return document.querySelector('[data-testid="tweetButtonInline"]') !== null ||
           document.querySelector('[data-testid="tweetButton"]') !== null;
  }

  canUserPost() {
    const postButton = document.querySelector('[data-testid="tweetButtonInline"]') ||
                      document.querySelector('[data-testid="tweetButton"]');
    return postButton && !postButton.disabled;
  }

  async clickElement(selector) {
    try {
      let element = null;
      
      // Try different approaches to find the element
      if (typeof selector === 'number') {
        // Find by index from DOM tree
        const domResult = await this.buildCurrentDomTree();
        const targetElement = domResult.interactiveElements?.find(el => el.index === selector);
        element = targetElement?.element || document.querySelector(`[data-element-index="${selector}"]`);
      } else if (typeof selector === 'string') {
        // Find by CSS selector
        element = document.querySelector(selector);
      }
      
      // If still not found, try Twitter-specific selectors
      if (!element) {
        const twitterSelectors = [
          '[data-testid="tweetButton"]',
          '[data-testid="tweetButtonInline"]',
          '[role="button"]',
          'button'
        ];
        
        for (const sel of twitterSelectors) {
          element = document.querySelector(sel);
          if (element && this.isElementVisible(element)) {
            break;
          }
        }
      }
      
      if (!element) {
        return { success: false, error: 'Element not found', message: 'Could not locate element' };
      }
      
      if (!this.isElementVisible(element)) {
        return { success: false, error: 'Element not visible', message: 'Element exists but not visible' };
      }
      
      // Android-compatible click
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.delay(500);
      
      // Try multiple click methods for Android compatibility
      try {
        element.click();
      } catch (e) {
        // Fallback to dispatch event
        element.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
      
      await this.delay(300);
      
      return { 
        success: true, 
        message: `Clicked element: ${element.tagName}`,
        elementInfo: {
          tagName: element.tagName,
          text: element.textContent?.substring(0, 50),
          selector: selector
        }
      };
      
    } catch (error) {
      console.error('Click element error:', error);
      return { success: false, error: error.message, message: 'Click failed' };
    }
  }

  async fillElement(selector, text) {
    try {
      let element = null;
      
      // Try different approaches to find the element
      if (typeof selector === 'number') {
        // Find by index from DOM tree
        const domResult = await this.buildCurrentDomTree();
        const targetElement = domResult.interactiveElements?.find(el => el.index === selector);
        element = targetElement?.element;
      } else if (typeof selector === 'string') {
        // Find by CSS selector
        element = document.querySelector(selector);
      }
      
      // If still not found, try Twitter-specific text input selectors
      if (!element) {
        const textSelectors = [
          '[data-testid="tweetTextarea_0"]',
          '[role="textbox"][contenteditable="true"]',
          'textarea',
          '[contenteditable="true"]',
          'input[type="text"]'
        ];
        
        for (const sel of textSelectors) {
          element = document.querySelector(sel);
          if (element && this.isElementVisible(element)) {
            console.log(`Found text element with selector: ${sel}`);
            break;
          }
        }
      }
      
      if (!element) {
        return { success: false, error: 'Text input element not found' };
      }
      
      if (!this.isElementVisible(element)) {
        return { success: false, error: 'Text input element not visible' };
      }
      
      // Focus and clear the element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.delay(500);
      
      element.focus();
      await this.delay(200);
      
      // Clear existing content
      if (element.contentEditable === 'true') {
        element.innerHTML = '';
        element.textContent = text;
        
        // Trigger input events for contenteditable
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        element.value = '';
        element.value = text;
        
        // Trigger events for regular inputs
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      await this.delay(300);
      
      return { 
        success: true, 
        message: `Filled text: "${text.substring(0, 50)}..."`,
        elementInfo: {
          tagName: element.tagName,
          type: element.type || 'contenteditable',
          selector: selector
        }
      };
      
    } catch (error) {
      console.error('Fill element error:', error);
      return { success: false, error: error.message };
    }
  }

  async scrollDown() {
    try {
      const scrollAmount = window.innerHeight * 0.8;
      window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
      
      await this.delay(1500);
      
      return { 
        success: true, 
        message: `Scrolled down by ${scrollAmount}px`,
        scrollY: window.scrollY
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async postTweet(content) {
    try {
      if (!content) {
        content = "🤖 Exploring Chromium Browser features with my AI agent! The open-source foundation powering modern web browsing. #ChromiumBrowser #WebTech #AI";
      }

      // Find textarea with multiple selectors
      const textAreaSelectors = [
        '[data-testid="tweetTextarea_0"]',
        '[role="textbox"][contenteditable="true"]',
        'div[contenteditable="true"]',
        'textarea'
      ];
      
      let textArea = null;
      for (const selector of textAreaSelectors) {
        textArea = document.querySelector(selector);
        if (textArea) break;
      }
      
      if (!textArea) {
        return { success: false, error: 'Tweet textarea not found' };
      }
      
      // Fill content
      textArea.focus();
      if (textArea.tagName === 'TEXTAREA') {
        textArea.value = content;
      } else {
        textArea.textContent = content;
      }
      
      textArea.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(1000);
      
      // Find post button
      const postButtonSelectors = [
        '[data-testid="tweetButton"]',
        '[data-testid="tweetButtonInline"]',
        'button[type="submit"]',
        'button:contains("Post")',
        'button:contains("Tweet")'
      ];
      
      let postButton = null;
      for (const selector of postButtonSelectors) {
        postButton = document.querySelector(selector);
        if (postButton) break;
      }
      
      // Fallback: find by text content
      if (!postButton) {
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('post') || text.includes('tweet')) {
            postButton = btn;
            break;
          }
        }
      }
      
      if (!postButton) {
        return { success: false, error: 'Post button not found' };
      }
      
      postButton.click();
      
      return { success: true, message: 'Tweet posted successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Utility methods
  getElementByXPath(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (error) {
      console.error('XPath evaluation failed:', error);
      return null;
    }
  }

  getXPath(element) {
    try {
      if (element.id !== '') {
        return 'id("' + element.id + '")';
      }
      if (element === document.body) {
        return element.tagName;
      }
      
      let ix = 0;
      const siblings = element.parentNode.childNodes;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          return this.getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
          ix++;
        }
      }
    } catch (error) {
      return '//*[@id="unknown"]';
    }
  }

  isElementVisible(element) {
    try {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    } catch (error) {
      return true;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the Android content script
const androidContentScript = new AndroidContentScript();
console.log('Android-optimized content script loaded');