/* global chrome */

export class ActionRegistry {
  constructor(browserContext) {
    this.browserContext = browserContext;
    this.actions = new Map();
    this.initializeActions();
  }

  initializeActions() {
    // Navigation Action
    this.actions.set('navigate', {
      description: 'Navigate to a specific URL',
      schema: {
        url: 'string - The complete URL to navigate to',
        intent: 'string - Description of why navigating to this URL'
      },
      handler: async (input) => {
        try {
          const url = this.validateAndFixUrl(input.url);
          if (!url) {
            throw new Error('Invalid or missing URL');
          }
          
          console.log(`🌐 Universal Navigation: ${url}`);
          
          const currentTab = await this.browserContext.getCurrentActiveTab();
          if (currentTab) {
            try {
              await chrome.tabs.remove(currentTab.id);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              console.log('Could not close current tab:', e);
            }
          }
          
          const newTab = await chrome.tabs.create({ url: url, active: true });
          this.browserContext.activeTabId = newTab.id;
          await this.browserContext.waitForReady(newTab.id);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
            success: true,
            extractedContent: `Successfully navigated to ${url}`,
            includeInMemory: true,
            navigationCompleted: true
          };
          
        } catch (error) {
          console.error('Navigation error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Navigation failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Click Action - Universal
    this.actions.set('click', {
      description: 'Click on any interactive element on the page',
      schema: {
        index: 'number - The element index from the page state',
        selector: 'string - CSS selector (from page state only)',
        intent: 'string - Description of what you are clicking and why'
      },
      handler: async (input) => {
        try {
          console.log(`🖱️ Universal Click: ${input.intent || 'Click action'}`);
          
          return new Promise((resolve) => {
            const actionParams = {};
            
            if (input.index !== undefined) {
              actionParams.index = input.index;
              console.log(`🎯 Using element index: ${input.index}`);
            } else if (input.selector) {
              actionParams.selector = input.selector;
              console.log(`🎯 Using selector: ${input.selector}`);
            } else {
              resolve({
                success: false,
                error: 'No index or selector provided',
                extractedContent: 'Click failed: No target specified',
                includeInMemory: true
              });
              return;
            }

            chrome.wootz.performAction('click', actionParams, (result) => {
              resolve({
                success: result.success,
                extractedContent: result.success ?
                  `Successfully clicked: ${input.intent}` :
                  `Click failed: ${result.error}`,
                includeInMemory: true,
                error: result.error
              });
            });
          });
        } catch (error) {
          console.error('Click action error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Click failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Type Action - Universal
    this.actions.set('type', {
      description: 'Type text into any input field, textarea, or contenteditable element',
      schema: {
        index: 'number - The element index from the page state',
        selector: 'string - CSS selector (from page state only)',
        text: 'string - The text to type into the element',
        intent: 'string - Description of what you are typing and why'
      },
      handler: async (input) => {
        try {
          console.log(`⌨️ Universal Type: "${input.text}" - ${input.intent}`);
          return new Promise((resolve) => {
            const actionParams = { text: input.text };
            if (input.index !== undefined) {
              actionParams.index = input.index;
            } else if (input.selector) {
              actionParams.selector = input.selector;
            } else {
              resolve({
                success: false,
                error: 'No index or selector provided for text input',
                extractedContent: `Type failed: No target specified for "${input.text}"`,
                includeInMemory: true
              });
              return;
            }
            chrome.wootz.performAction('fill', actionParams, (result) => {
              resolve({
                success: result.success,
                extractedContent: result.success ?
                  `Successfully typed: "${input.text}"` :
                  `Type failed: ${result.error}`,
                includeInMemory: true,
                error: result.error
              });
            });
          });
        } catch (error) {
          console.error('Type action error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Type failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Scroll Action - Universal
    this.actions.set('scroll', {
      description: 'Scroll the page in any direction',
      schema: {
        direction: 'string - Direction to scroll (up, down, left, right)',
        amount: 'number - Amount to scroll in pixels (optional, default: 300)',
        intent: 'string - Description of why you are scrolling'
      },
      handler: async (input) => {
        try {
          const amount = String(input.amount || 300);
          const direction = input.direction || 'down';
          
          console.log(`📜 Universal Scroll: ${direction} by ${amount}px - ${input.intent}`);
          
          return new Promise((resolve) => {
            chrome.wootz.performAction('scroll', {
              direction: direction,
              amount: amount
            }, (result) => {
              resolve({
                success: result.success,
                extractedContent: result.success ? 
                  `Scrolled ${direction} by ${amount}px` : 
                  `Scroll failed: ${result.error}`,
                includeInMemory: true,
                error: result.error
              });
            });
          });
        } catch (error) {
          console.error('Scroll action error:', error);
          return {
            success: false,
            error: error.message,
            extractedContent: `Scroll failed: ${error.message}`,
            includeInMemory: true
          };
        }
      }
    });

    // Wait Action - Universal
    this.actions.set('wait', {
      description: 'Wait for a specified amount of time',
      schema: {
        duration: 'number - Time to wait in milliseconds (default: 2000)',
        intent: 'string - Reason for waiting'
      },
      handler: async (input) => {
        const duration = input.duration || 2000;
        console.log(`⏳ Universal Wait: ${duration}ms - ${input.intent}`);
        await new Promise(resolve => setTimeout(resolve, duration));
        return {
          success: true,
          extractedContent: `Waited ${duration}ms`,
          includeInMemory: true
        };
      }
    });

    // Complete Action - Universal
    this.actions.set('complete', {
      description: 'Mark the task as completed with a summary',
      schema: {
        success: 'boolean - Whether the task was successful',
        summary: 'string - Summary of what was accomplished',
        details: 'string - Additional details about the completion'
      },
      handler: async (input) => {
        console.log(`✅ Task Complete: ${input.summary}`);
        return {
          success: input.success !== false,
          extractedContent: input.summary || 'Task completed',
          isDone: true,
          includeInMemory: true,
          completionDetails: input.details
        };
      }
    });

    // Find and Click by heuristics (text/purpose/category) with smart shopping logic
    this.actions.set('find_click', {
      description: 'Find an interactive element by text/purpose/category and click it - enhanced for shopping/social sites',
      schema: {
        text: 'string - Substring to match in textContent/text (case-insensitive)',
        purpose: 'string - Optional purpose to prefer (e.g., submit, add-to-cart, product-link)',
        category: 'string - Optional category to prefer (action, form, navigation)',
        intent: 'string - Why clicking this target',
        context: 'string - Shopping context like "carbonara ingredients" or "electronics under $50"'
      },
      handler: async (input) => {
        const score = (el) => {
          if (!el?.isVisible || !el?.isInteractive) return -1;
          let s = 0;
          const txt = (el.text || el.textContent || '').toLowerCase();
          const ariaLabel = (el.attributes?.['aria-label'] || '').toLowerCase();
          const className = (el.attributes?.class || '').toLowerCase();
          const id = (el.attributes?.id || '').toLowerCase();
          
          // Enhanced text matching
          if (input.text) {
            const searchText = String(input.text).toLowerCase();
            if (txt.includes(searchText)) s += 15; // Higher score for exact text match
            if (ariaLabel.includes(searchText)) s += 12;
            if (className.includes(searchText.replace(/\s+/g, '-'))) s += 8; // CSS class format
            if (id.includes(searchText.replace(/\s+/g, '-'))) s += 10; // ID format
            
            // Partial word matching for better flexibility
            const searchWords = searchText.split(' ');
            const matchingWords = searchWords.filter(word => 
              txt.includes(word) || ariaLabel.includes(word)
            );
            if (matchingWords.length > 0) {
              s += (matchingWords.length / searchWords.length) * 8;
            }
          }
          
          // Purpose and category matching with higher weights
          if (input.purpose && (el.purpose || '').toLowerCase() === String(input.purpose).toLowerCase()) s += 8;
          if (input.category && (el.category || '').toLowerCase() === String(input.category).toLowerCase()) s += 6;
          
          // Element type preferences for actions
          if (el.tagName === 'BUTTON') s += 3;
          if (el.tagName === 'A' && el.attributes?.href) s += 2;
          if (el.tagName === 'INPUT' && el.attributes?.type === 'submit') s += 4;
          
          // Size bonus (larger elements are often more important)
          const area = (el.bounds?.width || 0) * (el.bounds?.height || 0);
          s += Math.min(3, Math.log10(1 + area/1000));
          
          return s;
        };
        return new Promise((resolve) => {
          chrome.wootz.getPageState({ debugMode: false, includeHidden: true }, (res) => {
            if (!res?.success) {
              resolve({ success: false, error: 'getPageState failed', includeInMemory: true });
              return;
            }
            const els = (res.pageState?.elements || []).map((el, i) => ({ index: el.index ?? i, selector: el.selector, textContent: el.textContent, text: el.text, isVisible: el.isVisible !== false, isInteractive: el.isInteractive !== false, purpose: el.purpose, category: el.category, bounds: el.bounds }));
            const candidates = els.map(el => ({ el, s: score(el) })).filter(x => x.s >= 0).sort((a,b) => b.s-a.s);
            const best = candidates[0]?.el;
            if (!best) {
              resolve({ success: false, error: 'No matching element found', includeInMemory: true });
              return;
            }
            const params = best.selector ? { selector: best.selector } : { index: best.index };
            chrome.wootz.performAction('click', params, (r) => {
              resolve({ success: r.success, extractedContent: r.success ? `Clicked by find_click: ${input.intent || input.text || ''}` : `find_click failed: ${r.error}`, includeInMemory: true, error: r.error });
            });
          });
        });
      }
    });

    // Find and Type (match input by placeholder/name/aria-label)
    this.actions.set('find_type', {
      description: 'Find an input/textarea by placeholder/name/label and type text',
      schema: {
        query: 'string - Placeholder/name/label text to match',
        text: 'string - Text to type',
        intent: 'string - Why typing into this field'
      },
      handler: async (input) => {
        const q = String(input.query || '').toLowerCase();
        const score = (el) => {
          if (!el?.isVisible || !el?.isInteractive) return -1;
          const tag = (el.tagName || '').toLowerCase();
          if (!(tag === 'input' || tag === 'textarea')) return -1;
          let s = 1;
          const attrs = el.attributes || {};
          const hay = [el.text || '', el.textContent || '', attrs.placeholder || '', attrs.name || '', attrs['aria-label'] || ''].join(' ').toLowerCase();
          if (q && hay.includes(q)) s += 5;
          if ((attrs.type || '').toLowerCase() === 'search') s += 1;
          return s;
        };
        return new Promise((resolve) => {
          chrome.wootz.getPageState({ debugMode: false, includeHidden: true }, (res) => {
            if (!res?.success) { resolve({ success:false, error:'getPageState failed', includeInMemory:true }); return; }
            const els = (res.pageState?.elements || []).map((el, i) => ({ ...el, index: el.index ?? i }));
            const candidates = els.map(el => ({ el, s: score(el) })).filter(x => x.s >= 0).sort((a,b)=>b.s-a.s);
            const best = candidates[0]?.el;
            if (!best) { resolve({ success:false, error:'No matching input found', includeInMemory:true }); return; }
            const params = best.selector ? { selector: best.selector, text: input.text } : { index: best.index, text: input.text };
            chrome.wootz.performAction('fill', params, (r) => {
              resolve({ success: r.success, extractedContent: r.success ? `Typed by find_type: ${input.intent || input.text || ''}` : `find_type failed: ${r.error}`, includeInMemory: true, error: r.error });
            });
          });
        });
      }
    });

    // Go back in history (tab back) via minimal content-script bridge
    this.actions.set('go_back', {
      description: 'Navigate back in browser history',
      schema: { intent: 'string - Why navigating back' },
      handler: async (_input) => {
        try {
          const tab = await this.browserContext.getCurrentActiveTab();
          if (!tab?.id) return { success:false, error:'No active tab', includeInMemory:true };
          const res = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { type: '__agent_history_back' }, (resp) => resolve(resp));
          });
          if (res?.ok) {
            await this.browserContext.waitForReady(tab.id);
            return { success:true, extractedContent:'Went back one step', includeInMemory:true };
          }
          return { success:false, error: res?.error || 'history back failed', includeInMemory:true };
        } catch (e) {
          return { success:false, error: e.message, extractedContent:`Back failed: ${e.message}`, includeInMemory:true };
        }
      }
    });

    // Wait until text appears (basic condition wait)
    this.actions.set('wait_for_text', {
      description: 'Wait until an element containing specific text appears (timeout ms)',
      schema: { text: 'string - Substring to wait for', timeout: 'number - milliseconds (default 4000)' },
      handler: async (input) => {
        const text = String(input.text || '').toLowerCase();
        const timeout = Number(input.timeout || 4000);
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const state = await new Promise(resolve => chrome.wootz.getPageState({ debugMode:false, includeHidden:true }, resolve));
          const els = (state?.pageState?.elements || []);
          if (els.some(e => ((e.text || e.textContent || '').toLowerCase().includes(text)) && e.isVisible)) {
            return { success: true, extractedContent:`wait_for_text found: ${input.text}`, includeInMemory:true };
          }
          await new Promise(r => setTimeout(r, 300));
        }
        return { success:false, error:'Timeout waiting for text', includeInMemory:true };
      }
    });

    // Capture screenshot (content script will attempt html2canvas if available)
    this.actions.set('screenshot', {
      description: 'Capture a screenshot of the current tab viewport for visual analysis',
      schema: { 
        quality: 'number - JPEG quality hint (content-script dependent)',
        intent: 'string - Why taking screenshot (for planning context)'
      },
      handler: async (input) => {
        try {
          const tab = await this.browserContext.getCurrentActiveTab();
          if (!tab?.id) return { success:false, error:'No active tab', includeInMemory:true };
          const res = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { type: '__agent_capture_screenshot', quality: input.quality || 0.6 }, (resp) => resolve(resp));
          });
          if (res?.ok && res.imageData) {
            // Store screenshot for later LLM use (similar to BrowserBee pattern)
            const screenshotId = `screenshot-${Date.now()}`;
            if (!this.screenshotStore) this.screenshotStore = new Map();
            this.screenshotStore.set(screenshotId, {
              imageData: res.imageData,
              timestamp: new Date().toISOString(),
              intent: input.intent || 'Visual context capture'
            });
            console.log(`📸 Screenshot ${screenshotId} stored for planning context`);
            return { 
              success: true, 
              extractedContent: `Screenshot captured as ${screenshotId}`, 
              screenshotRef: screenshotId,
              includeInMemory: true
            };
          }
          if (res?.ok && res.pageHtml) {
            return { success:true, extractedContent:'HTML snapshot captured', pageHtml: res.pageHtml, includeInMemory:false };
          }
          return { success:false, error: res?.error || 'screenshot unavailable', includeInMemory:true };
        } catch (e) {
          return { success:false, error:e.message, extractedContent:`Screenshot failed: ${e.message}`, includeInMemory:true };
        }
      }
    });

    // Enhanced add to cart action for e-commerce sites with automatic scrolling
    this.actions.set('add_to_cart', {
      description: 'Find and click add to cart button with e-commerce specific logic and auto-scroll',
      schema: {
        product_context: 'string - Optional product description for context',
        intent: 'string - Why adding this product to cart'
      },
      handler: async (input) => {
        try {
          // First attempt - check current viewport
          let state = await this.browserContext.getCurrentState();
          console.log('🛒 Searching for add to cart button...');
          
          // Amazon and e-commerce specific "add to cart" selectors with priority order
          const addToCartSelectors = [
            '#add-to-cart-button', // Amazon main (highest priority)
            '#buy-now-button', // Alternative buy button
            '.a-button-input[type="submit"][name="submit.addToCart"]', // Amazon specific
            '[name="add-to-cart"]', // Generic name
            '.puis-add-to-cart-button', // Amazon search results
            '[data-testid*="add-to-cart"]', '[data-testid*="addtocart"]', // Test ID patterns
            '[title*="Add to cart"]', '[aria-label*="Add to cart"]', // Aria/title
            '.add-to-cart', '.addtocart', '.add_to_cart', '.btn-add-to-cart', // CSS classes
            'button[type="submit"]' // Generic submit buttons (lowest priority)
          ];
          
          let bestElement = null;
          let scrollAttempts = 0;
          const maxScrollAttempts = 3;
          
          // Try finding element with up to 3 scroll attempts
          while (!bestElement && scrollAttempts <= maxScrollAttempts) {
            const elements = state?.interactiveElements || [];
            let bestScore = 0;
            
            console.log(`🔍 Attempt ${scrollAttempts + 1}: Checking ${elements.length} elements for cart button`);
            
            for (const element of elements) {
              if (!element.isVisible || !element.isInteractive) continue;
              
              let score = 0;
              const text = (element.text || element.textContent || '').toLowerCase();
              const ariaLabel = element.attributes?.['aria-label']?.toLowerCase() || '';
              const className = element.attributes?.class?.toLowerCase() || '';
              const id = element.attributes?.id?.toLowerCase() || '';
              const name = element.attributes?.name?.toLowerCase() || '';
              
              // High priority selectors get highest scores
              for (let i = 0; i < addToCartSelectors.length; i++) {
                const selector = addToCartSelectors[i].toLowerCase();
                if (element.selector?.includes(selector) || 
                    id.includes(selector.replace(/[#.[\]]/g, '')) ||
                    className.includes(selector.replace(/[#.[\]]/g, ''))) {
                  score += (addToCartSelectors.length - i) * 20; // Priority weight
                  break;
                }
              }
              
              // Text content scoring (add to cart, buy now, etc.)
              if (text.includes('add to cart') || text.includes('add to bag')) score += 50;
              if (text.includes('buy now') || text.includes('buy it now')) score += 45;
              if (text.includes('purchase') || text.includes('order now')) score += 40;
              if (text.includes('add') && text.includes('cart')) score += 35;
              if (text.includes('add') && text.includes('bag')) score += 35;
              
              // Aria-label scoring
              if (ariaLabel.includes('add to cart') || ariaLabel.includes('add to bag')) score += 50;
              if (ariaLabel.includes('buy now')) score += 45;
              
              // Element type and attributes scoring
              if (element.tagName === 'BUTTON') score += 10;
              if (element.tagName === 'INPUT' && element.attributes?.type === 'submit') score += 15;
              if (name.includes('addtocart') || name.includes('add-to-cart')) score += 30;
              
              // Amazon-specific patterns
              if (id === 'add-to-cart-button' || id === 'buy-now-button') score += 100;
              if (className.includes('a-button-primary')) score += 25;
              
              if (score > bestScore) {
                bestScore = score;
                bestElement = element;
              }
            }
            
            // If we found a good element, break the scroll loop
            if (bestElement && bestScore >= 30) {
              console.log(`✅ Found add to cart button with score ${bestScore}: ${bestElement.text || bestElement.attributes?.id}`);
              break;
            }
            
            // If no good element found and we haven't reached max attempts, scroll down
            if (!bestElement && scrollAttempts < maxScrollAttempts) {
              console.log(`📜 Scrolling down to find add to cart button (attempt ${scrollAttempts + 1}/${maxScrollAttempts})`);
              
              const scrollResult = await new Promise((resolve) => {
                chrome.wootz.performAction('scroll', { 
                  direction: 'down', 
                  amount: 800 
                }, resolve);
              });
              
              if (scrollResult.success) {
                // Wait a bit for elements to load after scroll
                await new Promise(resolve => setTimeout(resolve, 1500));
                // Get fresh page state after scroll
                state = await this.browserContext.getCurrentState();
              } else {
                console.log('❌ Scroll failed:', scrollResult.error);
                break;
              }
            }
            
            scrollAttempts++;
          }
          
          if (!bestElement) {
            return { 
              success: false, 
              error: 'No add to cart button found after scrolling',
              extractedContent: `Could not find add to cart button on current page. Scrolled ${scrollAttempts} times.`,
              includeInMemory: true 
            };
          }
          
          // Click the best element found
          console.log(`🛒 Clicking add to cart button: ${bestElement.text || bestElement.attributes?.id} (score: ${bestElement.score || 'unknown'})`);
          
          const clickResult = await new Promise((resolve) => {
            chrome.wootz.performAction('click', { 
              index: bestElement.index 
            }, resolve);
          });
          
          if (clickResult.success) {
            return { 
              success: true, 
              extractedContent: `Successfully clicked add to cart button: ${bestElement.text || bestElement.attributes?.id}`,
              includeInMemory: true 
            };
          } else {
            return { 
              success: false, 
              error: clickResult.error,
              extractedContent: `Failed to click add to cart button: ${clickResult.error}`,
              includeInMemory: true 
            };
          }
          
        } catch (e) {
          return { 
            success: false, 
            error: e.message,
            extractedContent: `Add to cart action failed: ${e.message}`,
            includeInMemory: true 
          };
        }
      }
    });

    // Smart shopping search action for e-commerce sites
    this.actions.set('shop_search', {
      description: 'Search for products on e-commerce sites with shopping-specific logic',
      schema: {
        query: 'string - Product search term (e.g., "organic eggs", "parmesan cheese")',
        site: 'string - Optional site context (amazon, flipkart, etc.)',
        intent: 'string - Shopping intent (ingredient, electronics, clothing, etc.)'
      },
      handler: async (input) => {
        try {
          // Find search box with multiple fallbacks for different e-commerce sites
          const searchSelectors = [
            '[data-testid="search-box"]', '#twotabsearchtextbox', // Amazon
            '[name="q"]', '[placeholder*="search"]', '[type="search"]', // Generic
            '.search-input', '#search-input', '.search-box' // Common classes
          ];
          
          const state = await this.browserContext.getCurrentState();
          let searchElement = null;
          
          for (const selector of searchSelectors) {
            searchElement = state?.interactiveElements?.find(el => 
              el.selector === selector || 
              (el.attributes?.name === 'q') ||
              (el.attributes?.placeholder && el.attributes.placeholder.toLowerCase().includes('search'))
            );
            if (searchElement) break;
          }
          
          if (!searchElement) {
            return { success: false, error: 'No search box found on current page', includeInMemory: true };
          }
          
          // Clear existing search text and type new query
          await chrome.wootz.performAction('fill', {
            selector: searchElement.selector || searchElement.xpath,
            text: input.query
          });
          
          // Find and click search button
          const searchButtons = state?.interactiveElements?.filter(el => {
            const txt = (el.text || el.textContent || '').toLowerCase();
            return (
              txt.includes('search') || txt.includes('find') ||
              el.attributes?.type === 'submit' ||
              el.attributes?.['data-testid']?.includes('search') ||
              el.purpose === 'submit'
            );
          });
          
          if (searchButtons?.length > 0) {
            await chrome.wootz.performAction('click', {
              selector: searchButtons[0].selector || searchButtons[0].xpath
            });
            return { 
              success: true, 
              extractedContent: `Searched for "${input.query}" on ${input.site || 'e-commerce site'}`,
              includeInMemory: true 
            };
          }
          
          // Fallback: press Enter on search box
          await chrome.wootz.performAction('key', {
            selector: searchElement.selector || searchElement.xpath,
            key: 'Enter'
          });
          
          return { 
            success: true, 
            extractedContent: `Searched for "${input.query}" using Enter key`,
            includeInMemory: true 
          };
          
        } catch (e) {
          return { success: false, error: e.message, includeInMemory: true };
        }
      }
    });
  }

  async executeAction(actionName, input) {
    const action = this.actions.get(actionName);
    if (!action) {
      throw new Error(`Unknown action: ${actionName}`);
    }

    try {
      return await action.handler(input);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        extractedContent: `Action ${actionName} failed: ${error.message}`,
        includeInMemory: true
      };
    }
  }

  // Provide a readonly map of available actions for other agents
  getAvailableActions() {
    const out = {};
    this.actions.forEach((val, key) => {
      out[key] = { description: val.description, schema: val.schema };
    });
    return out;
  }

  validateAndFixUrl(url) {
    if (!url || typeof url !== 'string') {
      console.error('Invalid URL provided:', url);
      return null;
    }
    
    url = url.trim().replace(/['"]/g, '');
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return url;
      } catch (e) {
        console.error('Invalid URL format:', url);
        return null;
      }
    }
    
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
      return url;
    } catch (e) {
      console.error('Could not create valid URL:', url);
      return null;
    }
  }
}