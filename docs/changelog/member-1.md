# Member 1 changelog

## M1-001 | 2026-10-25 03:35 | feat/solo-build
**Prompt:** fix: remove Verhoeff gate from Aadhaar detection
**What changed:**
- Removed Verhoeff checksum requirement from isValidAadhaar() in validators.js; now accepts any 12-digit number starting with 2-9 (structural check only). Verhoeff functions kept and still exported for optional use.
- Updated tests/validators.test.js: 'rejects false positives' test now asserts that structural Aadhaar (234567890123) IS accepted, and still asserts starts-with-0/1 and wrong-length are rejected.
- Updated tests/detector.test.js: 'false positives' test updated to remove badAadhaar case and adds a positive assertion that a structural Aadhaar IS now detected.
  **Files:** `src/core/validators.js` (modified), `tests/validators.test.js` (modified), `tests/detector.test.js` (modified)
  **Status:** done
  **Tasks:** T1-03
  **Decisions:** none
  **Notes for others:** Verhoeff is intentionally dropped from detection — over-redacting is safer than missing a real Aadhaar. If stricter precision is needed later, add it as an opt-in setting, not a default gate.
  **Next:** Implement T1-01 (phone detector) and T1-02 (email detector) if not already complete; then T1-05 (redact() with consistent placeholders).
