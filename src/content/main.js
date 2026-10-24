// SafeShield Content Script Entrypoint
// Monitors SPA navigation, manages observer lifecycle, and responds to status checks
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  let observer = null;

  function getAdapter() {
    return SafeShield.chatgptAdapter;
  }

  function getStatus() {
    const interceptor = SafeShield.interceptor;
    const isEnabled = interceptor ? interceptor.getIsEnabled() : true;
    if (!isEnabled) {
      return 'off';
    }

    const adapter = getAdapter();
    if (!adapter || !adapter.matches()) {
      return 'unsupported';
    }

    const composerEl = adapter.findComposer();
    const isAttached = interceptor && interceptor.getIsAttached();

    // HONEST STATUS: show 'active' ONLY when enabled AND composer found AND hooks attached
    if (composerEl && isAttached) {
      return 'active';
    }

    return 'unsupported';
  }

  function initObserver() {
    const adapter = getAdapter();
    if (!adapter || !adapter.matches()) {
      return;
    }

    function checkAndAttach() {
      const composerEl = adapter.findComposer();
      if (composerEl && SafeShield.interceptor) {
        SafeShield.interceptor.attachHooks(composerEl, adapter);
      }
    }

    checkAndAttach();

    if (typeof MutationObserver !== 'undefined' && document.body) {
      if (observer) {
        observer.disconnect();
      }
      observer = new MutationObserver(() => {
        checkAndAttach();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  async function getStatusResponse() {
    const state = getStatus();
    let ai = false;
    if (
      SafeShield.storage &&
      typeof SafeShield.storage.getAiAssist === 'function'
    ) {
      try {
        ai = await SafeShield.storage.getAiAssist();
      } catch {
        ai = false;
      }
    }
    return { state, ai };
  }

  // Answer status requests from popup
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime.onMessage
  ) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === 'SS_GET_STATUS') {
        getStatusResponse().then((res) => {
          sendResponse(res);
        });
        return true; // Asynchronous reply
      }
      return false;
    });
  }

  // Bootstrap when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initObserver);
    } else {
      initObserver();
    }
  }

  const main = {
    getStatus,
    initObserver,
  };

  SafeShield.main = main;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.main;
  }
})();
