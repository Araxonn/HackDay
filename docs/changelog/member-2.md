# Member 2 changelog

## M2-001 | 2026-10-25 01:44 | feat/solo-build

**Prompt:** fix: fail closed when redaction cannot be applied to the composer
**What changed:**

- Enforced fail-closed behavior in interceptor.js: if composer.setText returns false or composer.getText does not match redactedText, immediately block send and call modal.warn without calling submit or showing preview.
- Added a final safety check immediately before any call to composer.submit: re-read composer text and run detect(); if any PII is detected or detect throws, block submission and call modal.warn.
- Added regression tests in tests/failclosed.test.js covering setText false, getText mismatch, user adding PII while modal is open, and happy path submission. Verified qa-behaviour Test 10 passes.
  **Files:** `src/content/interceptor.js` (modified), `tests/failclosed.test.js` (added)
  **Status:** done
  **Tasks:** T1-09
  **Decisions:** none
  **Notes for others:** none
  **Next:** Run full verification and review regression suite.
