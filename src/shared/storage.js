// SafeShield Storage Service
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const STORAGE_KEYS = (SafeShield.constants && SafeShield.constants.STORAGE_KEYS) || {
    ENABLED: 'enabled',
    STATS: 'stats',
    AI_ASSIST: 'aiAssist',
  };

  const hasChromeStorage =
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local &&
    typeof chrome.storage.local.get === 'function';

  // In-memory fallback for Node environments and non-extension contexts
  const memoryStore = {
    [STORAGE_KEYS.ENABLED]: true,
    [STORAGE_KEYS.STATS]: {},
    [STORAGE_KEYS.AI_ASSIST]: false,
  };
  const memoryListeners = new Set();

  function notifyListeners(key, newValue, oldValue) {
    if (key !== STORAGE_KEYS.ENABLED && key !== STORAGE_KEYS.STATS && key !== STORAGE_KEYS.AI_ASSIST) {
      return;
    }
    for (const cb of memoryListeners) {
      try {
        cb({ key, newValue, oldValue });
      } catch (e) {
        console.error('SafeShield storage listener error:', e);
      }
    }
  }

  async function getEnabled() {
    if (hasChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.ENABLED], (res) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.error('Storage getEnabled error:', chrome.runtime.lastError);
            resolve(true);
            return;
          }
          resolve(res[STORAGE_KEYS.ENABLED] !== undefined ? Boolean(res[STORAGE_KEYS.ENABLED]) : true);
        });
      });
    }
    return Boolean(memoryStore[STORAGE_KEYS.ENABLED]);
  }

  async function setEnabled(bool) {
    const val = Boolean(bool);
    if (hasChromeStorage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: val }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      });
    }
    const prev = memoryStore[STORAGE_KEYS.ENABLED];
    memoryStore[STORAGE_KEYS.ENABLED] = val;
    if (prev !== val) {
      notifyListeners(STORAGE_KEYS.ENABLED, val, prev);
    }
  }

  async function getStats() {
    if (hasChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.STATS], (res) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.error('Storage getStats error:', chrome.runtime.lastError);
            resolve({});
            return;
          }
          resolve(res[STORAGE_KEYS.STATS] ? { ...res[STORAGE_KEYS.STATS] } : {});
        });
      });
    }
    return { ...memoryStore[STORAGE_KEYS.STATS] };
  }

  async function addCounts(counts) {
    if (!counts || typeof counts !== 'object') {
      return getStats();
    }
    const current = await getStats();
    const nextStats = { ...current };

    for (const [type, count] of Object.entries(counts)) {
      if (typeof count === 'number' && count > 0) {
        nextStats[type] = (nextStats[type] || 0) + count;
      }
    }

    if (hasChromeStorage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEYS.STATS]: nextStats }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(nextStats);
        });
      });
    }

    const prev = memoryStore[STORAGE_KEYS.STATS];
    memoryStore[STORAGE_KEYS.STATS] = nextStats;
    notifyListeners(STORAGE_KEYS.STATS, nextStats, prev);
    return { ...nextStats };
  }

  async function resetStats() {
    if (hasChromeStorage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEYS.STATS]: {} }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      });
    }
    const prev = memoryStore[STORAGE_KEYS.STATS];
    memoryStore[STORAGE_KEYS.STATS] = {};
    notifyListeners(STORAGE_KEYS.STATS, {}, prev);
  }

  async function getAiAssist() {
    if (hasChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.AI_ASSIST], (res) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(Boolean(res[STORAGE_KEYS.AI_ASSIST]));
        });
      });
    }
    return Boolean(memoryStore[STORAGE_KEYS.AI_ASSIST]);
  }

  async function setAiAssist(bool) {
    const val = Boolean(bool);
    if (hasChromeStorage) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEYS.AI_ASSIST]: val }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      });
    }
    const prev = memoryStore[STORAGE_KEYS.AI_ASSIST];
    memoryStore[STORAGE_KEYS.AI_ASSIST] = val;
    if (prev !== val) {
      notifyListeners(STORAGE_KEYS.AI_ASSIST, val, prev);
    }
  }

  function onChange(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    if (hasChromeStorage && chrome.storage.onChanged) {
      const listener = (changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes[STORAGE_KEYS.ENABLED]) {
          callback({
            key: STORAGE_KEYS.ENABLED,
            newValue: changes[STORAGE_KEYS.ENABLED].newValue,
            oldValue: changes[STORAGE_KEYS.ENABLED].oldValue,
          });
        }
        if (changes[STORAGE_KEYS.STATS]) {
          callback({
            key: STORAGE_KEYS.STATS,
            newValue: changes[STORAGE_KEYS.STATS].newValue,
            oldValue: changes[STORAGE_KEYS.STATS].oldValue,
          });
        }
        if (changes[STORAGE_KEYS.AI_ASSIST]) {
          callback({
            key: STORAGE_KEYS.AI_ASSIST,
            newValue: changes[STORAGE_KEYS.AI_ASSIST].newValue,
            oldValue: changes[STORAGE_KEYS.AI_ASSIST].oldValue,
          });
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }

    memoryListeners.add(callback);
    return () => {
      memoryListeners.delete(callback);
    };
  }

  const storageService = {
    getEnabled,
    setEnabled,
    getStats,
    addCounts,
    resetStats,
    getAiAssist,
    setAiAssist,
    onChange,
    // Expose memoryStore internally for testing if needed
    _isFallback: !hasChromeStorage,
  };

  SafeShield.storage = storageService;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.storage;
  }
})();
