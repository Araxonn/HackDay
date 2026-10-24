// SafeShield Detection Patterns
// Regular expressions for Tier 1 PII types (and Tier 2 reserved)
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const PATTERNS = {
    // Indian Phone: optional +91 / 91 / 0 prefix, 10 digits starting with 6-9,
    // optional spaces/hyphens between groups, not inside a longer digit run
    PHONE: /(?<![\w+])(?:\+91[\s.-]?|91(?=[6-9]\d{9})|0[\s.-]?)?([6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|[6-9]\d{9})(?!\d)/g,

    // Standard Email pattern
    EMAIL: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,

    // Indian Aadhaar: 12 digits, first digit 2-9, grouped 4-4-4 with spaces/hyphens or contiguous
    AADHAAR: /(?<!\d)([2-9]\d{3}[\s-]\d{4}[\s-]\d{4}|[2-9]\d{11})(?!\d)/g,

    // Indian PAN: 5 letters (4th is status A,B,C,F,G,H,L,J,P,T), 4 digits, 1 letter. Case-sensitive uppercase.
    PAN: /\b[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]\b/g,
  };

  SafeShield.patterns = PATTERNS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.patterns;
  }
})();
