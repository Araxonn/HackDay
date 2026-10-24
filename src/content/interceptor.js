// SafeShield Interception Service
// Intercepts prompt submissions on ChatGPT in capture phase, redacts sensitive data,
// shows confirmation preview, and enforces FAIL-CLOSED guarantees.
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  let isBypassing = false;
  let isEnabled = true;
  let attachedComposer = null;
  let unsubscribeStorage = null;

  function initStorage() {
    const storage = SafeShield.storage;
    if (storage) {
      storage.getEnabled().then((val) => {
        isEnabled = val;
      });
      if (!unsubscribeStorage) {
        unsubscribeStorage = storage.onChange((change) => {
          if (change.key === 'enabled') {
            isEnabled = Boolean(change.newValue);
          }
        });
      }
    }
  }

  async function handleSubmission(e, composerEl, adapter) {
    if (isBypassing) {
      return;
    }

    if (!isEnabled) {
      // Protection disabled by user, pass through
      return;
    }

    const composer = SafeShield.composer;
    const redactor = SafeShield.redactor;
    const modal = SafeShield.modal;
    const vault = SafeShield.vault;
    const storage = SafeShield.storage;

    let originalPrompt;
    try {
      originalPrompt = composer ? composer.getText(composerEl) : '';
    } catch (readErr) {
      // FAIL CLOSED
      e.preventDefault();
      e.stopImmediatePropagation();
      console.error('SafeShield: failed to read composer:', readErr);
      if (modal) modal.warn('Send blocked: could not inspect composer safely.');
      return;
    }

    if (!originalPrompt || originalPrompt.trim().length === 0) {
      return;
    }

    let redactResult;
    try {
      if (!redactor || typeof redactor.redact !== 'function') {
        throw new Error('SafeShield redactor is not loaded');
      }
      redactResult = redactor.redact(originalPrompt);
    } catch (detectErr) {
      // FAIL CLOSED
      e.preventDefault();
      e.stopImmediatePropagation();
      console.error('SafeShield detection/redaction error:', detectErr);
      if (modal) modal.warn('Send blocked: protection could not run safely.');
      return;
    }

    const { redactedText, entities, counts } = redactResult;

    // If no sensitive data found, allow submission to proceed untouched
    if (!entities || entities.length === 0) {
      return;
    }

    // Sensitive data detected: BLOCK the original event immediately
    e.preventDefault();
    e.stopImmediatePropagation();

    try {
      // Write redacted text into the composer
      const setTextOk = composer.setText(composerEl, redactedText);
      if (!setTextOk) {
        console.warn('SafeShield: setText returned false, falling back to safe modal review');
      }

      // Show preview modal in Shadow DOM
      if (!modal || typeof modal.show !== 'function') {
        throw new Error('SafeShield preview modal is not loaded');
      }

      const modalResult = await modal.show({
        originalText: originalPrompt,
        redactedText,
        entities,
        counts,
      });

      const action = modalResult ? modalResult.action : 'cancel';

      if (action === 'send') {
        // Save entities to ephemeral memory vault and persist anonymized counts
        if (vault) vault.remember(entities);
        if (storage) await storage.addCounts(counts);

        // Submit redacted prompt
        isBypassing = true;
        try {
          const submitted = composer.submit(adapter);
          if (!submitted) {
            // Fallback dispatching Enter key on composer
            const enterEvt = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            });
            composerEl.dispatchEvent(enterEvt);
          }
        } finally {
          setTimeout(() => {
            isBypassing = false;
          }, 60);
        }
      } else if (action === 'restore') {
        // User requested local edit: restore original text into composer
        composer.setText(composerEl, originalPrompt);
      } else {
        // Canceled: restore original text so user does not lose draft
        composer.setText(composerEl, originalPrompt);
      }
    } catch (err) {
      // FAIL CLOSED
      console.error('SafeShield error during review/send:', err);
      if (modal) modal.warn('Send blocked: an unexpected error occurred.');
    }
  }

  function attachHooks(composerEl, adapter) {
    if (!composerEl || composerEl === attachedComposer) {
      return;
    }

    initStorage();
    attachedComposer = composerEl;

    // Capture-phase keydown on composer (Enter without Shift)
    composerEl.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
          handleSubmission(e, composerEl, adapter);
        }
      },
      true // Capture phase
    );

    // Capture-phase click listener on document for any send button clicks
    document.addEventListener(
      'click',
      (e) => {
        const sendBtn = adapter ? adapter.findSendButton() : null;
        if (sendBtn && (e.target === sendBtn || sendBtn.contains(e.target))) {
          handleSubmission(e, composerEl, adapter);
        }
      },
      true // Capture phase
    );
  }

  const interceptor = {
    attachHooks,
    handleSubmission,
    getIsEnabled: () => isEnabled,
    setIsEnabled: (v) => { isEnabled = Boolean(v); },
    getIsAttached: () => Boolean(attachedComposer && attachedComposer.isConnected),
  };

  SafeShield.interceptor = interceptor;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.interceptor;
  }
})();
