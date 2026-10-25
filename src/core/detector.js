// SafeShield PII Detector
// Discovers sensitive identifiers, validates them, and resolves overlaps
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const constants = SafeShield.constants || {};
  const PII_TYPES = constants.PII_TYPES || {
    PHONE: 'PHONE',
    EMAIL: 'EMAIL',
    AADHAAR: 'AADHAAR',
    PAN: 'PAN',
  };

  function getPatterns() {
    return SafeShield.patterns || {};
  }

  function getValidators() {
    return SafeShield.validators || {};
  }

  function isValidPhoneMatch(matchStr) {
    const digits = matchStr.replace(/\D/g, '');
    if (digits.length === 10) {
      return /^[6-9]\d{9}$/.test(digits);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return /^[6-9]\d{9}$/.test(digits.slice(1));
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return /^[6-9]\d{9}$/.test(digits.slice(2));
    }
    return false;
  }

  /**
   * Detects sensitive identifiers in the input text.
   * Returns [{ type, start, end, value }] sorted by start ascending and non-overlapping.
   */
  function detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const patterns = getPatterns();
    const validators = getValidators();
    const normalize = validators.normalizeDigits || ((t) => t);

    // Normalize Devanagari numerals to ASCII (guaranteed 1:1 character mapping)
    const normalized = normalize(text);
    const candidates = [];

    // 1. Aadhaar detection (Priority 10)
    if (patterns.AADHAAR) {
      const regex = new RegExp(patterns.AADHAAR.source, patterns.AADHAAR.flags);
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        const matchedText = match[0];
        if (
          validators.isValidAadhaar &&
          validators.isValidAadhaar(matchedText)
        ) {
          candidates.push({
            type: PII_TYPES.AADHAAR,
            start: match.index,
            end: match.index + matchedText.length,
            priority: 10,
          });
        }
      }
    }

    // 2. PAN detection (Priority 8) - Run on normalized uppercase
    if (patterns.PAN) {
      const regex = new RegExp(patterns.PAN.source, patterns.PAN.flags);
      let match;
      // PANs in India are officially uppercase; check original text case to avoid matching lowercase words
      while ((match = regex.exec(text)) !== null) {
        const matchedText = match[0];
        if (validators.isValidPAN && validators.isValidPAN(matchedText)) {
          candidates.push({
            type: PII_TYPES.PAN,
            start: match.index,
            end: match.index + matchedText.length,
            priority: 8,
          });
        }
      }
    }

    // 3. Email detection (Priority 7)
    if (patterns.EMAIL) {
      const regex = new RegExp(patterns.EMAIL.source, patterns.EMAIL.flags);
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        const matchedText = match[0];
        candidates.push({
          type: PII_TYPES.EMAIL,
          start: match.index,
          end: match.index + matchedText.length,
          priority: 7,
        });
      }
    }

    // 4. Phone detection (Priority 5)
    if (patterns.PHONE) {
      const regex = new RegExp(patterns.PHONE.source, patterns.PHONE.flags);
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        const matchedText = match[0];
        if (isValidPhoneMatch(matchedText)) {
          candidates.push({
            type: PII_TYPES.PHONE,
            start: match.index,
            end: match.index + matchedText.length,
            priority: 5,
          });
        }
      }
    }

    // Tier 2: GSTIN (Priority 9)
    if (patterns.GSTIN) {
      const regex = new RegExp(patterns.GSTIN.source, patterns.GSTIN.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        candidates.push({
          type: PII_TYPES.GSTIN || 'GSTIN',
          start: match.index,
          end: match.index + match[0].length,
          priority: 9,
        });
      }
    }

    // Tier 2: IFSC (Priority 7)
    if (patterns.IFSC) {
      const regex = new RegExp(patterns.IFSC.source, patterns.IFSC.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        candidates.push({
          type: PII_TYPES.IFSC || 'IFSC',
          start: match.index,
          end: match.index + match[0].length,
          priority: 7,
        });
      }
    }

    // Tier 2: UPI (Priority 6)
    if (patterns.UPI) {
      const regex = new RegExp(patterns.UPI.source, patterns.UPI.flags);
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        candidates.push({
          type: PII_TYPES.UPI || 'UPI',
          start: match.index,
          end: match.index + match[0].length,
          priority: 6,
        });
      }
    }

    // Tier 2: Voter ID (Priority 5)
    if (patterns.VOTER_ID) {
      const regex = new RegExp(
        patterns.VOTER_ID.source,
        patterns.VOTER_ID.flags,
      );
      let match;
      while ((match = regex.exec(text)) !== null) {
        candidates.push({
          type: PII_TYPES.VOTER_ID || 'VOTER_ID',
          start: match.index,
          end: match.index + match[0].length,
          priority: 5,
        });
      }
    }

    // Tier 2: Passport (Priority 5)
    if (patterns.PASSPORT) {
      const regex = new RegExp(
        patterns.PASSPORT.source,
        patterns.PASSPORT.flags,
      );
      let match;
      while ((match = regex.exec(text)) !== null) {
        candidates.push({
          type: PII_TYPES.PASSPORT || 'PASSPORT',
          start: match.index,
          end: match.index + match[0].length,
          priority: 5,
        });
      }
    }

    // Tier 2: PIN code (Priority 4)
    if (patterns.PINCODE) {
      const regex = new RegExp(patterns.PINCODE.source, patterns.PINCODE.flags);
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        candidates.push({
          type: PII_TYPES.PINCODE || 'PINCODE',
          start: match.index,
          end: match.index + match[0].length,
          priority: 4,
        });
      }
    }

    // Tier 2: DOB (Priority 4)
    if (patterns.DOB) {
      const regex = new RegExp(patterns.DOB.source, patterns.DOB.flags);
      let match;
      while ((match = regex.exec(normalized)) !== null) {
        candidates.push({
          type: PII_TYPES.DOB || 'DOB',
          start: match.index,
          end: match.index + match[0].length,
          priority: 4,
        });
      }
    }

    // Conservative local address fallback. Gemma can still provide richer
    // name/address classification when enabled, but must not be required for
    // an obvious numbered street address.
    if (patterns.ADDRESS) {
      const regex = new RegExp(patterns.ADDRESS.source, patterns.ADDRESS.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        candidates.push({
          type: PII_TYPES.ADDRESS || 'ADDRESS',
          start: match.index,
          end: match.index + match[0].length,
          priority: 3,
        });
      }
    }

    if (candidates.length === 0) {
      return [];
    }

    // Overlap resolution
    // Valid Aadhaar beats phone match on the same digits; higher priority beats lower priority
    const survives = candidates.filter((cand) => {
      for (const other of candidates) {
        if (cand === other) continue;
        const overlaps =
          Math.max(cand.start, other.start) < Math.min(cand.end, other.end);
        if (overlaps) {
          // Special rule: Valid Aadhaar always beats Phone
          if (
            cand.type === PII_TYPES.PHONE &&
            other.type === PII_TYPES.AADHAAR
          ) {
            return false;
          }
          if (
            cand.type === PII_TYPES.AADHAAR &&
            other.type === PII_TYPES.PHONE
          ) {
            continue;
          }
          // Priority check
          if (other.priority > cand.priority) {
            return false;
          }
          if (other.priority === cand.priority) {
            const candLen = cand.end - cand.start;
            const otherLen = other.end - other.start;
            if (otherLen > candLen) return false;
            if (otherLen === candLen && other.start < cand.start) return false;
          }
        }
      }
      return true;
    });

    // Sort by start ascending
    survives.sort(
      (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
    );

    // Ensure non-overlapping in sequential order
    const results = [];
    for (const item of survives) {
      if (results.length === 0) {
        results.push(item);
      } else {
        const prev = results[results.length - 1];
        if (item.start >= prev.end) {
          results.push(item);
        }
      }
    }

    // Slice value from the ORIGINAL text
    return results.map((m) => ({
      type: m.type,
      start: m.start,
      end: m.end,
      value: text.slice(m.start, m.end),
    }));
  }

  const detector = {
    detect,
  };

  SafeShield.detector = detector;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.detector;
  }
})();
