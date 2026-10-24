<!-- Purpose: Contributor workflow and expectations; owner: Member 4. -->

# Contributing

## Project memory

Editable project memory lives in `docs/state/` and `docs/changelog/`. Generated handoffs live in `PROJECT_STATE.md`, `CHANGELOG.md`, and `docs/state/state.json`; never edit these generated files by hand.

At the start of a session, follow the START protocol in `AGENTS.md`. Before finishing a file-changing task, follow its END protocol: add a member log entry, update task status, and regenerate project state. If a generated file conflicts during a merge, accept either side and rerun `npm run state`.

To switch AI agents, open `docs/state/resume-prompt.md` and use its prompt with the current member number.
