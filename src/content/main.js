// SafeShield Content Script Entrypoint
// Monitors SPA navigation, manages observer lifecycle, and responds to status checks
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  let observer = null;
  let lastLoggedReason = null;
  const attachedElements =
    typeof WeakSet !== 'undefined' ? new WeakSet() : new Set();

  function getAdapter() {
    return SafeShield.chatgptAdapter;
  }

  function logStatusDiagnostic(reason) {
    if (reason && reason !== lastLoggedReason) {
      lastLoggedReason = reason;
      if (
        typeof console !== 'undefined' &&
        typeof console.debug === 'function'
      ) {
        console.debug(`SafeShield status: reason=${reason}`);
      }
    }
  }

  function getStatusWithReason() {
    const interceptor = SafeShield.interceptor;
    const isEnabled = interceptor ? interceptor.getIsEnabled() : true;
    if (!isEnabled) {
      logStatusDiagnostic('disabled');
      return { state: 'off', reason: 'disabled' };
    }

    const adapter = getAdapter();
    if (!adapter || !adapter.matches()) {
      logStatusDiagnostic('composer-not-found');
      return { state: 'unsupported', reason: 'composer-not-found' };
    }

    const composerEl = adapter.findComposer();
    if (!composerEl) {
      logStatusDiagnostic('composer-not-found');
      return { state: 'unsupported', reason: 'composer-not-found' };
    }

    if (interceptor && !interceptor.getIsAttached()) {
      interceptor.attachHooks(composerEl, adapter);
    }

    const isAttached = interceptor && interceptor.getIsAttached();
    if (!isAttached) {
      logStatusDiagnostic('hooks-not-attached');
      return { state: 'unsupported', reason: 'hooks-not-attached' };
    }

    logStatusDiagnostic('active');
    return { state: 'active', reason: 'active' };
  }

  function getStatus() {
    return getStatusWithReason().state;
  }

  function checkAndAttach() {
    const adapter = getAdapter();
    if (!adapter || !adapter.matches()) {
      getStatusWithReason();
      return;
    }

    const composerEl = adapter.findComposer();
    if (composerEl && SafeShield.interceptor) {
      if (!attachedElements.has(composerEl)) {
        attachedElements.add(composerEl);
        SafeShield.interceptor.attachHooks(composerEl, adapter);
      }
    }
    getStatusWithReason();
  }

  function initObserver() {
    const adapter = getAdapter();
    if (!adapter || !adapter.matches()) {
      return;
    }

    checkAndAttach();

    if (
      typeof MutationObserver !== 'undefined' &&
      typeof document !== 'undefined'
    ) {
      const target = document.body || document.documentElement || document;
      if (target) {
        if (observer) {
          observer.disconnect();
        }
        observer = new MutationObserver(() => {
          checkAndAttach();
        });
        observer.observe(target, {
          childList: true,
          subtree: true,
        });
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', checkAndAttach);
      if (window.history && typeof window.history.pushState === 'function') {
        const origPushState = window.history.pushState;
        window.history.pushState = function (...args) {
          const res = origPushState.apply(this, args);
          checkAndAttach();
          return res;
        };
      }
      if (window.history && typeof window.history.replaceState === 'function') {
        const origReplaceState = window.history.replaceState;
        window.history.replaceState = function (...args) {
          const res = origReplaceState.apply(this, args);
          checkAndAttach();
          return res;
        };
      }
    }
  }

  // Ensure fail-closed if Enter intercepted but no way to submit
  if (SafeShield.composer && typeof SafeShield.composer.submit === 'function') {
    const origSubmit = SafeShield.composer.submit;
    SafeShield.composer.submit = function (ad) {
      const btn =
        ad && typeof ad.findSendButton === 'function'
          ? ad.findSendButton()
          : null;
      if (
        !btn ||
        btn.disabled ||
        (typeof btn.getAttribute === 'function' &&
          btn.getAttribute('aria-disabled') === 'true')
      ) {
        if (SafeShield.modal && typeof SafeShield.modal.warn === 'function') {
          SafeShield.modal.warn(
            'Send blocked: could not find a way to submit.',
          );
        }
        return false;
      }
      return origSubmit.call(this, ad);
    };
  }

  async function getStatusResponse() {
    const { state, reason } = getStatusWithReason();
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
    return { state, reason, ai };
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
    getStatusWithReason,
    initObserver,
  };

  SafeShield.main = main;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.main;
  }
})();
