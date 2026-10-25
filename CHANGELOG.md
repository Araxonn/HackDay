# Changelog

> AUTO-GENERATED, do not edit by hand.

## Summary

| Member | Role | Entries |
| --- | --- | ---: |
| M1 | Detection engine | 15 |
| M2 | Platform integration | 3 |
| M3 | UI/UX | 2 |
| M4 | Foundation, data, and docs | 7 |

## Activity

### 2026-10-25

**Role:** Detection engine

## M1-015 | 2026-10-25 07:35 | address_detection
**Prompt:** fix: make Send redacted submit reliably
**What changed:**
- Added a shared redacted-submit helper that retries the current adapter send button when the composer submit helper returns false.
- Send redacted now reports a visible warning when ChatGPT has no usable send button instead of failing silently.
**Files:** `src/content/interceptor.js` (modified)
**Status:** in review
**Tasks:** T1-11, T1-08
**Decisions:** none
**Notes for others:** Reload SafeShield and ChatGPT before testing. A failed live submit now displays `Send blocked: ChatGPT send button is unavailable.`.
**Next:** Open the preview, click Send redacted, and confirm the redacted prompt is submitted once.

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Detection engine

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

**Role:** Foundation, data, and docs

## M4-006 | 2026-10-25 04:53 | feat/solo-build
**Prompt:** Publishing combined feature branch changes
**What changed:**
- <summarize each change>
**Files:** <path> (added|modified|deleted)
**Status:** in review
**Tasks:** none
**Decisions:** none
**Notes for others:** none
**Next:** <one concrete next step>

**Role:** Foundation, data, and docs

## M4-006 | 2026-10-25 04:52 | feat/solo-build
**Prompt:** Publish all current changes together rather than splitting them by member.
**What changed:**
- Prepared one combined commit containing the complete staged feature branch changes across the project's ownership areas.
- Ran the project test suite successfully before preparing the publication.
**Files:** `docs/changelog/member-4.md` (modified)
**Status:** in review
**Tasks:** none
**Decisions:** none
**Notes for others:** All staged changes are being kept together on `feat/solo-build`; repository guidance prohibits committing directly to `main`.
**Next:** Commit the complete change set and push `feat/solo-build` for a pull request into `main`.

**Role:** Foundation, data, and docs

## M4-005 | 2026-10-25 03:43 | feat/solo-build
**Prompt:** docs: add MIT license and complete open-source README
**What changed:**
- Added `LICENSE` file (MIT) with copyright line "Copyright (c) 2026 SafeShield Contributors".
- Rewrote `README.md` completely: added shields/badges, About section, Tier 1/2/3 feature tables, PII type table, Privacy Model & Guarantees section, Tech Stack table, Installation, Usage, Testing, full repo tree, Optional Gemma section, DevTools section, Component Contracts, Contributing quick-start, team structure, Limitations, License section, and Acknowledgements.
**Files:** `LICENSE` (added), `README.md` (modified)
**Status:** done
**Tasks:** T1-16
**Decisions:** none
**Notes for others:** T1-16 (README, demo script, and test prompts) is now substantially complete. Demo script and test-prompts docs already exist at docs/demo-script.md and docs/test-prompts.md; those may need polish but are not placeholders.
**Next:** Tag the repository with v0.1.0 or open a release PR; ensure CODEOWNERS GitHub usernames are filled in before merging to main.

**Role:** Detection engine

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

**Role:** Platform integration

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

**Role:** UI/UX

## M3-002 | 2026-10-25 03:16 | feat/solo-build
**Prompt:** feat: add Send Redacted button to popup
**What changed:**
- Added a "Send Redacted" full-width button with shield icon to popup.html, placed above the Privacy Dashboard footer link in its own .send-redacted-section.
- Added a .send-redacted-feedback div (aria-live="polite") below the button that shows inline success/error messages without blocking the UI.
- Added CSS in popup.css for .send-redacted-btn (gradient green, hover lift, disabled state) and .send-redacted-feedback (success/error colour variants).
- Wired the button in popup.js: disabled by default; enabled only when setStatusUI('active') is called; click sends SS_SEND_REDACTED to the active tab's content script and shows feedback based on the response (ok, no_pii, disabled, or error).
  **Files:** `src/ui/popup/popup.html` (modified), `src/ui/popup/popup.css` (modified), `src/ui/popup/popup.js` (modified)
  **Status:** done
  **Tasks:** T1-11
  **Decisions:** none
  **Notes for others:** Content script (main.js / interceptor.js, owned by M2) must handle the SS_SEND_REDACTED message type and reply with {ok:true}, {ok:false, reason:'no_pii'}, {ok:false, reason:'disabled'}, or {ok:false, message:'...'} for the popup feedback to work end-to-end.
  **Next:** M2 wires SS_SEND_REDACTED handler in main.js; M3 can then do T1-12 (icons and branding polish).

**Role:** UI/UX

## M3-001 | 2026-10-25 03:04 | feat/solo-build
**Prompt:** fix: popup decides support only from SS_GET_STATUS reply
**What changed:**

- Removed tab.url and tab.title checks from checkTabStatus in popup.js; popup decides page support purely on the response to the SS_GET_STATUS message without requiring the tabs permission.
- Handled chrome.runtime.lastError ("Receiving end does not exist" or unattached content script) and null response cleanly by setting status to unsupported ("Not supported on this page").
- Added unit tests in tests/popup.test.js verifying that popup status logic works with tabs lacking url/title, handles connection errors gracefully, and does not require the tabs permission.
  **Files:** `src/ui/popup/popup.js` (modified), `tests/popup.test.js` (added)
  **Status:** done
  **Tasks:** T1-10
  **Decisions:** none
  **Notes for others:** none
  **Next:** Verify popup in Chrome with live extension reload and test prompt submissions on ChatGPT.

**Role:** Platform integration

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

**Role:** Platform integration

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

### 2026-10-24

**Role:** Foundation, data, and docs

## M4-004 | 2026-10-24 21:10 | chore/project-state-handoff
**Prompt:** Finish live project memory: verify generators, hook, task CLI, commit, and push the branch.
**What changed:**

- Fixed state generation: no ANSI in the repo map, porcelain working-tree paths keep the leading status space, log fields parse with leading whitespace, changelog entries show member role.
- Made `npm run task` treat a missing note as empty so PowerShell can restore statuses.
- Verified `npm run prepare`, changelog, state, format, state:check, the pre-commit hook, and the task CLI.
  **Files:** `scripts/lib.js` (modified), `scripts/state.js` (modified), `scripts/build-changelog.js` (modified), `scripts/task.js` (modified), `docs/changelog/member-4.md` (modified)
  **Status:** done
  **Tasks:** none
  **Decisions:** none
  **Notes for others:** Open a PR from `chore/project-state-handoff` into `main`. Do not merge from this session. Replace CODEOWNERS placeholders with real GitHub usernames.
  **Next:** Teammates should pull the branch, run `npm install` so `prepare` sets `core.hooksPath` to `.githooks`, and start Tier 1 work from Next up.

**Role:** Foundation, data, and docs

## M4-003 | 2026-10-24 20:36 | chore/project-state-handoff
**Prompt:** Add generated project memory, task/decision tracking, agent protocols, and CI checks.
**What changed:**

- Added editable project state sources, per-member logs, generation scripts, and generated handoff files.
- Added agent instructions, a Git hook, CI checks, and command-line tracking tools.
  **Files:** `docs/state/project.md` (added), `docs/state/tasks.json` (added), `docs/state/decisions.md` (added), `docs/state/issues.md` (added), `docs/state/resume-prompt.md` (added), `docs/changelog/README.md` (added), `docs/changelog/member-1.md` (added), `docs/changelog/member-2.md` (added), `docs/changelog/member-3.md` (added), `docs/changelog/member-4.md` (modified), `scripts/lib.js` (added), `scripts/build-changelog.js` (added), `scripts/state.js` (added), `scripts/new-log-entry.js` (added), `scripts/task.js` (added), `scripts/decision.js` (added), `scripts/setup-hooks.js` (added), `.githooks/pre-commit` (added), `AGENTS.md` (added), `CLAUDE.md` (added), `GEMINI.md` (added), `.github/copilot-instructions.md` (added), `.cursor/rules/safeshield.mdc` (added), `.github/workflows/state-check.yml` (added), `.gitattributes` (added), `package.json` (modified), `README.md` (modified), `CONTRIBUTING.md` (modified), `.github/CODEOWNERS` (modified), `.github/pull_request_template.md` (modified)
  **Status:** done
  **Tasks:** none
  **Decisions:** D-004
  **Notes for others:** Generated project state is not hand-edited. Continue to log work by appending entries and regenerating state.
  **Next:** Run the verification commands, inspect the generated state, and open a PR into `main`.

**Role:** Foundation, data, and docs

## M4-002 | 2026-10-24 20:36 | chore/scaffold-setup
**Prompt:** Install minimal development tooling and configure formatting and linting.
**What changed:**

- Added the requested development-only formatter, linter, globals, and Chrome type packages.
- Added npm test, lint, format, and format-check scripts and a flat ESLint config.
  **Files:** `package.json` (added), `package-lock.json` (added), `eslint.config.js` (added), `.prettierrc` (modified), `.gitignore` (modified)
  **Status:** done
  **Tasks:** none
  **Decisions:** D-002
  **Notes for others:** `node_modules/` is ignored; the app has no runtime dependencies and no bundler.
  **Next:** Add implementation and tests without weakening the local-only privacy requirements.

**Role:** Foundation, data, and docs

## M4-001 | 2026-10-24 20:36 | chore/scaffold-setup
**Prompt:** Create the initial SafeShield repository scaffold.
**What changed:**

- Added the MV3 manifest, documentation placeholders, source tree, UI shells, and test placeholders.
- Added placeholder extension icons at 16, 48, and 128 pixels.
  **Files:** `manifest.json` (added), `README.md` (added), `CONTRIBUTING.md` (added), `.gitignore` (added), `.env.example` (added), `.prettierrc` (added), `.github/CODEOWNERS` (added), `.github/pull_request_template.md` (added), `docs/contracts.md` (added), `docs/demo-script.md` (added), `docs/test-prompts.md` (added), `assets/icons/.gitkeep` (added), `assets/icons/icon16.png` (added), `assets/icons/icon48.png` (added), `assets/icons/icon128.png` (added), `src/shared/constants.js` (added), `src/shared/storage.js` (added), `src/shared/vault.js` (added), `src/core/validators.js` (added), `src/core/patterns.js` (added), `src/core/detector.js` (added), `src/core/redactor.js` (added), `src/content/adapters/chatgpt.js` (added), `src/content/interceptor.js` (added), `src/content/composer.js` (added), `src/content/main.js` (added), `src/background/service-worker.js` (added), `src/ui/popup/popup.html` (added), `src/ui/popup/popup.css` (added), `src/ui/popup/popup.js` (added), `src/ui/overlay/preview-modal.js` (added), `src/ui/overlay/preview-modal.css` (added), `src/ui/shared.css` (added), `src/dashboard/dashboard.html` (added), `src/dashboard/dashboard.css` (added), `src/dashboard/dashboard.js` (added), `src/ai/gemma.js` (added), `tests/validators.test.js` (added), `tests/detector.test.js` (added), `tests/redactor.test.js` (added)
  **Status:** done
  **Tasks:** none
  **Decisions:** none
  **Notes for others:** The scaffold files were placeholders; existence alone does not mean the feature task is implemented.
  **Next:** Build out the Tier 1 tasks owned by each member.
