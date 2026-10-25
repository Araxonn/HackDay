// SafeShield Detection Patterns
// Regular expressions for Tier 1 PII types (and Tier 2 reserved)
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const PATTERNS = {
    // Indian Phone: optional +91 / 91 / 0 prefix, 10 digits starting with 6-9,
    // optional spaces/hyphens between groups, not inside a longer digit run
    PHONE:
      /(?<![\w+])(?:\+91[\s.-]?|91(?=[6-9]\d{9})|0[\s.-]?)?([6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|[6-9]\d{9})(?!\d)/g,

    // Standard Email pattern
    EMAIL: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,

    // Indian Aadhaar: 12 digits, first digit 2-9, grouped 4-4-4 with spaces/hyphens or contiguous
    AADHAAR: /(?<!\d)([2-9]\d{3}[\s-]\d{4}[\s-]\d{4}|[2-9]\d{11})(?!\d)/g,

    // Indian PAN: 5 letters (4th is status A,B,C,F,G,H,L,J,P,T), 4 digits, 1 letter. Case-sensitive uppercase.
    PAN: /\b[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]\b/g,

    // Tier 2 Patterns
    // IFSC Code: 4 letters, 0, 6 alphanumeric
    IFSC: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,

    // UPI ID: username@handle (excluding standard email TLDs with dots)
    UPI: /\b[a-zA-Z0-9.\-_]{2,64}@(?!gmail|yahoo|outlook|hotmail|icloud|example|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})[a-zA-Z]{2,32}\b/g,

    // PIN code: 6 digits starting 1-9, required near keywords (pin, pincode, postal)
    PINCODE:
      /(?<=\b(?:pin(?:\s*code)?|postal(?:\s*code)?|zip(?:\s*code)?)\b[\s:.-]{1,10})([1-9][0-9]{5})\b/gi,

    // Date of Birth: DD/MM/YYYY or DD-MM-YYYY near keywords
    DOB: /(?<=\b(?:dob|d\.o\.b|date\s+of\s+birth|birth\s*date|janam\s+tithi)\b[\s:.-]{1,10})((?:0[1-9]|[12][0-9]|3[01])[-/.](?:0[1-9]|1[012])[-/.](?:19\d\d|20[0-2]\d))\b/gi,

    // Indian Voter ID (EPIC): 3 letters + 7 digits
    VOTER_ID: /\b[A-Z]{3}[0-9]{7}\b/g,

    // Indian Passport: 1 letter + 7 digits near passport keyword
    PASSPORT:
      /(?<=\b(?:passport(?:\s*no(?:\.|\b)?)?|pass\s*no)\b[\s:.-]{1,10})([A-Z][1-9][0-9]{6})\b/gi,

    // GSTIN: 15 alphanumeric characters (2 state digits + PAN + 1 + Z + check)
    GSTIN:
      /\b[0-3][0-9][A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g,

    // Conservative postal address fallback: a street number followed by a
    // recognized street/locality keyword and optional comma-separated locality.
    ADDRESS:
      /(?<!\w)\d{1,5}(?:[-/]\d{1,5})?(?:\s+[A-Za-z][\w.'-]*){0,8}\s+(?:road|rd|street|st|lane|marg|nagar|colony|society|avenue|sector|layout|park|circle|vihar|extension|enclave|residency|apartment|apt|building|bldg)\b(?:,\s*[^.\n,]{2,40}){0,3}/gi,
  };

  SafeShield.patterns = PATTERNS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.patterns;
  }
})();
