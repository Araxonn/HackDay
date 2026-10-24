# Decisions

## D-001 | 2026-10-24 20:36 | M4 | Follow the PII project description

**Decision:** Build PII redaction for Indian documents and languages, following problem statement #3.
**Why:** The slide’s “What to build” box about news claims and source verification appears to belong to a different problem statement.
**Alternatives:** Build the news verification tool described by that box.
**Impact:** Product scope, requirements, and task priorities follow the PII project.

## D-002 | 2026-10-24 20:36 | M4 | Chrome MV3 with plain JavaScript

**Decision:** Use Chrome Manifest V3, plain JavaScript, no bundler, and the `globalThis.SafeShield` namespace with a guarded CommonJS export for tests.
**Why:** MV3 content scripts cannot use ES module imports without a bundler, and the product must run directly from source.
**Alternatives:** Add a bundler or use module imports in content scripts.
**Impact:** Keep source files compatible with direct script loading and Node tests.

## D-003 | 2026-10-24 20:36 | M4 | Local deterministic detection; optional Gemma later

**Decision:** Use local regex and checksum detection for the core; consider Gemma only as optional Tier 3 with already-redacted input.
**Why:** Core privacy must not depend on an external model service.
**Alternatives:** Send prompts to a hosted model for detection.
**Impact:** Core operation requires no model API; any optional AI path must enforce redacted-only input.

## D-004 | 2026-10-24 20:36 | M4 | Per-member logs and generated master files

**Decision:** Keep append-only per-member logs and generate master changelog/state files.
**Why:** Separate ownership reduces concurrent edit conflicts while preserving a single current handoff.
**Alternatives:** Have all members edit one shared changelog and state file.
**Impact:** Edit `docs/changelog/member-N.md`; never hand-edit generated master files.
