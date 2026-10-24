# SafeShield: instructions for AI assistants

## START OF EVERY SESSION (mandatory, before any edit)

1. Read `PROJECT_STATE.md` completely. If it is missing or older than the latest commit, run `npm run state` first.
2. Skim the last entry in `docs/changelog/` for the member you are helping, and read the “Open handoffs” section.
3. Ask me which member (1-4) I am if it is not clear. Only edit files owned by that member (see `.github/CODEOWNERS`). If a change is needed elsewhere, do not make it; put it in “Notes for others”.
4. Reply with a 5-line recap: what the project is, what is done, what is in progress, what is next for me, and any blocker. Wait for my go-ahead only if the next step is ambiguous; otherwise continue with the next task assigned to my member in “Next up”.

## WHILE WORKING

- Follow `docs/contracts.md` and the Privacy rules in `PROJECT_STATE.md`. If a contract must change, stop and ask, because it affects every member.
- Never send real or unredacted data to any external service. Gemma is optional Tier 3 only and only receives already-redacted text.
- Use fake data only in tests, logs and prompts.
- Record a design choice with: `npm run decision -- <member> "<title>"`
- Record a bug or limitation by appending an entry to `docs/state/issues.md`.

## END OF EVERY SESSION or after any task that changes files (mandatory, before you say you are done)

1. `npm run log -- <member> "<title or branch>"` and fill in the new entry completely: Prompt, What changed, Files, Status, Tasks, Decisions, Notes for others, and a concrete Next line.
2. Update task statuses: `npm run task -- <TASK_ID> <status> "<note>"`
3. `npm run state` (also run `npm test` if src/core or tests changed, then `npm run state:full`)
4. Tell me the entry id and the three most important things the next agent must know.

## NEVER

Edit `PROJECT_STATE.md`, `CHANGELOG.md` or `docs/state/state.json` by hand. Delete or rewrite old log entries. Put personal data, passwords, tokens or API keys in any file. Commit directly to `main`.
