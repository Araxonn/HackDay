# Member 3 changelog

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
