// SafeShield Redactor & Restorer
// Replaces detected PII with stable typed placeholders and provides local round-trip restoration
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  function getDetector() {
    return SafeShield.detector || { detect: () => [] };
  }

  function getConstants() {
    return (
      SafeShield.constants || {
        makePlaceholder: (type, n) => `[${type}_${n}]`,
      }
    );
  }

  /**
   * Redacts personal data from text.
   * Replaces from the end of string backward so character offsets stay valid.
   * Returns { redactedText, entities: [{ placeholder, type, original }], counts }
   */
  function redact(text) {
    if (!text || typeof text !== 'string') {
      return {
        redactedText: text || '',
        entities: [],
        counts: {},
      };
    }

    const detector = getDetector();
    const constants = getConstants();
    const matches = detector.detect(text);

    if (!matches || matches.length === 0) {
      return {
        redactedText: text,
        entities: [],
        counts: {},
      };
    }

    const typeCounters = {};
    const valueMap = new Map();
    const counts = {};

    // Forward pass to assign stable placeholders and count occurrences
    for (const m of matches) {
      counts[m.type] = (counts[m.type] || 0) + 1;
      const key = `${m.type}::${m.value}`;
      if (!valueMap.has(key)) {
        typeCounters[m.type] = (typeCounters[m.type] || 0) + 1;
        const placeholder = constants.makePlaceholder(
          m.type,
          typeCounters[m.type],
        );
        valueMap.set(key, {
          placeholder,
          type: m.type,
          original: m.value,
        });
      }
    }

    // Replace from the end backward so preceding character offsets remain valid
    let redactedText = text;
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const key = `${m.type}::${m.value}`;
      const entity = valueMap.get(key);
      if (entity) {
        redactedText =
          redactedText.slice(0, m.start) +
          entity.placeholder +
          redactedText.slice(m.end);
      }
    }

    const entities = Array.from(valueMap.values());

    return {
      redactedText,
      entities,
      counts,
    };
  }

  /**
   * Restores redacted text back to original values using known entities.
   * Guarantees restore(redact(x).redactedText, entities) === x
   */
  function restore(text, entities) {
    if (!text || typeof text !== 'string') {
      return text || '';
    }
    if (!Array.isArray(entities) || entities.length === 0) {
      return text;
    }

    let restored = text;
    for (const ent of entities) {
      if (ent && ent.placeholder && ent.original !== undefined) {
        restored = restored.split(ent.placeholder).join(ent.original);
      }
    }

    return restored;
  }

  const redactor = {
    redact,
    restore,
  };

  SafeShield.redactor = redactor;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.redactor;
  }
})();
