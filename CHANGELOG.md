# Changelog

> AUTO-GENERATED, do not edit by hand.

## Summary

| Member | Role | Entries |
| --- | --- | ---: |
| M1 | Detection engine | 0 |
| M2 | Platform integration | 2 |
| M3 | UI/UX | 0 |
| M4 | Foundation, data, and docs | 4 |

## Activity

### 2026-10-25

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
