// SafeShield Ephemeral In-Memory Vault
// Lives in content-script memory only; never persisted to disk or chrome.storage; cleared on pagehide.
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  // Map of placeholder -> { placeholder, type, original }
  let entityMap = new Map();

  function remember(entities) {
    if (!Array.isArray(entities)) return;
    for (const ent of entities) {
      if (ent && ent.placeholder && ent.original !== undefined) {
        entityMap.set(ent.placeholder, {
          placeholder: ent.placeholder,
          type: ent.type || 'PII',
          original: ent.original,
        });
      }
    }
  }

  function all() {
    return Array.from(entityMap.values()).map((e) => ({ ...e }));
  }

  function clear() {
    entityMap.clear();
  }

  // Clear on page navigation or tab close
  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    window.addEventListener('pagehide', () => {
      clear();
    });
  }

  const vault = {
    remember,
    all,
    clear,
  };

  SafeShield.vault = vault;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.vault;
  }
})();
