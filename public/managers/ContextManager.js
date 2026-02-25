/* global chrome */

export class ContextManager {
  constructor() {
    this.activeTabId = null;
  }

  async waitForReady(tabId, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkReady = () => {
        if (Date.now() - startTime > timeout) {
          resolve({ id: tabId, status: 'timeout' });
          return;
        }

        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) {
            setTimeout(checkReady, 500);
          } else if (tab.status === 'complete') {
            resolve(tab);
          } else {
            setTimeout(checkReady, 500);
          }
        });
      };

      checkReady();
    });
  }

  async getCurrentActiveTab() {
    try {
      // Try lastFocusedWindow first (more reliable from background scripts)
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tabs && tabs.length > 0) return tabs[0];

      // Fallback to tracked active tab ID if set
      if (this.activeTabId) {
        try {
          return await chrome.tabs.get(this.activeTabId);
        } catch (e) {
          console.log('Tracked tab no longer exists', e);
        }
      }

      // Final fallback: any active tab
      const anyTabs = await chrome.tabs.query({ active: true });
      return anyTabs[0] || null;
    } catch (error) {
      console.error('Error getting active tab:', error);
      return null;
    }
  }
}