// SafeShield ChatGPT Site Adapter
// Holds all selectors and DOM locator logic for ChatGPT (chatgpt.com & chat.openai.com)
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const COMPOSER_SELECTORS = [
    '#prompt-textarea',
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][tabindex="0"]',
    'div[contenteditable="true"]',
    'textarea[data-id="root"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Ask"]',
    'form textarea',
  ];

  const SEND_BUTTON_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[data-testid="fruitjuice-send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
    'button[aria-label="Send"]',
    'form button[type="submit"]',
    'fieldset button[type="submit"]',
  ];

  function matches(url) {
    const loc = url || (typeof window !== 'undefined' ? window.location.href : '');
    return /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:chatgpt\.com|openai\.com)(?::\d+)?(?:\/|$)/i.test(loc);
  }

  function findComposer(doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return null;
    for (const selector of COMPOSER_SELECTORS) {
      try {
        const el = d.querySelector(selector);
        if (el && el.isConnected) {
          return el;
        }
      } catch {
        // Continue to next selector fallback
      }
    }
    return null;
  }

  function findSendButton(doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return null;
    for (const selector of SEND_BUTTON_SELECTORS) {
      try {
        const el = d.querySelector(selector);
        if (el && el.isConnected) {
          return el;
        }
      } catch {
        // Continue to next selector fallback
      }
    }
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
