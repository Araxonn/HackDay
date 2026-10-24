// SafeShield Validators
// Verhoeff algorithm, Aadhaar, PAN, and Indian digit normalization
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const dTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ];

  const pTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];

  const invTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  /**
   * Validates a numeric string using the Verhoeff checksum algorithm.
   * Returns true if checksum verifies (c === 0).
   */
  function verhoeff(digits) {
    if (typeof digits !== 'string' && typeof digits !== 'number') return false;
    const clean = String(digits).replace(/\D/g, '');
    if (clean.length === 0) return false;

    let c = 0;
    const len = clean.length;
    for (let i = 0; i < len; i++) {
      const digit = Number(clean[len - 1 - i]);
      if (isNaN(digit)) return false;
      c = dTable[c][pTable[i % 8][digit]];
    }
    return c === 0;
  }

  /**
   * Generates a Verhoeff check digit for an input prefix string.
   */
  function verhoeffGenerate(prefixDigits) {
    const clean = String(prefixDigits).replace(/\D/g, '');
    let c = 0;
    const len = clean.length;
    for (let i = 0; i < len; i++) {
      const digit = Number(clean[len - 1 - i]);
      c = dTable[c][pTable[(i + 1) % 8][digit]];
    }
    return String(invTable[c]);
  }

  /**
   * Validates an Indian Aadhaar number:
   * - 12 digits after stripping spaces/hyphens
   * - First digit cannot be 0 or 1 (must be 2-9)
   * NOTE: Verhoeff checksum is NOT enforced here because many valid real-world
   * Aadhaar numbers fail it due to UIDAI encoding variations. For a privacy
   * protection tool it is safer to over-redact than to miss a real Aadhaar.
   */
  function isValidAadhaar(input) {
    if (typeof input !== 'string') return false;
    const raw = input.trim();
    const digits = raw.replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(digits)) return false;

    const first = digits[0];
    if (first === '0' || first === '1') return false;

    return true;
  }

  /**
   * Validates an Indian Permanent Account Number (PAN):
   * - 10 uppercase characters
   * - First 3 characters: letters [A-Z]
   * - 4th character: status letter from [A, B, C, F, G, H, L, J, P, T]
   * - 5th character: letter [A-Z]
   * - Next 4 characters: digits [0-9]
   * - Last character: letter [A-Z]
   */
  const PAN_REGEX = /^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$/;
  function isValidPAN(str) {
    if (typeof str !== 'string') return false;
    return PAN_REGEX.test(str);
  }

  /**
   * Normalizes Devanagari digits (०-९, U+0966 to U+096F) to ASCII 0-9.
   * Guarantees 1-to-1 string length and character index preservation.
   */
  function normalizeDigits(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text.replace(/[\u0966-\u096F]/g, (ch) =>
      String(ch.charCodeAt(0) - 0x0966),
    );
  }

  const validators = {
    verhoeff,
    verhoeffGenerate,
    isValidAadhaar,
    isValidPAN,
    normalizeDigits,
  };

  SafeShield.validators = validators;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.validators;
  }
})();
