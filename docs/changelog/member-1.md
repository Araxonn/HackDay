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

## M1-002 | 2026-10-25 06:12 | main
**Prompt:** fix: make local Gemma address preview robust
**What changed:**
- Hardened local Gemma response parsing to accept structured objects and JSON fenced in markdown, and return an empty result for blank input.
- Added a regression test for fenced JSON containing an address span.
- Added an end-to-end behavior test proving an AI `ADDRESS` span uses the same preview flow as structured PII.
**Files:** `src/ai/gemma.js` (modified), `tests/gemma.test.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** Address classification still requires a running local Ollama instance with the configured model. This machine has no `ollama` executable, so live address detection could not be exercised here. The existing design intentionally falls back to regex-only detection when Gemma is unavailable.
**Next:** Install/start Ollama, pull the configured model, enable Local AI Assist, and verify an address prompt shows the existing preview modal.

## M1-003 | 2026-10-25 06:33 | main
**Prompt:** fix: keep regex PII path independent from Gemma
**What changed:**
- Prevented Gemma from running when deterministic regex redaction already found structured PII, so enabling AI cannot delay or alter phone, PAN, email, or Aadhaar handling.
- Increased the local Gemma timeout to 30 seconds to allow first-load Ollama inference.
- Updated behavior coverage for structured-PII bypass and AI failure on an address-eligible prompt.
**Files:** `src/ai/gemma.js` (modified), `src/content/interceptor.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** Local smoke classification returned an ADDRESS span from `gemma4:e2b`. Reload the unpacked extension after this change; phone/PAN should use the regex preview immediately even when AI Assist is enabled. Address-only prompts still require Ollama at `127.0.0.1:11434`.
**Next:** Retest fake phone, PAN, and address prompts in ChatGPT with AI Assist enabled.

## M1-004 | 2026-10-25 06:37 | main
**Prompt:** fix: allow content-script Gemma messages
**What changed:**
- Relaxed the service-worker sender guard only when Chrome omits `sender.id`; mismatched IDs remain rejected.
- Verified the project classifier returns an ADDRESS span from local `gemma4:e2b`.
**Files:** `src/background/service-worker.js` (modified)
**Status:** in review
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** Reload both the extension and ChatGPT tab after changing the service worker. Structured phone/PAN detection remains independent of Gemma.
**Next:** Test an address-only prompt with Local AI Assist enabled.

## M1-005 | 2026-10-25 06:46 | main
**Prompt:** feat: warn on AI-detected address paste
**What changed:**
- Added a shared Gemma message helper in the interceptor.
- Extended the capture-phase paste handler to run deterministic redaction first, then classify address/name content with local Gemma when AI Assist is enabled.
- AI-detected address/name pastes now show the same sensitive-data warning banner as phone/PAN/email pastes.
- Added regression coverage for an AI-detected address paste warning.
**Files:** `src/content/interceptor.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T3-01, T2-04
**Decisions:** none
**Notes for others:** Paste warning is asynchronous for AI-only entities and appears after the local model responds. It does not block paste; the send-time preview remains the final redaction gate.
**Next:** Reload the extension and ChatGPT tab, enable Local AI Assist, and paste a fake address to verify the warning banner.

## M1-006 | 2026-10-25 06:49 | main
**Prompt:** fix: handle invalidated extension storage contexts
**What changed:**
- Hardened storage `onChange()` registration and cleanup against stale extension contexts after an extension reload.
- Made `getAiAssist()` return the safe disabled value when its old context is invalidated instead of producing an uncaught error.
- Added an issue note documenting the reload/refresh workflow.
**Files:** `src/shared/storage.js` (modified), `docs/state/issues.md` (modified)
**Status:** in review
**Tasks:** T3-01, T2-04
**Decisions:** none
**Notes for others:** The screenshot error is caused by an old ChatGPT content script surviving an extension reload. The fix prevents storage listener errors; users should still refresh ChatGPT after reloading the extension.
**Next:** Reload SafeShield and refresh ChatGPT, then retest address paste and the warning banner.

## M1-007 | 2026-10-25 06:51 | main
**Prompt:** fix: handle invalidated AI toggle storage writes
**What changed:**
- Hardened `setAiAssist()` against synchronous and callback-time extension-context invalidation.
- Invalidated old contexts now resolve safely instead of throwing from the AI toggle callback.
**Files:** `src/shared/storage.js` (modified)
**Status:** in review
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** This addresses the screenshot at `storage.js` line 192. A fresh ChatGPT tab is still required after reloading the extension because old content scripts cannot be revived.
**Next:** Reload SafeShield, refresh ChatGPT, toggle Local AI Assist, and paste a fake address.

## M1-008 | 2026-10-25 06:53 | main
**Prompt:** fix: harden all storage callbacks and restore test dependencies
**What changed:**
- Centralized safe handling of `chrome.runtime.lastError` for all storage reads and writes.
- Invalidated extension contexts now resolve with safe fallback values instead of producing uncaught errors.
- Restored declared npm dependencies so the end-to-end test can load `puppeteer-core`.
**Files:** `src/shared/storage.js` (modified), `package-lock.json` (modified), `docs/state/issues.md` (modified)
**Status:** in review
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** Reloading the unpacked extension still requires refreshing existing ChatGPT tabs; stale content scripts cannot be revived.
**Next:** Reload the extension and ChatGPT, then toggle Local AI Assist and verify no console error appears.

## M1-009 | 2026-10-25 06:56 | main
**Prompt:** fix: prevent popup storage errors from escaping
**What changed:**
- Made `getAiAssist()` return the safe disabled value for callback and invocation errors.
- Added popup error handling for both AI Assist and protection toggles, including restoring the previous checkbox value and showing a visible status message.
**Files:** `src/shared/storage.js` (modified), `src/ui/popup/popup.js` (modified)
**Status:** in review
**Tasks:** T3-01
**Decisions:** none
**Notes for others:** The supplied attachment was a source snapshot, not a stack trace. A fresh ChatGPT tab is still needed after reloading the extension.
**Next:** Reload SafeShield, open a new ChatGPT tab, and toggle both protection settings.

## M1-010 | 2026-10-25 06:59 | main
**Prompt:** fix: restore sensitive paste warnings with Gemma fallback
**What changed:**
- Fixed browser paste extraction to read the standard `text/plain` clipboard format, with the legacy `text` format retained as a fallback.
- Kept deterministic regex warnings immediate and independent of Gemma; Gemma continues to classify only text regex cannot identify.
- Made the warning host fixed and top-level so the sensitive-data banner remains visible over ChatGPT UI.
- Added regression coverage for `text/plain` pastes while AI Assist is enabled.
**Files:** `src/content/interceptor.js` (modified), `src/ui/overlay/preview-modal.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T2-04, T3-01
**Decisions:** none
**Notes for others:** Regex-detected phone/PAN/email/Aadhaar data now warns without waiting for Gemma. Address/name warnings still require Gemma when regex cannot identify them.
**Next:** Reload the extension and ChatGPT, then paste a fake phone and a fake address with Local AI Assist enabled.

## M1-011 | 2026-10-25 07:05 | main
**Prompt:** fix: capture paste warnings at document level
**What changed:**
- Added a document-level capture-phase paste fallback for dynamically nested ChatGPT editors.
- Kept the composer-level listener and added per-event deduplication so warnings are shown once.
**Files:** `src/content/interceptor.js` (modified)
**Status:** in review
**Tasks:** T2-04
**Decisions:** none
**Notes for others:** Regex warnings remain synchronous and Gemma is only attempted when regex finds no entities. Reload both the extension and ChatGPT before testing.
**Next:** Paste a fake phone into the ChatGPT editor and confirm the warning appears immediately.

## M1-012 | 2026-10-25 07:11 | main
**Prompt:** fix: add address regex fallback for Gemma failures
**What changed:**
- Added a conservative numbered-street `ADDRESS` regex fallback for obvious postal addresses.
- Gemma remains enabled for richer `NAME`/`ADDRESS` classification; the fallback protects users when Gemma times out or is unavailable.
- Address fallback spans are refined by Gemma when an address span is returned, without including trailing sentence text.
- Added behavior coverage proving address pastes show the warning without Gemma.
**Files:** `src/core/patterns.js` (modified), `src/core/detector.js` (modified), `src/content/interceptor.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T2-03, T2-04, T3-01
**Decisions:** none
**Notes for others:** The verified fallback detects `42 Green Park Lane, Pune` as one `ADDRESS` span. Reload the extension and ChatGPT before live testing.
**Next:** Paste `Deliver this to 42 Green Park Lane, Pune.` and verify the warning banner appears even if Ollama is stopped.

## M1-013 | 2026-10-25 07:14 | main
**Prompt:** fix: detect pasted addresses after editor insertion
**What changed:**
- Added an `input` fallback for `insertFromPaste` and `insertFromPasteAsQuotation` events.
- The fallback reads the composer after ChatGPT inserts clipboard content, then runs the local redactor and shows the ADDRESS warning.
- Added regression coverage for address detection through post-paste input events.
**Files:** `src/content/interceptor.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T2-04
**Decisions:** none
**Notes for others:** The address detector and redactor are verified independently. Reload the extension and open a new ChatGPT tab before testing.
**Next:** Paste `Deliver this to 42 Green Park Lane, Pune.` and verify the ADDRESS warning.

## M1-014 | 2026-10-25 07:31 | address_detection
**Prompt:** fix: block original prompt before async redaction
**What changed:**
- Added a synchronous submission gate in the keydown and send-click listeners before storage or Gemma awaits.
- Clean prompts are released through SafeShield’s submit path; detected prompts remain blocked until redaction and preview complete.
- Added regression coverage proving the original phone-containing prompt is not submitted during asynchronous classification.
**Files:** `src/content/interceptor.js` (modified), `tests/qa-behaviour.test.js` (modified)
**Status:** in review
**Tasks:** T1-08, T1-09, T3-01
**Decisions:** none
**Notes for others:** This fixes the race where ChatGPT submitted original text before Gemma/storage completed. Reload the extension and ChatGPT before live testing.
**Next:** Type `Contact support at +91 98765 43210.` and press Enter; confirm the original is never submitted and the preview contains `[PHONE_1]`.
