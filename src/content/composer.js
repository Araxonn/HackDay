// SafeShield Composer DOM Interface
// Reads from and writes to ChatGPT textarea and contenteditable ProseMirror composers
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  function getText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
      // innerText preserves natural linebreaks in ProseMirror paragraphs
      return el.innerText !== undefined ? el.innerText : el.textContent || '';
    }
    return el.value || el.textContent || '';
  }

  function setText(el, text) {
    if (!el) return false;
    text = text || '';

    try {
      if (typeof el.focus === 'function') {
        el.focus();
      }

      let inserted = false;

      // Primary strategy: document.execCommand('insertText') so ProseMirror / React state updates
      if (
        typeof document !== 'undefined' &&
        typeof document.execCommand === 'function'
      ) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          if (typeof el.select === 'function') {
            el.select();
          } else if (typeof el.setSelectionRange === 'function') {
            el.setSelectionRange(0, el.value.length);
          }
          try {
            inserted = document.execCommand('insertText', false, text);
          } catch {
            inserted = false;
          }
        } else {
          // For contenteditable ProseMirror: select all contents of el then insertText
          if (
            typeof window !== 'undefined' &&
            window.getSelection &&
            document.createRange
          ) {
            try {
              const range = document.createRange();
              range.selectNodeContents(el);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              inserted = document.execCommand('insertText', false, text);
            } catch {
              inserted = false;
            }
          }
        }
      }

      // Fallback strategy if execCommand didn't work or value did not update
      const current = getText(el);
      if (!inserted || current.trim() !== text.trim()) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          try {
            const proto =
              el.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) {
              desc.set.call(el, text);
            } else {
              el.value = text;
            }
          } catch {
            el.value = text;
          }
        } else {
          el.textContent = text;
        }

        if (typeof Event !== 'undefined') {
          if (typeof InputEvent !== 'undefined') {
            try {
              el.dispatchEvent(
                new InputEvent('beforeinput', {
                  bubbles: true,
                  cancelable: true,
                  inputType: 'insertText',
                  data: text,
                }),
              );
            } catch {
              // ignore
            }
            try {
              el.dispatchEvent(
                new InputEvent('input', {
                  bubbles: true,
                  cancelable: true,
                  inputType: 'insertText',
                  data: text,
                }),
              );
            } catch {
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } else {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Verify that value actually updated
      const updatedText = getText(el);
      return updatedText.trim() === text.trim() || updatedText.length > 0;
    } catch (e) {
      console.error('SafeShield: failed to set composer text:', e);
      return false;
    }
  }

  function submit(adapter, composerEl) {
    if (!adapter && !composerEl) {
      return false;
    }

    const comp =
      composerEl ||
      (adapter && typeof adapter.findComposer === 'function'
        ? adapter.findComposer(
            typeof document !== 'undefined' ? document : null,
          )
        : null);

    if (comp) {
      const text = getText(comp);
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function' &&
        text
      ) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      if (typeof comp.focus === 'function') {
        comp.focus();
      }
      return true;
    }

    return true;
  }

  const composer = {
    getText,
    setText,
    submit,
  };

  SafeShield.composer = composer;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.composer;
  }
})();
