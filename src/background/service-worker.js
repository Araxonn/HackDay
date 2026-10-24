// SafeShield Background Service Worker (Manifest V3)
// Maintains the extension action badge count reflecting total protected items

function updateBadge(stats) {
  if (typeof chrome === 'undefined' || !chrome.action || !chrome.action.setBadgeText) {
    return;
  }
  stats = stats || {};
  const total = Object.values(stats).reduce(
    (acc, c) => acc + (typeof c === 'number' ? c : 0),
    0
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
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.stats) {
      updateBadge(changes.stats.newValue);
    }
  });
}
