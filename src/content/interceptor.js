// SafeShield Interception Service
// Intercepts prompt submissions on ChatGPT in capture phase, redacts sensitive data,
// shows confirmation preview, and enforces FAIL-CLOSED guarantees.
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  let isBypassing = false;
  let isEnabled = true;
  let attachedComposer = null;
  let unsubscribeStorage = null;
  const checkedPasteEvents =
    typeof WeakSet !== 'undefined' ? new WeakSet() : null;

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

  async function checkPaste(e) {
    if (!isEnabled || isBypassing) return;
    if (
      e &&
      checkedPasteEvents &&
      typeof e === 'object' &&
      checkedPasteEvents.has(e)
    ) {
      return;
    }
    if (e && checkedPasteEvents && typeof e === 'object') {
      checkedPasteEvents.add(e);
    }

    try {
      const clipboardText = getPastedText(e);
      if (!clipboardText || !SafeShield.redactor) return;

      const result = SafeShield.redactor.redact(clipboardText);
      const matches = result.entities || [];
      if (matches.length > 0) {
        // Regex detection is deterministic and must warn even when AI is enabled.
        warnSensitiveTypes(matches);
        if (matches.some((entity) => entity.type !== 'ADDRESS')) return;
      }

      const storage = SafeShield.storage;
      const aiEnabled =
        storage && typeof storage.getAiAssist === 'function'
          ? await storage.getAiAssist()
          : false;
      const words = clipboardText.trim().split(/\s+/).filter(Boolean);
      if (!aiEnabled || words.length < 3) return;

      const aiRes = await classifyWithGemma(result.redactedText);
      const spans =
        aiRes && aiRes.ok && Array.isArray(aiRes.spans) ? aiRes.spans : [];
      if (spans.length > 0) {
        warnSensitiveTypes(spans);
      }
    } catch (pasteErr) {
      console.error('SafeShield paste check error:', pasteErr);
    }
  }

  function checkComposerAfterPaste(composerEl, e) {
    if (
      !e ||
      (e.inputType !== 'insertFromPaste' &&
        e.inputType !== 'insertFromPasteAsQuotation')
    ) {
      return;
    }
    if (!isEnabled || isBypassing || !SafeShield.redactor) return;

    try {
      const currentText = SafeShield.composer
        ? SafeShield.composer.getText(composerEl)
        : '';
      const result = SafeShield.redactor.redact(currentText);
      if (result.entities && result.entities.length > 0) {
        warnSensitiveTypes(result.entities);
      }
    } catch (inputErr) {
      console.error('SafeShield pasted-input check error:', inputErr);
    }
  }

  function classifyWithGemma(text) {
    return new Promise((resolve) => {
      if (
        typeof chrome === 'undefined' ||
        !chrome.runtime ||
        typeof chrome.runtime.sendMessage !== 'function'
      ) {
        resolve({ ok: false, error: 'unavailable' });
        return;
      }

      chrome.runtime.sendMessage(
        { type: 'SS_AI_CLASSIFY', text },
        (resp) => {
          try {
            if (chrome.runtime.lastError || !resp) {
              resolve({ ok: false, error: 'unavailable' });
            } else {
              resolve(resp);
            }
          } catch {
            resolve({ ok: false, error: 'unavailable' });
          }
        },
      );
    });
  }

  function interceptSubmission(e, composerEl, adapter) {
    if (isBypassing || !isEnabled) return;

    const composer = SafeShield.composer;
    try {
      const composerText = composer
        ? composer.getText(composerEl)
        : '';
      if (!composerText || !composerText.trim()) {
        return;
      }
    } catch {
      handleSubmission(e, composerEl, adapter);
      return;
    }

    // This must happen before calling the async handler. Otherwise ChatGPT's
    // default action can submit the original prompt while Gemma is awaited.
    e.preventDefault();
    e.stopImmediatePropagation();
    handleSubmission(e, composerEl, adapter);
  }

  function submitRedacted(composer, adapter) {
    if (composer && typeof composer.submit === 'function') {
      if (composer.submit(adapter)) return true;
    }

    const button =
      adapter && typeof adapter.findSendButton === 'function'
        ? adapter.findSendButton()
        : null;
    if (
      button &&
      !button.disabled &&
      button.getAttribute('aria-disabled') !== 'true' &&
      typeof button.click === 'function'
    ) {
      button.click();
      return true;
    }
    return false;
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

    let { redactedText } = redactResult;
    const entities = [...(redactResult.entities || [])];
    const counts = { ...(redactResult.counts || {}) };
    let aiNote = null;

    // Optional Local Gemma Assist (only if explicitly enabled by user)
    try {
      const isAiEnabled =
        storage && typeof storage.getAiAssist === 'function'
          ? await storage.getAiAssist()
          : false;

      const words = redactedText.trim().split(/\s+/).filter(Boolean);
      // Structured PII already has a deterministic redaction path. Keep AI
      // off that path so enabling it cannot delay or alter reliable matches.
      const hasStructuredPII = entities.some(
        (entity) => entity.type !== 'ADDRESS',
      );

      if (
        isAiEnabled &&
        words.length >= 3 &&
        !hasStructuredPII &&
        typeof chrome !== 'undefined' &&
        chrome.runtime
      ) {
        const aiRes = await classifyWithGemma(redactedText);

        if (
          aiRes &&
          aiRes.ok &&
          Array.isArray(aiRes.spans) &&
          aiRes.spans.length > 0
        ) {
          const aiAddresses = aiRes.spans.filter(
            (span) => span.type === 'ADDRESS',
          );
          if (aiAddresses.length > 0) {
            for (let i = entities.length - 1; i >= 0; i--) {
              if (entities[i].type === 'ADDRESS') entities.splice(i, 1);
            }
            counts.ADDRESS = 0;
            redactedText = redactResult.redactedText;
          }

          let nameIndex = 0;
          let addrIndex = 0;
          for (const span of aiRes.spans) {
            if (redactedText.includes(span.text)) {
              let placeholder;
              if (span.type === 'NAME') {
                nameIndex++;
                placeholder = SafeShield.constants
                  ? SafeShield.constants.makePlaceholder('NAME', nameIndex)
                  : `[NAME_${nameIndex}]`;
                counts.NAME = (counts.NAME || 0) + 1;
              } else {
                addrIndex++;
                placeholder = SafeShield.constants
                  ? SafeShield.constants.makePlaceholder('ADDRESS', addrIndex)
                  : `[ADDRESS_${addrIndex}]`;
                counts.ADDRESS = (counts.ADDRESS || 0) + 1;
              }
              redactedText = redactedText.split(span.text).join(placeholder);
              entities.push({
                placeholder,
                type: span.type,
                original: span.text,
              });
            }
          }
        } else if (aiRes && !aiRes.ok) {
          aiNote = 'AI check unavailable: only pattern detection ran';
        }
      }
    } catch {
      // AI failure NEVER blocks the send and NEVER changes regex result
      aiNote = 'AI check unavailable: only pattern detection ran';
    }

    // If neither regex nor AI found entities, allow submission to proceed untouched
    if (!entities || entities.length === 0) {
      if (e.defaultPrevented) {
        isBypassing = true;
        try {
          if (composer && typeof composer.submit === 'function') {
            composer.submit(adapter);
          }
        } finally {
          setTimeout(() => {
            isBypassing = false;
          }, 60);
        }
      }
      return;
    }

    // Sensitive data detected: BLOCK the original event immediately
    e.preventDefault();
    e.stopImmediatePropagation();

    try {
      // Write redacted text into the composer
      const setTextOk = composer
        ? composer.setText(composerEl, redactedText)
        : false;
      const currentText = composer ? composer.getText(composerEl) : '';
      if (!setTextOk || currentText !== redactedText) {
        if (modal && typeof modal.warn === 'function') {
          modal.warn('Send blocked: could not apply redaction');
        }
        return;
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
        note: aiNote,
      });

      const action = modalResult ? modalResult.action : 'cancel';

      if (action === 'send') {
        // Final safety check immediately before ANY call to composer.submit:
        // re-read the composer text, run detect() on it, and if any PII is still found (or detect throws),
        // block the send and call modal.warn.
        let finalText = '';
        let detected = [];
        try {
          finalText = composer ? composer.getText(composerEl) : '';
          const detector = SafeShield.detector;
          if (!detector || typeof detector.detect !== 'function') {
            throw new Error('SafeShield detector is not loaded');
          }
          detected = detector.detect(finalText);
        } catch {
          if (modal && typeof modal.warn === 'function') {
            modal.warn('Send blocked: could not verify composer text safety');
          }
          return;
        }

        if (detected && detected.length > 0) {
          if (modal && typeof modal.warn === 'function') {
            modal.warn('Send blocked: sensitive data detected in composer');
          }
          return;
        }

        // Save entities to ephemeral memory vault and persist anonymized counts
        if (vault) vault.remember(entities);
        if (storage) await storage.addCounts(counts);

        // Submit redacted prompt
        isBypassing = true;
        try {
          const submitted = submitRedacted(composer, adapter);
          if (!submitted && typeof KeyboardEvent !== 'undefined') {
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
          if (!submitted && modal && typeof modal.warn === 'function') {
            modal.warn('Send blocked: ChatGPT send button is unavailable.');
          }
        } finally {
          setTimeout(() => {
            isBypassing = false;
          }, 60);
        }
      } else if (action === 'restore') {
        // User requested local edit: restore original text into composer
        if (composer && typeof composer.setText === 'function') {
          composer.setText(composerEl, originalPrompt);
        }
      } else {
        // Canceled: restore original text so user does not lose draft
        if (composer && typeof composer.setText === 'function') {
          composer.setText(composerEl, originalPrompt);
        }
      }
    } catch (err) {
      // FAIL CLOSED
      console.error('SafeShield error during review/send:', err);
      if (modal && typeof modal.warn === 'function') {
        modal.warn('Send blocked: an unexpected error occurred.');
      }
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
        if (
          e.key === 'Enter' &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          !e.isComposing
        ) {
          interceptSubmission(e, composerEl, adapter);
        }
      },
      true, // Capture phase
    );

    // Capture-phase paste listener with proactive warning banner.
    composerEl.addEventListener('paste', (e) => checkPaste(e), true);
    composerEl.addEventListener(
      'input',
      (e) => checkComposerAfterPaste(composerEl, e),
      true,
    );

    // ChatGPT may dispatch paste from a nested editor and stop propagation
    // before a composer-level listener receives it. Capture once at document.
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener(
        'paste',
        (e) => {
          const target = e && e.target;
          const isInComposer =
            target === composerEl ||
            (composerEl &&
              typeof composerEl.contains === 'function' &&
              composerEl.contains(target));
          if (isInComposer) checkPaste(e);
        },
        true,
      );
      document.addEventListener(
        'input',
        (e) => {
          const target = e && e.target;
          const isInComposer =
            target === composerEl ||
            (composerEl &&
              typeof composerEl.contains === 'function' &&
              composerEl.contains(target));
          if (isInComposer) checkComposerAfterPaste(composerEl, e);
        },
        true,
      );
    }

    // Capture-phase click listener on document for any send button clicks
    document.addEventListener(
      'click',
      (e) => {
        const sendBtn = adapter ? adapter.findSendButton() : null;
        if (sendBtn && (e.target === sendBtn || sendBtn.contains(e.target))) {
          interceptSubmission(e, composerEl, adapter);
        }
      },
      true, // Capture phase
    );
  }

  function getPastedText(event) {
    const clipboardData = event && event.clipboardData;
    if (!clipboardData || typeof clipboardData.getData !== 'function') {
      return '';
    }
    return (
      clipboardData.getData('text/plain') ||
      clipboardData.getData('text') ||
      ''
    );
  }

  function warnSensitiveTypes(entities) {
    if (!SafeShield.modal || typeof SafeShield.modal.warn !== 'function') {
      return;
    }
    const types = [...new Set(entities.map((entity) => entity.type))];
    if (types.length > 0) {
      SafeShield.modal.warn(
        `Sensitive data (${types.join(', ')}) detected in paste. SafeShield will redact before sending.`,
      );
    }
  }

  const interceptor = {
    attachHooks,
    handleSubmission,
    getIsEnabled: () => isEnabled,
    setIsEnabled: (v) => {
      isEnabled = Boolean(v);
    },
    getIsAttached: () =>
      Boolean(attachedComposer && attachedComposer.isConnected),
  };

  SafeShield.interceptor = interceptor;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.interceptor;
  }
})();
