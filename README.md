<div align="center">

# 🛡️ SafeShield

### Local-First PII Redaction for AI Chat Platforms

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20Runtime-orange.svg)](#tech-stack)
[![Privacy First](https://img.shields.io/badge/Privacy-Local%20Only-purple.svg)](#privacy-model--guarantees)
[![Hacktoberfest](https://img.shields.io/badge/Built%20at-Hacktoberfest%20Hack%20Day-ff6900.svg)](#about)

**SafeShield** is a Chrome browser extension that automatically detects and redacts sensitive Indian personal data (PII) **entirely on your device**, before your prompt ever leaves the browser tab. Powered by deterministic regex and checksum validation — no cloud AI required.

[Features](#features) • [Privacy Model](#privacy-model--guarantees) • [Installation](#installation--setup) • [Testing](#testing) • [Architecture](#architecture) • [Contributing](#contributing) • [License](#license)

</div>

---

## About

SafeShield was built during **Hacktoberfest Hack Day** in response to Problem Statement #3: *"PII redaction for Indian documents and languages."*

People routinely paste private documents — Aadhaar cards, PAN cards, bank statements, medical records — directly into cloud AI chatbots. SafeShield stops sensitive data from leaving the browser by intercepting submissions, redacting PII locally, and letting you review what was found before anything is sent.

> **Core design principle**: All detection, redaction, and restoration happen inside your browser. SafeShield makes **zero external network calls** during its core operation.

---

## Features

### ✅ Tier 1 — Core (Implemented)

| Feature | Description |
|---|---|
| 🔍 **PII Detection** | Indian phone numbers, email addresses, Aadhaar (12-digit, structural), PAN cards |
| ✂️ **Smart Redaction** | Stable typed placeholders (`[PHONE_1]`, `[AADHAAR_1]`) — same value, same placeholder |
| 👁️ **Preview Modal** | Shadow DOM preview of detected entities before submission |
| ↩️ **Local Restore** | One-click restoration of original text in-browser — nothing sent |
| 🚨 **Fail-Closed** | Any error during detection/redaction blocks submission and warns the user |
| 📊 **Privacy Dashboard** | Anonymized counts per PII type; never stores raw values |
| 🟢 **Honest Status** | Extension shows "Active" only when composer is found and hooks are attached |
| 📤 **Send Redacted Button** | Trigger redaction directly from the extension popup |

### 🔜 Tier 2 — Planned

- More Indian IDs: IFSC, UPI, Bank Account, PIN code, DOB, Voter ID, Passport, Driving Licence, GSTIN, Vehicle Number
- Devanagari (`०-९`) digit normalization and Hindi/Hinglish keyword triggers
- Keyword-triggered name and address detection
- Paste interception with warning banner
- Extension icon badge showing redaction count

### 🔬 Tier 3 — Optional / Future

- Local Gemma AI Assist for unstructured names & addresses (via Ollama, redacted-only input)
- PDF/file upload scanning with local OCR
- Live PII highlighting while typing
- Dashboard charts, daily history, and CSV export
- Additional platform adapters (Claude, Gemini, Copilot)
- Firefox support

---

## What SafeShield Protects

SafeShield identifies and redacts the following Indian PII types:

| Type | Pattern | Example |
|---|---|---|
| **Phone** | `+91`/`91`/`0` prefix + 10 digits starting 6–9 | `+91 98765 43210` |
| **Email** | Standard RFC-compliant email addresses | `user@example.com` |
| **Aadhaar** | 12-digit number starting with 2–9 | `2345 6789 0123` |
| **PAN** | `[ABCFGHLJPT]AAAA9999A` format | `ABCDE1234F` |
| *(Tier 2)* **IFSC** | Bank IFSC codes | `SBIN0001234` |
| *(Tier 2)* **UPI ID** | UPI payment handles | `name@upi` |
| *(Tier 2)* **Voter ID** | Election Commission format | `ABC1234567` |
| *(Tier 2)* **GSTIN** | 15-character GST number | `22AAAAA0000A1Z5` |

---

## Privacy Model & Guarantees

SafeShield is designed from first principles with a **fail-closed, local-first** privacy architecture:

1. **100% Offline & Local Execution** — Detection, redaction, and restoration execute entirely within the local browser runtime. Zero external network calls during core operation.

2. **Fail Closed** — If detection, redaction, or DOM inspection throws an unhandled error, prompt submission is **blocked immediately** and a warning banner is shown. The raw prompt text is never permitted to leave the page on error.

3. **Honest Status** — The popup displays **Active** strictly when:
   - Protection is enabled by the user, **AND**
   - The active tab matches a supported platform, **AND**
   - The prompt composer is discovered in the DOM, **AND**
   - Interception capture hooks are actively attached.
   
   Otherwise it shows **Off**, **Not supported on this page**, or **Error**.

4. **Anonymized Count Storage Only** — SafeShield never writes prompt text, detected values, or entity mappings to `chrome.storage`, the console, or any background message. Only aggregate counts per PII type (e.g. `{ PHONE: 3, EMAIL: 1 }`) are stored.

5. **Ephemeral In-Memory Vault** — The placeholder-to-original mapping lives in content script memory only and is automatically purged on `pagehide` (navigation or tab close).

6. **No Model API Required** — The core product requires no external AI service. Optional local Gemma integration (Tier 3) uses only your local loopback (`localhost:11434`) and only receives already-redacted text.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension platform | Chrome Manifest V3 |
| Language | Plain JavaScript (ES2020) — no bundler |
| Runtime dependencies | **None** |
| Dev dependencies | ESLint, Prettier, Puppeteer Core (for E2E tests) |
| Test runner | Node.js built-in `node --test` |
| Namespace | `globalThis.SafeShield` (browser) + guarded `module.exports` (Node tests) |

---

## Installation & Setup

No build step is required. The extension runs directly from source.

### Prerequisites
- Google Chrome (version 88+)
- Node.js ≥ 20 (for running tests only)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Araxonn/SafeShield.git
cd SafeShield

# 2. Install dev dependencies (tests and tooling only)
npm install
```

Then load the extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** on (top-right corner)
3. Click **Load unpacked**
4. Select the root `SafeShield/` folder
5. Pin the SafeShield icon to your toolbar for easy access

> **Note**: You do not need to run `npm run build` — the extension loads directly from the `src/` directory.

---

## Usage

1. Navigate to **[chatgpt.com](https://chatgpt.com)** or **[chat.openai.com](https://chat.openai.com)**
2. Click the SafeShield 🛡️ icon in your Chrome toolbar
3. Confirm the status shows **🟢 Active on this page**
4. Type or paste a prompt containing personal data into the ChatGPT composer
5. Either:
   - Press **Enter** or click Send — SafeShield intercepts and shows a preview
   - Click **Send Redacted** in the popup directly
6. Review the detected entities in the preview modal
7. Click **Send Redacted** to submit the cleaned prompt, or **Cancel** to abort

### Data Flow

```
Type/Paste → Intercept Send → Detect Locally → Redact → Preview → Send Redacted → Update Counts
```

---

## Testing

### Automated Unit Tests

```bash
npm test
```

Runs the full suite using Node's built-in test runner. Tests cover:
- Validators (Aadhaar structural check, PAN format, Devanagari digits)
- Detector (phone, email, Aadhaar, PAN patterns and overlap resolution)
- Redactor (placeholder assignment, round-trip restoration)
- Content script (composer detection, SPA navigation, fail-closed guards)
- Popup (status logic, connection error handling)
- Storage and Vault (ephemeral map, count persistence)
- QA static, behaviour, and E2E suites

### Code Quality

```bash
npm run lint          # ESLint check
npm run format        # Prettier auto-format
npm run format:check  # Prettier dry-run (CI)
```

### Standalone UI Harness

Test the preview modal and warning banners without opening ChatGPT:

1. Open Chrome
2. Navigate to `file:///path/to/SafeShield/src/ui/dev/preview-demo.html`
3. Click buttons to trigger modal, Send, Restore, and Cancel flows

### End-to-End Manual Testing

Follow the 5-step script in [`docs/demo-script.md`](docs/demo-script.md) using the verified synthetic test prompts in [`docs/test-prompts.md`](docs/test-prompts.md).

---

## Repository Structure

```text
SafeShield/
├── manifest.json                     # MV3 extension manifest
├── package.json                      # npm scripts (test, lint, format, state)
├── LICENSE                           # MIT license
├── README.md                         # This file
├── CONTRIBUTING.md                   # Contribution guidelines
├── AGENTS.md / GEMINI.md / CLAUDE.md # AI agent session instructions
├── PROJECT_STATE.md                  # Auto-generated project memory (do not edit)
├── CHANGELOG.md                      # Auto-generated from per-member logs
│
├── assets/icons/                     # Extension icons (16px, 48px, 128px)
│
├── docs/
│   ├── contracts.md                  # Authoritative component API contracts
│   ├── demo-script.md                # 5-step live demonstration guide
│   ├── test-prompts.md               # Synthetic fake-data test prompts
│   ├── changelog/                    # Per-member append-only logs (source of truth)
│   └── state/                        # Project state sources (tasks, decisions, issues)
│
├── src/
│   ├── shared/
│   │   ├── constants.js              # PII types, storage keys, placeholder generator
│   │   ├── storage.js                # chrome.storage.local wrapper + in-memory fallback
│   │   └── vault.js                  # Ephemeral in-memory entity vault
│   ├── core/
│   │   ├── validators.js             # Structural Aadhaar, PAN, Devanagari validators
│   │   ├── patterns.js               # RegEx patterns for Tier 1 PII types
│   │   ├── detector.js               # Multi-pattern detection & overlap resolver
│   │   └── redactor.js               # Redaction & round-trip restoration engine
│   ├── content/
│   │   ├── adapters/chatgpt.js       # ChatGPT DOM selectors & lazy send-button lookup
│   │   ├── composer.js               # Composer read/write/submit abstraction
│   │   ├── interceptor.js            # Capture-phase submission interceptor (fail-closed)
│   │   └── main.js                   # SPA observer, status responder, message router
│   ├── ui/
│   │   ├── shared.css                # Design tokens, color palette, dark mode
│   │   ├── popup/                    # Toolbar popup (HTML, CSS, JS)
│   │   ├── overlay/                  # Shadow DOM preview modal & warning banner
│   │   └── dev/preview-demo.html     # Standalone UI testing harness
│   ├── dashboard/                    # Privacy dashboard (extension options page)
│   ├── background/
│   │   └── service-worker.js         # MV3 background service worker
│   └── ai/
│       └── gemma.js                  # Optional local Gemma AI assist (Tier 3)
│
├── tests/                            # Automated node --test suites
│   ├── validators.test.js
│   ├── detector.test.js
│   ├── redactor.test.js
│   ├── content.test.js
│   ├── popup.test.js
│   ├── failclosed.test.js
│   ├── storage.test.js
│   ├── vault.test.js
│   ├── qa-static.test.js
│   ├── qa-behaviour.test.js
│   └── qa-e2e.test.js
│
└── scripts/                          # Project automation (state, log, task, decision)
```

---

## Optional: Local Gemma AI Assist

SafeShield includes an **optional, disabled-by-default** AI feature for detecting unstructured personal names and physical addresses using a local Ollama instance running Gemma.

> **Privacy Rule**: The AI assist talks **only** to your local loopback (`localhost:11434`). Hosted cloud APIs are deliberately unsupported. Structured PII is always regex-redacted **before** any text is passed to Gemma. If Ollama is offline, SafeShield falls back to regex-only detection gracefully.

### Setup

```bash
# 1. Install Ollama from https://ollama.com
# 2. Pull the Gemma model
ollama pull gemma4:e2b

# 3. On Windows — allow Chrome extensions to reach loopback Ollama
setx OLLAMA_ORIGINS "chrome-extension://*"

# 4. Restart Ollama (system tray → quit → reopen from Start menu)
```

Then enable **Local AI Assist** in the SafeShield popup toggle.

---

## DevTools: Verifying ChatGPT Selectors

If ChatGPT updates its DOM, verify or update selectors in [`src/content/adapters/chatgpt.js`](src/content/adapters/chatgpt.js):

```javascript
// Open https://chatgpt.com, press F12, paste into Console:

// 1. Find composer
const composer =
  document.querySelector('#prompt-textarea') ||
  document.querySelector('div.ProseMirror[contenteditable="true"]') ||
  document.querySelector('[contenteditable="true"][role="textbox"]');
console.log('Composer found:', composer);

// 2. Read text
console.log('Composer text:', composer?.innerText || composer?.value);

// 3. Find send button (strict — excludes voice/think buttons)
const sendBtn =
  document.querySelector('button[data-testid="send-button"]') ||
  document.querySelector('button[aria-label="Send prompt"]');
console.log('Send button found:', sendBtn);
```

---

## Component Contracts

The authoritative contracts are in [`docs/contracts.md`](docs/contracts.md). Key interfaces:

```javascript
// detector.js
detect(text) → [{ type, start, end, value }]

// redactor.js
redact(text)  → { redactedText, entities: [{ placeholder, type, original }], counts }
restore(text, entities) → string

// Placeholder format
[TYPE_n]   // e.g. [PHONE_1], [AADHAAR_2] — same value → same placeholder
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

### Quick Start for Contributors

```bash
# Fork the repo and clone your fork
git clone https://github.com/<your-username>/SafeShield.git
cd SafeShield
npm install          # sets up git hooks via prepare script

# Create a branch (branch naming convention: feat/<member>-<task>)
git checkout -b feat/m1-phone-detector

# Make your changes, then run checks
npm test
npm run lint
npm run format:check

# Commit using Conventional Commits
git commit -m "feat(detector): add +91 phone pattern"
```

### Team Structure

| Member | Ownership |
|---|---|
| M1 | Detection engine (`src/core/`) and unit tests |
| M2 | Platform integration (`src/content/`) |
| M3 | UI/UX (`src/ui/`) and assets |
| M4 | Foundation, docs, scripts, and CI (`.github/`, `scripts/`, `docs/`) |

### Session Workflow (AI Agents & Humans)

1. Read `PROJECT_STATE.md` before starting
2. Log work: `npm run log -- <member> "<title>"`
3. Update task status: `npm run task -- <TASK_ID> <status> "<note>"`
4. Regenerate state: `npm run state`
5. Never commit directly to `main`

---

## Limitations

- **Pattern-based detection only** — Heuristic regex. Malformed numbers, unusual separators, or unstructured descriptions of PII may be missed.
- **ChatGPT only (prototype)** — Other platforms (Claude, Gemini, Copilot) are not currently intercepted.
- **No cloud AI** — SafeShield never calls hosted LLMs. Optional AI assist is local-only.
- **Browser-only** — No mobile app or server-side component.

---

## License

SafeShield is released under the **MIT License** — see [LICENSE](LICENSE) for full text.

```
MIT License — Copyright (c) 2026 SafeShield Contributors
```

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to the license conditions.

---

## Acknowledgements

- Built during **Hacktoberfest Hack Day** — Problem Statement #3: PII Redaction for Indian Documents and Languages
- Aadhaar structural validation based on the [Unique Identification Authority of India (UIDAI)](https://uidai.gov.in) number format specification
- PAN format based on [Income Tax Department of India](https://www.incometaxindia.gov.in) guidelines

---

<div align="center">

**Made with ❤️ to keep your private data private.**

*SafeShield — because your Aadhaar number doesn't belong in an AI chatbot.*

</div>


---

## What It Is

SafeShield intercepts user prompt submissions on ChatGPT in the browser's capture phase. It searches locally for sensitive identifiers (Indian phone numbers, email addresses, Aadhaar numbers with Verhoeff validation, and PAN numbers), replaces them with stable typed placeholders (such as `[PHONE_1]`, `[AADHAAR_1]`), displays a preview of what was detected, allows one-click local restoration, and logs anonymized counts to a local privacy dashboard.

---

## Privacy Model & Guarantees

SafeShield is designed from first principles with a **fail-closed, local-first** privacy architecture:

1. **100% Offline & Local Execution**: Detection, redaction, and restoration execute entirely within the local browser runtime. Zero external network calls.
2. **Fail Closed**: If detection, redaction, or DOM inspection throws an unhandled error, prompt submission is blocked immediately and a warning banner is shown. The raw prompt text is never permitted to leave the page on error.
3. **Honest Status**: The extension popup displays **Active** strictly when:
   - Protection is enabled by the user, **AND**
   - The active tab matches a supported platform (`chatgpt.com` / `chat.openai.com`), **AND**
   - The prompt composer is discovered in the DOM, **AND**
   - Interception capture hooks are actively attached.
     Otherwise, it displays **Off**, **Not supported on this page**, or **Error**.
4. **Anonymized Count Storage Only**: SafeShield never writes prompt text, detected sensitive values, or entity mappings to `chrome.storage`, the console, or any background message. Only aggregate counts per PII type (e.g. `{ PHONE: 3, EMAIL: 1 }`) are stored.
5. **Ephemeral In-Memory Vault**: The placeholder-to-original mapping lives in content script memory only and is automatically purged on `pagehide` (navigation or tab close).

### What SafeShield Protects

- Indian mobile numbers (10 digits starting 6–9, with optional `+91`, `91`, or `0` prefix, with spaces or hyphens).
- Email addresses.
- 12-digit Indian Aadhaar numbers passing the Verhoeff checksum algorithm.
- 10-character Indian PAN cards matching official status codes (`[ABCFGHLJPT]`).
- Tier 2 Indian financial & identification identifiers: IFSC codes, UPI IDs, PIN codes (near keywords), Dates of Birth, Voter IDs, Passport numbers, and GSTINs.
- Numerals in both ASCII and Devanagari Hindi script (`०-९`).
- Proactive warning banner on paste of sensitive data.
- (Optional Tier 3) Local Gemma Assist for unstructured human names and physical addresses.

### What SafeShield Does NOT Protect (Limitations)

- **Pattern-based detection**: Detection is heuristic and regular-expression based. Malformed numbers, unusual separators, or unstructured descriptions of personal data may be missed.
- **Hosted Cloud AI is intentionally blocked**: SafeShield NEVER talks to external hosted LLMs (no OpenAI, no Google Gemini API, no hosted Gemma API). Only local loopback Ollama is supported.
- **Platform scope**: The prototype currently targets ChatGPT web interfaces. Other AI platforms (Claude, Gemini, Copilot) are not intercepted by default.

---

## Optional: Local Gemma AI Assist (Names & Addresses)

SafeShield includes an **optional, disabled-by-default** local AI feature for detecting unstructured personal names and physical street addresses using a local Ollama instance running Gemma.

> **Privacy Rule**: The local AI assist talks ONLY to your local loopback (`http://localhost:11434` or `http://127.0.0.1:11434`). Hosted cloud APIs are deliberately not supported. Structured PII is always regex-redacted _before_ passing through local Gemma. If the model is offline or uninstalled, SafeShield falls back gracefully to regex pattern detection without blocking prompt submission.

### Setup Steps for Local Ollama:

1. Install [Ollama](https://ollama.com).
2. Pull the lightweight Gemma model:
   ```bash
   ollama pull gemma4:e2b
   ```
   _(Note: Check your exact installed model tag with `ollama list` and adjust in code if you use a different tag)._
3. On Windows, allow Chrome extension access to loopback Ollama:
   ```powershell
   setx OLLAMA_ORIGINS "chrome-extension://*"
   ```
4. Restart the Ollama service:
   Close Ollama from the Windows taskbar system tray and restart it from the Start menu.
5. In SafeShield's popup, toggle on **Local AI Assist (Names & Addresses)**.

---

## Installation & Setup

No build tools or bundlers are needed. Plain JavaScript runs directly in Chrome.

1. Clone or download this repository.
2. Open Google Chrome and enter `chrome://extensions/` in the URL address bar.
3. Toggle on **Developer mode** in the upper-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. Select the root folder of this project (`SafeShield`).
6. SafeShield will appear in your Chrome toolbar. Pin the extension for easy access.

---

## How to Test

### 1. Automated Unit Tests (Node >= 20)

Run the full automated test suite with Node's built-in test runner:

```bash
npm test
```

To run code formatting and linting:

```bash
npm run lint
```

### 2. Standalone UI Dev Harness (No ChatGPT needed)

You can test the preview modal, focus trapping, and warning banners in your browser without opening ChatGPT:

- In Chrome, open `file:///c:/Users/lucky/OneDrive/Desktop/SafeShield/src/ui/dev/preview-demo.html`
- Click buttons to trigger modals and test the `Send`, `Restore`, and `Cancel` flows.

### 3. End-to-End Testing on ChatGPT

Follow the detailed 5-step script in [`docs/demo-script.md`](docs/demo-script.md) using the verified fake test prompts in [`docs/test-prompts.md`](docs/test-prompts.md).

---

## DevTools Checklist: Verifying Selectors on ChatGPT

If ChatGPT updates its DOM layout, verify or update the selectors in `src/content/adapters/chatgpt.js` via Chrome DevTools:

1. Open `https://chatgpt.com` and open DevTools (**F12** or **Ctrl+Shift+I**).
2. Switch to the **Console** tab.
3. Test composer discovery:
   ```javascript
   const composer =
     document.querySelector('#prompt-textarea') ||
     document.querySelector('div[contenteditable="true"]');
   console.log('Composer found:', composer);
   ```
4. Test reading text from composer:
   ```javascript
   console.log('Composer text:', composer.innerText || composer.value);
   ```
5. Test send button discovery:
   ```javascript
   const sendBtn =
     document.querySelector('button[data-testid="send-button"]') ||
     document.querySelector('button[aria-label="Send prompt"]');
   console.log('Send button found:', sendBtn);
   ```
6. Check extension status from popup:
   Click the SafeShield icon; verify that the status badge turns green (**Active on this page**).

---

## Repository Structure

```text
SafeShield/
  manifest.json                         # MV3 Extension manifest
  package.json                          # Scripts for test (node --test) and lint
  README.md                             # Documentation & instructions
  AGENTS.md                             # Instructions for AI assistants
  docs/
    contracts.md                        # Authoritative component contracts
    demo-script.md                      # 5-step demonstration script
    test-prompts.md                     # Synthetic test prompts
  assets/icons/                         # Extension icons (16, 48, 128 px)
  src/
    shared/
      constants.js                      # PII types, storage keys, placeholder generator
      storage.js                        # chrome.storage.local wrapper with in-memory fallback
      vault.js                          # Ephemeral in-memory entity vault
    core/
      validators.js                     # Verhoeff checksum, Aadhaar, PAN, Devanagari
      patterns.js                       # RegEx patterns for Tier 1 PII types
      detector.js                       # Multi-pattern detection & overlap resolver
      redactor.js                       # Redaction & round-trip restoration engine
    content/
      adapters/chatgpt.js               # ChatGPT DOM selectors & fallbacks
      composer.js                       # Composer read/write and submit adapter
      interceptor.js                    # Capture-phase submission interceptor
      main.js                           # SPA observer & status responder
    ui/
      shared.css                        # Design tokens, color palette, dark mode
      popup/                            # Toolbar popup interface
      overlay/                          # Shadow DOM preview modal & warning banner
      dev/preview-demo.html             # Standalone UI testing harness
    dashboard/                          # Privacy dashboard (options page)
    background/
      service-worker.js                 # MV3 background badge manager
  tests/                                # Automated node --test suites
```
