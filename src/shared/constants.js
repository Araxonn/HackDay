// SafeShield Shared Constants
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  const PII_TYPES = {
    PHONE: 'PHONE',
    EMAIL: 'EMAIL',
    AADHAAR: 'AADHAAR',
    PAN: 'PAN',
    // Tier 2/3 and reserved types
    NAME: 'NAME',
    ADDRESS: 'ADDRESS',
    IFSC: 'IFSC',
    UPI: 'UPI',
    PINCODE: 'PINCODE',
    DOB: 'DOB',
    VOTER_ID: 'VOTER_ID',
    PASSPORT: 'PASSPORT',
    GSTIN: 'GSTIN',
  };

  const TIER1_TYPES = [
    PII_TYPES.PHONE,
    PII_TYPES.EMAIL,
    PII_TYPES.AADHAAR,
    PII_TYPES.PAN,
  ];

  const STORAGE_KEYS = {
    ENABLED: 'enabled',
    STATS: 'stats',
    AI_ASSIST: 'aiAssist',
  };

  function makePlaceholder(type, n) {
    if (!type || typeof n !== 'number' || n < 1) {
      throw new Error(`Invalid placeholder arguments: type=${type}, n=${n}`);
    }
    return `[${type}_${n}]`;
  }

  const constants = {
    PII_TYPES,
    TIER1_TYPES,
    STORAGE_KEYS,
    makePlaceholder,
  };

  SafeShield.constants = constants;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.constants;
  }
})();
