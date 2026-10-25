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
    SafeShield.composer.submit = function (ad, composerEl) {
      const btn =
        ad && typeof ad.findSendButton === 'function'
          ? ad.findSendButton(
              typeof document !== 'undefined' ? document : null,
              composerEl,
            )
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
      return origSubmit.call(this, ad, composerEl);
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

  // Answer status requests and manual-send requests from popup
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

      if (message && message.type === 'SS_SEND_REDACTED') {
        // Guard: must be enabled and active
        const interceptor = SafeShield.interceptor;
        if (!interceptor || !interceptor.getIsEnabled()) {
          sendResponse({ ok: false, reason: 'disabled' });
          return false;
        }

        const adapter = getAdapter();
        const composerEl = adapter ? adapter.findComposer() : null;
        if (!composerEl) {
          sendResponse({ ok: false, reason: 'no_composer' });
          return false;
        }

        // Read current composer text
        const composer = SafeShield.composer;
        const redactor = SafeShield.redactor;
        let text = '';
        try {
          text = composer ? composer.getText(composerEl) : '';
        } catch {
          sendResponse({ ok: false, message: 'Could not read composer text.' });
          return false;
        }

        if (!text || text.trim().length === 0) {
          sendResponse({ ok: false, reason: 'empty', message: 'Composer is empty.' });
          return false;
        }

        // Run redaction
        let redactResult;
        try {
          redactResult = redactor ? redactor.redact(text) : null;
        } catch (err) {
          sendResponse({ ok: false, message: 'Redaction error: ' + (err && err.message ? err.message : 'unknown') });
          return false;
        }

        if (!redactResult || !redactResult.entities || redactResult.entities.length === 0) {
          // No PII found — nothing to redact
          sendResponse({ ok: false, reason: 'no_pii' });
          return false;
        }

        // Write redacted text to composer and show modal (async, fire-and-forget; reply immediately)
        try {
          composer.setText(composerEl, redactResult.redactedText);
        } catch {
          sendResponse({ ok: false, message: 'Could not write redacted text to composer.' });
          return false;
        }

        // Show the preview modal asynchronously on the page
        const modal = SafeShield.modal;
        if (modal && typeof modal.show === 'function') {
          modal.show({
            redactedText: redactResult.redactedText,
            entities: redactResult.entities,
            counts: redactResult.counts,
          }).then((result) => {
            const action = result ? result.action : 'cancel';
            if (action === 'send' && SafeShield.composer && SafeShield.composer.submit) {
              SafeShield.composer.submit(adapter, composerEl);
            } else if (action === 'restore' && composer && typeof composer.setText === 'function') {
              composer.setText(composerEl, text);
            }
          }).catch(() => {});
        }

        sendResponse({ ok: true });
        return false;
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
