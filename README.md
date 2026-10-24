# SafeShield 🛡️

> **Zero-dependency, local-first Manifest V3 Chrome extension that detects and redacts personal data locally BEFORE a prompt is sent to AI chat platforms.**

Supported platform for prototype: **ChatGPT** (`chatgpt.com` and `chat.openai.com`), with focus on **Indian identifiers**.

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
