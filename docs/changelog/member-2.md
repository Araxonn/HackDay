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

## M2-003 | 2026-10-25 03:26 | feat/solo-build
**Prompt:** fix: add SS_SEND_REDACTED handler in main.js
**What changed:**
- Added SS_SEND_REDACTED case to the chrome.runtime.onMessage listener in main.js; guards against disabled/no-composer states, reads composer text, runs redact(), writes redacted text back into composer, shows preview-modal, and replies synchronously with {ok:true} so the popup feedback works immediately.
- Cancel action restores original text; Send action calls composer.submit(adapter); no_pii case replies with reason:'no_pii'.
  **Files:** `src/content/main.js` (modified)
  **Status:** done
  **Tasks:** none
  **Decisions:** none
  **Notes for others:** The SS_SEND_REDACTED handler does NOT run the full fail-closed interceptor path (no final PII re-check before submit). M2 should add a final detect() safety guard before composer.submit if time allows.
  **Next:** Test the full flow in live Chrome — open ChatGPT, type PII, click extension icon, click Send Redacted, confirm preview modal appears.

## M2-004 | 2026-10-25 10:14 | feat/solo-build
**Prompt:** fix: wire Gemma AI Assist into SS_SEND_REDACTED handler in main.js
**What changed:**
- The SS_SEND_REDACTED handler in main.js was calling redactor.redact() directly and then immediately writing to the composer and showing the modal, completely bypassing the Gemma classify step that interceptor.js already implements.
- Replaced the synchronous write-and-show block with an async IIFE that: reads aiAssist from storage, checks word count (≥3) and hasRemainingStructuredPII guard, sends SS_AI_CLASSIFY to the service worker if conditions pass, merges NAME/ADDRESS spans from the response into redactedText and entities, then writes the fully-enriched redacted text to the composer before showing the modal.
- Gemma failure (timeout, unavailable, disabled) is silently swallowed; regex-only redaction result is used as fallback — never blocks the flow.
**Files:** `src/content/main.js` (modified)
**Status:** done
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** The interceptor.js path (Enter key / direct send) already had the Gemma wiring. This fix brings the popup Send Redacted button path to parity. Both paths now mirror each other for AI Assist.
**Next:** Test end-to-end in Chrome — paste prompt with name+address, enable AI toggle, click Send Redacted, confirm NAME_1 and ADDRESS_1 appear in the preview modal.
