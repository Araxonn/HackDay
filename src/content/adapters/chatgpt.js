// SafeShield ChatGPT Site Adapter
// Holds all selectors and DOM locator logic for ChatGPT (chatgpt.com & chat.openai.com)
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const COMPOSER_SELECTORS = [
    '#prompt-textarea',
    'div.ProseMirror[contenteditable="true"]',
    '[contenteditable="true"][role="textbox"]',
    'form [contenteditable="true"]',
    'form textarea',
  ];

  const SEND_BUTTON_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send" i]',
    'form button[type="submit"]',
  ];

  function matches(url) {
    const loc =
      url || (typeof window !== 'undefined' ? window.location.href : '');
    return /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:chatgpt\.com|openai\.com)(?::\d+)?(?:\/|$)/i.test(
      loc,
    );
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.isConnected === false) return false;
    if (el.hidden) return false;
    if (typeof el.getAttribute === 'function') {
      if (el.getAttribute('aria-hidden') === 'true') return false;
    }
    if (el.style) {
      if (el.style.display === 'none' || el.style.visibility === 'hidden') {
        return false;
      }
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.getComputedStyle === 'function'
    ) {
      try {
        const style = window.getComputedStyle(el);
        if (
          style &&
          (style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0')
        ) {
          return false;
        }
      } catch {
        // Continue if getComputedStyle fails in mock/unsupported environments
      }
    }
    return true;
  }

  function isEditable(el) {
    if (!el) return false;
    if (
      el.disabled ||
      (typeof el.getAttribute === 'function' &&
        el.getAttribute('aria-disabled') === 'true')
    ) {
      return false;
    }
    if (
      el.readOnly ||
      (typeof el.getAttribute === 'function' &&
        el.getAttribute('readonly') !== null)
    ) {
      return false;
    }
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'INPUT') {
      return true;
    }
    if (el.isContentEditable === true) {
      return true;
    }
    if (typeof el.getAttribute === 'function') {
      const ce = el.getAttribute('contenteditable');
      if (ce === 'true' || ce === '' || ce === 'plaintext-only') {
        return true;
      }
    }
    return false;
  }

  function isVoiceOrDictationButton(el) {
    if (!el) return false;
    const testId =
      (typeof el.getAttribute === 'function' &&
        el.getAttribute('data-testid')) ||
      '';
    const ariaLabel =
      (typeof el.getAttribute === 'function' &&
        el.getAttribute('aria-label')) ||
      '';
    const title =
      (typeof el.getAttribute === 'function' && el.getAttribute('title')) || '';
    const className =
      typeof el.className === 'string'
        ? el.className
        : (typeof el.getAttribute === 'function' && el.getAttribute('class')) ||
          '';
    const text = (el.textContent || '').trim();

    const voicePattern =
      /voice|dictat|speech|mic|audio|record|listen|fruitjuice/i;

    if (voicePattern.test(testId)) return true;
    if (voicePattern.test(ariaLabel)) return true;
    if (voicePattern.test(title)) return true;
    if (voicePattern.test(className)) return true;
    if (voicePattern.test(text)) return true;

    return false;
  }

  function queryAll(root, selector) {
    if (!root) return [];
    if (typeof root.querySelectorAll === 'function') {
      try {
        return Array.from(root.querySelectorAll(selector));
      } catch {
        return [];
      }
    }
    if (typeof root.querySelector === 'function') {
      try {
        const el = root.querySelector(selector);
        return el ? [el] : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function querySelectors(root, selectors) {
    const result = [];
    const seen = new Set();
    for (const selector of selectors) {
      for (const element of queryAll(root, selector)) {
        if (!seen.has(element)) {
          seen.add(element);
          result.push(element);
        }
      }
    }
    return result;
  }

  function findComposer(doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return null;

    for (const selector of COMPOSER_SELECTORS) {
      const elements = queryAll(d, selector);
      for (const el of elements) {
        if (isVisible(el) && isEditable(el)) {
          return el;
        }
      }
    }
    return null;
  }

  function findSendButton(doc, composerEl) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return null;

    function isCandidateValid(btn) {
      if (!btn || !isVisible(btn)) return false;
      if (isVoiceOrDictationButton(btn)) return false;
      const testId =
        (typeof btn.getAttribute === 'function' &&
          btn.getAttribute('data-testid')) ||
        '';
      const ariaLabel =
        (typeof btn.getAttribute === 'function' &&
          btn.getAttribute('aria-label')) ||
        '';
      const text = (btn.textContent || '').trim();
      if (/\bthink(?:ing)?\b/i.test(testId + ' ' + ariaLabel + ' ' + text)) {
        return false;
      }
      return true;
    }

    const composer = composerEl || findComposer(d);
    const form = composer
      ? composer.form ||
        (typeof composer.closest === 'function'
          ? composer.closest('form')
          : null)
      : null;

    // Prefer controls belonging to the active composer. This prevents an
    // unrelated page-level "Send" control from receiving the redacted click.
    if (form) {
      const scopedButtons = querySelectors(form, [
        'button[data-testid="send-button"]',
        'button[aria-label*="Send" i]',
        'button[type="submit"]',
        'input[type="submit"]',
        'button:not([type])',
      ]);
      for (const btn of scopedButtons) {
        if (isCandidateValid(btn)) {
          return btn;
        }
      }
    }

    // ChatGPT may render the composer controls without a form. Walk up from
    // the active composer and only inspect controls in its own DOM region.
    if (composer) {
      let region = composer.parentElement || composer.parentNode || null;
      for (let depth = 0; region && depth < 6; depth += 1) {
        const scopedButtons = querySelectors(region, [
          'button[data-testid="send-button"]',
          'button[aria-label*="Send" i]',
          'button[type="submit"]',
          'button:not([type])',
        ]);
        for (const btn of scopedButtons) {
          if (isCandidateValid(btn)) {
            return btn;
          }
        }
        region = region.parentElement || region.parentNode || null;
      }
    }

    // Never click an unrelated page-level "Send" control.
    return null;
  }

  const chatgptAdapter = {
    name: 'ChatGPT',
    matches,
    findComposer,
    findSendButton,
    COMPOSER_SELECTORS,
    SEND_BUTTON_SELECTORS,
  };

  SafeShield.chatgptAdapter = chatgptAdapter;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.chatgptAdapter;
  }
})();
