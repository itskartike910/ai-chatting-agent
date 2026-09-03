/* global chrome */

/**
 * DOM Service - Universal Chrome API implementation
 * Uses chrome.scripting.executeScript and buildDomTree.js for DOM interaction
 * Compatible with all Chromium-based browsers (Chrome, Edge, Brave, etc.)
 */

export class DOMService {
  constructor() {
    this.injectedTabs = new Set();
    // Store element maps by tabId for index-based lookup
    this.elementMaps = new Map();
  }

  /**
   * Helper to execute script with a timeout to prevent hanging during navigation
   */
  async executeWithTimeout(options, timeoutMs = 8000) {
    const executePromise = chrome.scripting.executeScript(options);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Script execution timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    return Promise.race([executePromise, timeoutPromise]);
  }

  /**
   * Check if buildDomTree script is already injected in a tab
   */
  async isScriptInjected(tabId) {
    try {
      const results = await this.executeWithTimeout({
        target: { tabId, allFrames: false },
        func: () => Object.prototype.hasOwnProperty.call(window, 'buildDomTree'),
      }, 5000);
      return results?.[0]?.result || false;
    } catch (error) {
      console.error('Failed to check script injection:', error);
      return false;
    }
  }

  /**
   * Inject buildDomTree script into a tab
   */
  async injectBuildDomTreeScript(tabId) {
    try {
      // Check if already injected
      if (this.injectedTabs.has(tabId)) {
        const isInjected = await this.isScriptInjected(tabId);
        if (isInjected) {
          return true;
        }
        // If not actually injected, remove from cache
        this.injectedTabs.delete(tabId);
      }

      // Inject the script
      await this.executeWithTimeout({
        target: { tabId, allFrames: true },
        files: ['buildDomTree.js'],
      }, 10000);

      this.injectedTabs.add(tabId);
      console.log(`✅ Injected buildDomTree script into tab ${tabId}`);
      return true;
    } catch (error) {
      console.error('Failed to inject buildDomTree script:', error);
      // Try to inject anyway even if check failed
      try {
        await this.executeWithTimeout({
          target: { tabId },
          files: ['buildDomTree.js'],
        }, 8000);
        this.injectedTabs.add(tabId);
        return true;
      } catch (retryError) {
        console.error('Retry injection also failed:', retryError);
        return false;
      }
    }
  }

  /**
   * Get page state using buildDomTree
   * Equivalent to chrome.wootz.getPageState()
   */
  async getPageState(tabId, options = {}) {
    const {
      debugMode = false,
      includeHidden = false,
      showHighlightElements = true,
      focusHighlightIndex = -1,
      viewportExpansion = 0,
    } = options;

    try {
      // Ensure script is injected
      await this.injectBuildDomTreeScript(tabId);

      // Execute buildDomTree in the page context
      const results = await this.executeWithTimeout({
        target: { tabId },
        func: (args) => {
          if (!window.buildDomTree) {
            return { error: 'buildDomTree not available' };
          }
          return window.buildDomTree(args);
        },
        args: [
          {
            showHighlightElements,
            focusHighlightIndex,
            viewportExpansion,
            startId: 0,
            startHighlightIndex: 0,
            debugMode,
          },
        ],
      }, 15000); // 15s timeout for full DOM parsing

      const result = results?.[0]?.result;
      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to build DOM tree');
      }

      // Get tab info for URL and title
      const tab = await chrome.tabs.get(tabId);

      // Extract visible page text content (first 3000 chars) for page-level Q&A
      let extractedContent = '';
      try {
        const textResults = await this.executeWithTimeout({
          target: { tabId },
          func: () => {
            try {
              const bodyText = document.body.innerText || '';
              // Take first 3000 chars, trim to last complete sentence
              let text = bodyText.substring(0, 3000).trim();
              const lastPeriod = text.lastIndexOf('.');
              if (lastPeriod > 2000) {
                text = text.substring(0, lastPeriod + 1);
              }
              return text;
            } catch (e) {
              return '';
            }
          },
        }, 5000);
        extractedContent = textResults?.[0]?.result || '';
      } catch (e) {
        console.warn('Failed to extract page text:', e.message);
      }

      // Store the element map for this tab for index-based lookups
      this.elementMaps.set(tabId, result.map);

      // Transform result to match expected format
      return {
        success: true,
        pageState: {
          url: tab.url,
          title: tab.title,
          viewport: {
            width: result.viewport?.width || 0,
            height: result.viewport?.height || 0,
          },
          elements: this._transformElements(result.map, result.rootId),
          domTree: result,
          extractedContent: extractedContent,
        },
      };
    } catch (error) {
      console.error('getPageState failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transform buildDomTree output to elements array
   */
  _transformElements(elementMap, rootId) {
    if (!elementMap) return [];

    const elements = [];
    const visited = new Set();

    const traverse = (nodeId) => {
      if (!nodeId || visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = elementMap[nodeId];
      if (!node) return;

      // Skip text nodes
      if (node.type === 'TEXT_NODE') return;

      // Add element if it's interactive or visible
      if (node.isInteractive || node.isVisible) {
        const element = {
          index: node.highlightIndex,
          tagName: node.tagName,
          text: node.text || '',
          textContent: this._getTextContent(node, elementMap),
          isVisible: node.isVisible || false,
          isInteractive: node.isInteractive || false,
          attributes: node.attributes || {},
          xpath: node.xpath || '',
          selector: node.attributes?.['data-selector'] || '',
          bounds: node.bounds || {},
          highlightIndex: node.highlightIndex,
        };

        // Add category and purpose fields for planner compatibility
        const { category, purpose } = this._categorizeElement(element);
        element.category = category;
        element.purpose = purpose;

        elements.push(element);
      }

      // Traverse children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    };

    traverse(rootId);
    return elements;
  }

  /**
   * Extract text content from a node
   */
  _getTextContent(node, elementMap) {
    if (!node) return '';

    let text = node.text || '';

    if (node.children && Array.isArray(node.children)) {
      for (const childId of node.children) {
        const childNode = elementMap[childId];
        if (childNode) {
          if (childNode.type === 'TEXT_NODE') {
            text += ' ' + (childNode.text || '');
          } else {
            text += ' ' + this._getTextContent(childNode, elementMap);
          }
        }
      }
    }

    return text.trim();
  }

  /**
   * Categorize element for planner compatibility
   * Returns { category, purpose } based on element properties
   */
  _categorizeElement(element) {
    const tagName = (element.tagName || '').toLowerCase();
    const attrs = element.attributes || {};
    const text = (element.text || '').toLowerCase();
    const role = (attrs.role || '').toLowerCase();
    const type = (attrs.type || '').toLowerCase();
    const ariaLabel = (attrs['aria-label'] || '').toLowerCase();
    const className = (attrs.class || '').toLowerCase();
    const id = (attrs.id || '').toLowerCase();

    // Determine category
    let category = 'content'; // default
    let purpose = 'general';

    // Form elements
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      category = 'form';

      if (type === 'submit' || type === 'button') {
        purpose = 'submit';
      } else if (type === 'search') {
        purpose = 'search-input';
      } else if (type === 'email') {
        purpose = 'email-input';
      } else if (type === 'password') {
        purpose = 'password-input';
      } else if (type === 'text' || tagName === 'textarea') {
        purpose = 'text-input';
      } else if (type === 'checkbox' || type === 'radio') {
        purpose = 'selection';
      } else {
        purpose = 'input';
      }
    }
    // Button and action elements
    else if (tagName === 'button' || role === 'button' ||
      (tagName === 'a' && attrs.href) ||
      role === 'link') {
      category = 'action';

      // Determine purpose from text/attributes
      if (text.includes('cart') || text.includes('add to cart') || className.includes('cart') || id.includes('cart')) {
        purpose = 'add-to-cart';
      } else if (text.includes('buy') || text.includes('purchase') || text.includes('checkout')) {
        purpose = 'purchase';
      } else if (text.includes('submit') || type === 'submit') {
        purpose = 'submit';
      } else if (text.includes('search') || ariaLabel.includes('search')) {
        purpose = 'search';
      } else if (text.includes('login') || text.includes('sign in')) {
        purpose = 'login';
      } else if (text.includes('signup') || text.includes('register')) {
        purpose = 'signup';
      } else if (tagName === 'a' && attrs.href) {
        // Links to products or pages
        if (className.includes('product') || id.includes('product') || attrs.href.includes('product')) {
          purpose = 'product-link';
        } else {
          purpose = 'navigation';
        }
      } else {
        purpose = 'click';
      }
    }
    // Navigation elements
    else if (tagName === 'nav' || role === 'navigation' ||
      tagName === 'a' || role === 'link') {
      category = 'navigation';
      purpose = 'link';
    }
    // Interactive elements with role
    else if (element.isInteractive) {
      category = 'action';
      purpose = 'click';
    }

    return { category, purpose };
  }

  /**
   * Perform click action using chrome.scripting
   * Equivalent to chrome.wootz.performAction('click', ...)
   */
  async performClick(tabId, params) {
    try {
      await this.injectBuildDomTreeScript(tabId);

      // If index is provided, resolve xpath/selector from stored element map
      let actionParams = { ...params };
      if (params.index !== undefined && params.index !== null && !params.xpath && !params.selector) {
        const elementNode = this.getElementByIndex(tabId, params.index);
        if (elementNode) {
          if (elementNode.xpath) {
            actionParams.xpath = elementNode.xpath;
          } else if (elementNode.attributes) {
            // Build a selector from attributes
            let selector = elementNode.tagName || '';
            if (elementNode.attributes.id) {
              selector += `#${elementNode.attributes.id}`;
            } else if (elementNode.attributes.class) {
              const classes = elementNode.attributes.class.split(' ').slice(0, 2).join('.');
              selector += `.${classes}`;
            }
            if (selector) {
              actionParams.selector = selector;
            }
          }
        }
      }

      const result = await this.executeWithTimeout({
        target: { tabId },
        func: (params) => {
          // Find element by index, selector, or xpath
          let element = null;

          if (params.index !== undefined && params.index !== null) {
            // Get buildDomTree result to find element by highlightIndex
            const treeResult = window.buildDomTree({
              showHighlightElements: false,
              startHighlightIndex: 0,
              startId: 0
            });
            if (treeResult && treeResult.map) {
              // Find the node with matching highlightIndex
              for (const id in treeResult.map) {
                const node = treeResult.map[id];
                if (node.highlightIndex === params.index) {
                  // Try xpath first
                  if (node.xpath) {
                    const result = document.evaluate(node.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    element = result.singleNodeValue;
                    if (element) break;
                  }
                  // Fall back to selector if xpath fails
                  if (!element && node.attributes) {
                    // Build a selector from attributes
                    let selector = node.tagName || '';
                    if (node.attributes.id) {
                      selector += `#${node.attributes.id}`;
                    } else if (node.attributes.class) {
                      const classes = node.attributes.class.split(' ').slice(0, 2).join('.');
                      selector += `.${classes}`;
                    }
                    if (selector) {
                      try {
                        element = document.querySelector(selector);
                      } catch (e) {
                        // Invalid selector
                      }
                    }
                  }
                  break;
                }
              }
            }

            if (!element) {
              return { success: false, error: `Element with index ${params.index} not found in DOM tree` };
            }
          } else if (params.xpath) {
            const evaluateResult = document.evaluate(params.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            element = evaluateResult.singleNodeValue;
          } else if (params.selector) {
            element = document.querySelector(params.selector);
          }

          if (!element) {
            return { success: false, error: 'Element not found' };
          }

          // Scroll into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Click the element using proper mouse event dispatch
          try {
            // Get element center for mouse event coordinates
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            // Capture current URL before click
            const urlBeforeClick = window.location.href;

            const eventOpts = {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: x,
              clientY: y,
              button: 0
            };

            // Dispatch full mouse event sequence
            element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
            element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
            element.dispatchEvent(new MouseEvent('click', eventOpts));

            // Also call .click() as fallback
            element.click();

            // For anchor tags with href, also follow the link as extra fallback
            if (element.tagName?.toLowerCase() === 'a' && element.href && !element.href.startsWith('javascript:')) {
              const target = element.getAttribute('target');
              if (!target || target === '_self') {
                // Give event handlers a moment to fire first
                setTimeout(() => {
                  // Only navigate if we didn't already navigate
                  if (window.location.href === urlBeforeClick) {
                    window.location.href = element.href;
                  }
                }, 200);
              }
            }

            return { success: true, message: 'Clicked successfully' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        args: [actionParams],
      });

      const actionResult = result?.[0]?.result;
      return actionResult || { success: false, error: 'No result from click action' };
    } catch (error) {
      console.error('performClick failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform fill/type action using chrome.scripting
   * Equivalent to chrome.wootz.performAction('fill', ...)
   */
  async performFill(tabId, params) {
    try {
      await this.injectBuildDomTreeScript(tabId);

      // If index is provided, resolve xpath/selector from stored element map
      let actionParams = { ...params };
      if (params.index !== undefined && params.index !== null && !params.xpath && !params.selector) {
        const elementNode = this.getElementByIndex(tabId, params.index);
        if (elementNode) {
          if (elementNode.xpath) {
            actionParams.xpath = elementNode.xpath;
          } else if (elementNode.attributes) {
            // Build a selector from attributes
            let selector = elementNode.tagName || '';
            if (elementNode.attributes.id) {
              selector += `#${elementNode.attributes.id}`;
            } else if (elementNode.attributes.class) {
              const classes = elementNode.attributes.class.split(' ').slice(0, 2).join('.');
              selector += `.${classes}`;
            }
            if (selector) {
              actionParams.selector = selector;
            }
          }
        }
      }

      const result = await this.executeWithTimeout({
        target: { tabId },
        func: (params) => {
          // Find element by index, selector, or xpath
          let element = null;

          if (params.index !== undefined && params.index !== null) {
            // Get buildDomTree result to find element by highlightIndex
            const treeResult = window.buildDomTree({
              showHighlightElements: false,
              startHighlightIndex: 0,
              startId: 0
            });
            if (treeResult && treeResult.map) {
              // Find the node with matching highlightIndex
              for (const id in treeResult.map) {
                const node = treeResult.map[id];
                if (node.highlightIndex === params.index) {
                  // Try xpath first
                  if (node.xpath) {
                    const result = document.evaluate(node.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    element = result.singleNodeValue;
                    if (element) break;
                  }
                  // Fall back to selector if xpath fails
                  if (!element && node.attributes) {
                    let selector = node.tagName || '';
                    if (node.attributes.id) {
                      selector += `#${node.attributes.id}`;
                    } else if (node.attributes.class) {
                      const classes = node.attributes.class.split(' ').slice(0, 2).join('.');
                      selector += `.${classes}`;
                    }
                    if (selector) {
                      try {
                        element = document.querySelector(selector);
                      } catch (e) {
                        // Invalid selector
                      }
                    }
                  }
                  break;
                }
              }
            }

            if (!element) {
              return { success: false, error: `Element with index ${params.index} not found in DOM tree` };
            }
          } else if (params.xpath) {
            const evaluateResult = document.evaluate(params.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            element = evaluateResult.singleNodeValue;
          } else if (params.selector) {
            element = document.querySelector(params.selector);
          }

          if (!element) {
            return { success: false, error: 'Element not found' };
          }

          // Scroll into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Focus the element
          element.focus();

          // Clear existing value
          if ('value' in element) {
            element.value = '';
          } else if (element.isContentEditable) {
            element.textContent = '';
          }

          // Set the text value
          if ('value' in element) {
            element.value = params.text;
            // Trigger input events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (element.isContentEditable) {
            element.textContent = params.text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }

          return { success: true, message: 'Text filled successfully' };
        },
        args: [actionParams],
      });

      const actionResult = result?.[0]?.result;
      return actionResult || { success: false, error: 'No result from fill action' };
    } catch (error) {
      console.error('performFill failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform scroll action using chrome.scripting
   * Equivalent to chrome.wootz.performAction('scroll', ...)
   */
  async performScroll(tabId, params) {
    try {
      const result = await this.executeWithTimeout({
        target: { tabId },
        func: (params) => {
          const { direction = 'down', amount = 300 } = params;
          const scrollAmount = parseInt(amount, 10);

          try {
            if (direction === 'down') {
              window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            } else if (direction === 'up') {
              window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
            } else if (direction === 'left') {
              window.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else if (direction === 'right') {
              window.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }

            return { success: true, message: `Scrolled ${direction} by ${scrollAmount}px` };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        args: [params],
      });

      const actionResult = result?.[0]?.result;
      return actionResult || { success: false, error: 'No result from scroll action' };
    } catch (error) {
      console.error('performScroll failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove highlights from the page
   */
  async removeHighlights(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => {
          // Remove the highlight container
          const container = document.getElementById('playwright-highlight-container');
          if (container) {
            container.remove();
          }

          // Remove highlight attributes
          const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
          for (const el of Array.from(highlightedElements)) {
            el.removeAttribute('browser-user-highlight-id');
          }
        },
      });
    } catch (error) {
      console.warn('Failed to remove highlights:', error);
    }
  }

  /**
   * Capture screenshot using standard Chrome API
   * Equivalent to chrome.wootz.captureScreenshot()
   */
  async captureScreenshot(tabId, options = {}) {
    try {
      const { format = 'png', quality = 90 } = options;
      let windowId = null;

      if (tabId) {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab && tab.url && (
            tab.url.startsWith('chrome://') ||
            tab.url.startsWith('devtools://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('about:')
          )) {
            return {
              success: false,
              error: 'Cannot capture screenshot of internal browser pages',
            };
          }
          windowId = tab?.windowId || null;
        } catch (e) {
          // ignore tab lookup failure
        }
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: format === 'jpg' ? quality : undefined,
      });

      return {
        success: true,
        dataUrl: dataUrl,
      };
    } catch (error) {
      // Return error quietly without crashing
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up when tab is closed
   */
  onTabClosed(tabId) {
    this.injectedTabs.delete(tabId);
    this.elementMaps.delete(tabId);
  }

  /**
   * Get element details by index from stored element map
   * Returns the element node with xpath, selector, and attributes for action execution
   */
  getElementByIndex(tabId, index) {
    const elementMap = this.elementMaps.get(tabId);
    if (!elementMap) {
      return null;
    }

    for (const id in elementMap) {
      const node = elementMap[id];
      if (node.highlightIndex === index) {
        return node;
      }
    }
    return null;
  }
}

// Export singleton instance
export const domService = new DOMService();

