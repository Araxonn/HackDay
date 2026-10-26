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

## M2-005 | 2026-10-26 10:39 | feat/solo-build
**Prompt:** fix: wire checkComposerAfterPaste to input event on composerEl
**What changed:**
- Wired `checkComposerAfterPaste` to `composerEl.addEventListener('input', ...)` in `attachHooks` inside `src/content/interceptor.js`.
- Resolves ESLint `no-unused-vars` error for `checkComposerAfterPaste`.
- Enables post-paste input event fallback for detecting addresses inserted into the composer (passing test 12d).
- Verified `npm run lint` and `npm test` both pass cleanly.
**Files:** `src/content/interceptor.js` (modified)
**Status:** done
**Tasks:** T2-04
**Decisions:** none
**Notes for others:** Post-paste input fallback now actively listens on composerEl for insertFromPaste/insertFromPasteAsQuotation.
**Next:** Test in live browser extension environment against ChatGPT DOM.


## M2-006 | 2026-10-26 11:31 | feat/solo-build
**Prompt:** fix: robust submit and event simulation for Send Redacted
**What changed:**
- Added `#composer-submit-button` and `[data-testid="send-button"]` selectors and enhanced `aria-label` matching in `src/content/adapters/chatgpt.js`.
- Hardened `setText` in `src/content/composer.js` with `execCommand('selectAll')` and synthetic `beforeinput` events so ProseMirror/React state updates reliably.
- Upgraded `composer.submit(adapter, composerEl)` to simulate full pointer/mouse events (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`) and fallback to Enter keypress on `composerEl`.
- Exposed `setIsBypassing` in `src/content/interceptor.js` and wired `main.js` popup `SS_SEND_REDACTED` modal handler with pre-submit PII check, ephemeral vault caching, stats tracking, and bypassing during submission.
**Files:** `src/content/adapters/chatgpt.js` (modified), `src/content/composer.js` (modified), `src/content/interceptor.js` (modified), `src/content/main.js` (modified)
**Status:** done
**Tasks:** T1-08, T1-11
**Decisions:** none
**Notes for others:** Reload the unpacked extension in chrome://extensions and refresh the active ChatGPT tab before testing.
**Next:** Test the Send Redacted button in the extension popup on chatgpt.com and verify prompt sends properly.


## M2-007 | 2026-10-26 11:40 | feat/solo-build
**Prompt:** fix: copy redacted text to clipboard and paste to composer without auto-send
**What changed:**
- Replaced programmatic button click / Enter submission in `composer.js`, `interceptor.js`, and `main.js` with direct clipboard copy (`navigator.clipboard.writeText`), pasting into the ChatGPT composer (`composer.setText`), and focusing the textarea.
- Removed global `document.execCommand('selectAll')` in favor of element-scoped `Range` selection, eliminating CSP violations with internal sandboxed iframes (such as `runner.html`).
- Displayed user feedback notification (`modal.warnInfo('📋 Redacted text copied to clipboard & pasted into composer.')`) upon Send Redacted confirmation.
- Retained full privacy guarantees: ephemeral vault caching, stats counting, and pre-submit safety checks all continue to run.
**Files:** `src/content/composer.js` (modified), `src/content/interceptor.js` (modified), `src/content/main.js` (modified)
**Status:** done
**Tasks:** T1-08, T1-11
**Decisions:** none
**Notes for others:** Clicking Send Redacted now copies the redacted prompt to the user's clipboard and writes it into ChatGPT's composer without triggering automated submission or CSP errors.
**Next:** Reload the extension in chrome://extensions, refresh ChatGPT, and test clicking Send Redacted.


## M2-008 | 2026-10-26 12:10 | feat/solo-build
**Prompt:** fix: prevent modal click-through and close popup on send redacted
**What changed:**
- Fixed critical pointer-events bug in `src/ui/overlay/preview-modal.js` and `preview-modal.css`: added `pointer-events: auto` to `.ss-backdrop`, `.ss-modal`, `.ss-close-btn`, and `.ss-btn`, and dynamically toggled `hostEl.style.pointerEvents = 'auto'` while the modal is open. When closed, resets host pointer events to `none`.
- Added pointer event propagation stop (`stopPropagation`, `preventDefault`) on backdrop, mousedown, mouseup, pointerdown, and button clicks, completely preventing clicks from bleeding through to underlying ChatGPT page elements.
- Added 3-second timeout guard to local AI classification calls in `interceptor.js` and `main.js` so offline Ollama service instances never hang or freeze the UI.
- Optimized capture-phase click listener in `interceptor.js` with early bailouts for clicks originating on `#safeshield-preview-modal-host` and non-clickable elements.
**Files:** `src/ui/overlay/preview-modal.js` (modified), `src/ui/overlay/preview-modal.css` (modified), `src/content/interceptor.js` (modified), `src/content/main.js` (modified)
**Status:** done
**Tasks:** T1-08, T1-11
**Decisions:** none
**Notes for others:** The modal buttons now reliably capture mouse clicks and immediately close the dialog upon clicking 'Send redacted', 'Cancel', or 'Restore original' without passing clicks through to ChatGPT.
**Next:** Reload extension at chrome://extensions and test 'Send redacted' on chatgpt.com to verify popup closes promptly.

