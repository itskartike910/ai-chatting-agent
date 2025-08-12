/* global chrome */
(function () {
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

  async function captureScreenshot(quality) {
    console.log('🔍 Capturing screenshot with quality:', quality);
    try {
      if (window.html2canvas) {
        console.log('🔍 html2canvas found');
        const canvas = await window.html2canvas(document.body, { useCORS: true, logging: false, scale: 1 });
        console.log('🔍 html2canvas success');
        return { ok: true, imageData: canvas.toDataURL('image/jpeg', Math.max(0.1, Math.min(0.95, Number(quality || 0.6)))) };
      } else {
        console.log('📷 html2canvas not available, providing page summary');
        return { 
          ok: true, 
          pageHtml: `<!-- Page summary: ${document.title} at ${window.location.href} -->`,
          fallback: true 
        };
      }
    } catch (e) {
      console.log('⚠️ html2canvas failed:', e);
      return { ok: false, error: e.message };
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === '__agent_history_back') {
      console.log('🔍 __agent_history_back');
      const ok = tryHistoryBack();
      sendResponse({ ok });
      return true; // keep channel open if needed
    }
    if (msg.type === '__agent_capture_screenshot') {
      console.log('🔍 __agent_capture_screenshot');
      captureScreenshot(msg.quality).then(sendResponse);
      return true; // async
    }
  });
})();


