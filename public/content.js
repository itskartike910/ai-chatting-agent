/* global chrome */
(function () {
  // Agent status popup management
  let agentPopup = null;
  let isAgentActive = false;

  function createAgentPopup() {
    // Remove existing popup if any
    removeAgentPopup();

    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'ai-agent-status-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #00ff88;
      box-shadow: 0 4px 16px rgba(0, 255, 136, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      animation: agentPopupFadeIn 0.3s ease-out;
      pointer-events: none;
      user-select: none;
      max-width: 200px;
      box-sizing: border-box;
    `;

    // Create content
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    `;

    // Create loader
    const loader = document.createElement('div');
    loader.style.cssText = `
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid #00ff88;
      border-radius: 50%;
      animation: agentSpinner 1s linear infinite;
      flex-shrink: 0;
    `;

    // Create text
    const text = document.createElement('div');
    text.textContent = 'AI Agent in Action';
    text.style.cssText = `
      color: #00ff88;
      font-weight: 600;
      font-size: 13px;
      white-space: nowrap;
    `;

    // Create subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'Please do not click or scroll';
    subtitle.style.cssText = `
      color: rgba(255, 255, 255, 0.8);
      font-size: 11px;
      font-weight: 400;
      white-space: nowrap;
    `;

    // Assemble popup
    content.appendChild(loader);
    content.appendChild(text);
    content.appendChild(subtitle);
    popup.appendChild(content);

    // Add CSS animations if not already added
    if (!document.getElementById('ai-agent-popup-styles')) {
      const styles = document.createElement('style');
      styles.id = 'ai-agent-popup-styles';
      styles.textContent = `
        @keyframes agentPopupFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes agentSpinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes agentPopupFadeOut {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
        }
      `;
      document.head.appendChild(styles);
    }

    return popup;
  }

  function showAgentPopup() {
    if (isAgentActive) return; // Already showing
    
    console.log('🤖 Showing AI Agent status popup');
    agentPopup = createAgentPopup();
    document.body.appendChild(agentPopup);
    isAgentActive = true;
  }

  function removeAgentPopup() {
    if (!agentPopup) return;
    
    console.log('🤖 Removing AI Agent status popup');
    
    // Add fade out animation
    agentPopup.style.animation = 'agentPopupFadeOut 0.3s ease-out';
    
    setTimeout(() => {
      if (agentPopup && agentPopup.parentNode) {
        agentPopup.parentNode.removeChild(agentPopup);
      }
      agentPopup = null;
      isAgentActive = false;
    }, 300);
  }

  function tryHistoryBack() {
    console.log('🔍 Trying history back');
    try {
      window.history.back();
      console.log('🔍 History back successful');
      return true;
    } catch (e) {
      console.log('🔍 History back failed:', e);
      return false;
    }
  }

  // Listen for storage changes to show/hide popup
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.isExecuting) {
        if (changes.isExecuting.newValue === true) {
          showAgentPopup();
        } else if (changes.isExecuting.newValue === false) {
          removeAgentPopup();
        }
      }
    }
  });

  // Check initial state
  chrome.storage.local.get(['isExecuting'], (result) => {
    if (result.isExecuting === true) {
      showAgentPopup();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    
    switch (msg.type) {
      case '__agent_history_back':
        console.log('🔍 __agent_history_back');
        const ok = tryHistoryBack();
        sendResponse({ ok });
        return true; // keep channel open if needed
        
      case '__agent_show_popup':
        console.log('🤖 Showing agent popup via message');
        showAgentPopup();
        sendResponse({ success: true });
        return true;
        
      case '__agent_hide_popup':
        console.log('🤖 Hiding agent popup via message');
        removeAgentPopup();
        sendResponse({ success: true });
        return true;
        
      default:
        return false;
    }
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    removeAgentPopup();
  });
})();


