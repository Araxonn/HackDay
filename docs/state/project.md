# Safe Shield Project

## Overview

Safe Shield (also called GuptAI by the team; final name is open) is a Chrome Manifest V3 browser extension that protects people using cloud AI with private documents. It detects and redacts sensitive content locally before the user submits a prompt, then lets the user review the redacted version and restore originals locally.

## Problem statement

Hacktoberfest Hack Day, problem statement #3: “PII redaction for Indian documents and languages”. People paste documents containing names, IDs, and account numbers into cloud chatbots. The product helps anyone using cloud AI with private documents.

The slide’s “What to build” box discusses news claims and source verification and appears to belong to a different problem statement. The team follows the PII project description; see D-001.

## Requirements

Core features:

- Automatic PII detection.
- Smart redaction with stable, typed placeholders.
- Pre-submission protection before text leaves the page.
- Privacy shield toggle.
- Detection preview before sending.
- Local restoration of original text.
- Privacy dashboard with counts only.
- Indian language support, including Hindi/Hinglish where feasible.
- Clean, modern UI.

First supported platform: ChatGPT at `chatgpt.com` and `chat.openai.com`.

Delivery is time-boxed to six hours, with feature freeze at about hour 5.5. Tier 1 is must-have, Tier 2 is only if stable, and Tier 3 is after the window.

## Privacy rules

- All detection runs locally.
- Never send unredacted text to any external service.
- Fail closed: if detection or redaction throws, block the send and warn the user.
- Show “Active” only if the composer is found and interception hooks are attached.
- Keep the placeholder-to-original map in memory or `chrome.storage.session` only.
- Persist dashboard counts only, never detected values.
- Gemma is optional Tier 3; prefer local execution (for example, through Ollama), and only provide already-redacted text. The core project requires no model API.

## Tech stack

Chrome Manifest V3, plain JavaScript, no bundler, and no runtime dependencies. Development dependencies may support formatting, linting, and tests. Any optional Gemma integration is Tier 3 only.

## Architecture and data flow

`type -> intercept send -> detect locally -> redact -> preview -> send redacted -> update counts`

Content scripts target the ChatGPT composer. Since MV3 content scripts cannot use ES module imports without a bundler, files in `src/core`, `src/shared`, and `src/content` attach exports to `globalThis.SafeShield` and use a guarded `module.exports` for Node tests.

## Contracts

- `detect(text) -> [{ type, start, end, value }]`
- `redact(text) -> { redactedText, entities: [{ placeholder, type, original }], counts }`
- `restore(text, entities) -> string`
- Placeholder form: `[TYPE_n]`, numbered per type; the same value receives the same placeholder.
- Storage keys: `enabled` (boolean) and `stats` (counts per type only).

## Ownership map

- M1: detection engine (`src/core`) and tests.
- M2: platform integration (`src/content`).
- M3: UI/UX (`src/ui`) and assets.
- M4: foundation, data, and docs (`manifest.json`, `src/shared`, `src/dashboard`, `src/background`, `docs`, `.github`, and scripts).

## Conventions

- Branch names: `feat/<member>-<task>`.
- Use conventional commit prefixes such as `feat:`, `fix:`, `test:`, and `chore:`.
- Keep pull requests small.
- Review pairing: M1 <-> M2 and M3 <-> M4.
- Keep per-member history in `docs/changelog/member-N.md`; generated master files must not be edited by hand.

## Open questions

- Final product name: “Safe Shield” or “GuptAI”.
