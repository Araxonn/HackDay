// SafeShield Background Service Worker (Manifest V3)
// Maintains the extension action badge count and provides a loopback proxy for local Ollama

try {
  importScripts(
    '../shared/constants.js',
    '../shared/storage.js',
    '../ai/gemma.js',
  );
} catch (e) {
  console.error('Service worker importScripts error:', e);
}

function updateBadge(stats) {
  if (
    typeof chrome === 'undefined' ||
    !chrome.action ||
    !chrome.action.setBadgeText
  ) {
    return;
  }
  stats = stats || {};
  const total = Object.values(stats).reduce(
    (acc, c) => acc + (typeof c === 'number' ? c : 0),
    0,
  );
  const badgeText = total > 0 ? (total > 999 ? '999+' : String(total)) : '';

  chrome.action.setBadgeText({ text: badgeText });
  if (chrome.action.setBadgeBackgroundColor) {
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  }
}

// Initialize badge count on service worker startup and installation
if (typeof chrome !== 'undefined' && chrome.runtime) {
  if (chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.storage.local.get(['stats'], (res) => {
        updateBadge(res && res.stats);
      });
    });
  }

  if (chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(() => {
      chrome.storage.local.get(['stats'], (res) => {
        updateBadge(res && res.stats);
      });
    });
  }
}

// React to live storage updates
if (
  typeof chrome !== 'undefined' &&
  chrome.storage &&
  chrome.storage.onChanged
) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.stats) {
      updateBadge(changes.stats.newValue);
    }
  });
}

// SS_AI_CLASSIFY message bridge for local loopback Ollama
if (
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'SS_AI_CLASSIFY') {
      return false;
    }

    // Verify sender is strictly our own extension
    if (sender && sender.id && sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'forbidden' });
      return false;
    }

    // Never log message text
    const storage = SafeShield.storage;
    const gemma = SafeShield.gemma;

    if (!storage || !gemma) {
      sendResponse({ ok: false, error: 'unavailable' });
      return false;
    }

    // Re-verify that user has explicitly enabled AI Assist
    storage.getAiAssist().then((enabled) => {
      if (!enabled) {
        sendResponse({ ok: false, error: 'disabled' });
        return;
      }

      gemma
        .classify(message.text, message.options)
        .then((result) => {
          sendResponse(result);
        })
        .catch(() => {
          sendResponse({ ok: false, error: 'unavailable' });
        });
    });

    return true; // Keep message channel open for async response
  });
}
