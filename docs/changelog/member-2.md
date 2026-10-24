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

## M2-002 | 2026-10-25 02:33 | feat/solo-build

**Prompt:** fix: detect ChatGPT composer robustly and look up Send button lazily
**What changed:**

- Made composer detection robust in chatgpt.js by sequentially checking visible and editable elements across #prompt-textarea, div.ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"], form [contenteditable="true"], and form textarea.
- Made findSendButton in chatgpt.js look up Send button lazily only at submission/click time, strictly ignoring voice, dictation, and think buttons.
- Updated main.js to compute honest active status based strictly on protection enabled, composer found, and hooks attached (never requiring Send button at load time), with diagnostic console.debug logging on reason changes and diagnostic reason field in SS_GET_STATUS reply.
- Enhanced main.js SPA navigation observation with popstate/pushState/replaceState listeners and fail-closed submission guarding.
- Added comprehensive unit tests in tests/content.test.js covering ProseMirror composer, textarea fallback, unsupported without composer, active without send button, lazy send button detection, and voice button exclusion.
  **Files:** `src/content/adapters/chatgpt.js` (modified), `src/content/main.js` (modified), `tests/content.test.js` (modified)
  **Status:** done
  **Tasks:** T1-07, T1-08
  **Decisions:** none
  **Notes for others:** none
  **Next:** Test in live browser extension environment against latest ChatGPT DOM.
