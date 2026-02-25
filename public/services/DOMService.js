/* global chrome */

/**
 * DOM Service - Universal Chrome API implementation
 * Uses chrome.scripting.executeScript and buildDomTree.js for DOM interaction
 * Compatible with all Chromium-based browsers (Chrome, Edge, Brave, etc.)
 */

export class DOMService {
  constructor() {
    this.injectedTabs = new Set();
  }

  /**
   * Check if buildDomTree script is already injected in a tab
   */
  async isScriptInjected(tabId) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        func: () => Object.prototype.hasOwnProperty.call(window, 'buildDomTree'),
      });
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
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['buildDomTree.js'],
      });

      this.injectedTabs.add(tabId);
      console.log(`✅ Injected buildDomTree script into tab ${tabId}`);
      return true;
    } catch (error) {
      console.error('Failed to inject buildDomTree script:', error);
      // Try to inject anyway even if check failed
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['buildDomTree.js'],
        });
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
      const results = await chrome.scripting.executeScript({
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
      });

      const result = results?.[0]?.result;
      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to build DOM tree');
      }

      // Get tab info for URL and title
      const tab = await chrome.tabs.get(tabId);

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

      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (params) => {
          // Find element by index, selector, or xpath
          let element = null;

          if (params.index !== undefined && params.index !== null) {
            // Get buildDomTree result to find element by highlightIndex
            const treeResult = window.buildDomTree({ showHighlightElements: false });
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
          } else if (params.selector) {
            element = document.querySelector(params.selector);
          }

          if (!element) {
            return { success: false, error: 'Element not found' };
          }

          // Scroll into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Click the element
          try {
            element.click();
            return { success: true, message: 'Clicked successfully' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        args: [params],
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

      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (params) => {
          // Find element by index, selector, or xpath
          let element = null;

          if (params.index !== undefined && params.index !== null) {
            // Get buildDomTree result to find element by highlightIndex
            const treeResult = window.buildDomTree({ showHighlightElements: false });
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
        args: [params],
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
      const result = await chrome.scripting.executeScript({
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

      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: format === 'jpg' ? quality : undefined,
      });

      return {
        success: true,
        dataUrl: dataUrl,
      };
    } catch (error) {
      console.error('captureScreenshot failed:', error);
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
  }
}

// Export singleton instance
export const domService = new DOMService();

