# SafeShield Component Contracts

These contracts are the authoritative specification for all components in SafeShield. Treat them as law.

---

## 1. Core Detection & Redaction

### `detect(text) -> [{ type, start, end, value }]`

- **Input**: `text` (string).
- **Output**: Array of match objects `{ type, start, end, value }`.
- **Invariants**:
  - Sorted by `start` ascending.
  - Non-overlapping: for all consecutive matches $i$ and $i+1$, `matches[i].end <= matches[i+1].start`.
  - Offsets (`start`, `end`) are character indices valid directly on the **original** `text`.
  - `value` is the exact slice of the original text: `text.slice(start, end) === value`.
  - Validated matches only (e.g. Verhoeff checksum for Aadhaar, structure for PAN).
  - Higher-priority matches take precedence when overlapping (e.g., valid Aadhaar wins over phone on matching digits).

### `redact(text) -> { redactedText, entities: [{ placeholder, type, original }], counts: { [type]: count } }`

- **Input**: `text` (string).
- **Output**:
  - `redactedText`: string with sensitive values replaced by placeholders `[TYPE_n]`.
  - `entities`: array of distinct detected entities `[{ placeholder, type, original }]`.
  - `counts`: map of occurrences per PII type `{ PHONE: n, EMAIL: m, ... }`.
- **Invariants**:
  - Same `(type, original)` always receives the exact same placeholder.
  - Numbering starts at `1` per type (e.g., `[PHONE_1]`, `[PHONE_2]`, `[EMAIL_1]`).
  - `entities` contains one entry per distinct `(type, original)` pair.
  - `counts` reflects total occurrence count (including repeated appearances).
  - Replacements are made from the end of the string backward so preceding offsets remain valid.

### `restore(text, entities) -> string`

- **Round-trip guarantee**:
  ```javascript
  restore(redact(x).redactedText, entities) === x;
  ```
- **Input**: `text` (string with placeholders) and `entities` (array of `{ placeholder, original }`).
- **Output**: string with all known placeholders restored to their corresponding original values.

---

## 2. Storage & Vault

### Storage API (`SafeShield.storage`)

Asynchronous layer over `chrome.storage.local` with an automatic in-memory fallback for Node environments:

- `getEnabled() -> Promise<boolean>` (default: `true`)
- `setEnabled(bool) -> Promise<void>`
- `getStats() -> Promise<{ [type]: number }>` (default: `{}`)
- `addCounts(counts) -> Promise<{ [type]: number }>` (increments per-type counts in storage)
- `resetStats() -> Promise<void>` (clears stats back to `{}`)
- `onChange(callback) -> () => void` (unsubscribes; callback receives `{ key, newValue, oldValue }`, fires only for `enabled` and `stats`)

### Vault API (`SafeShield.vault`)

Ephemeral, in-memory placeholder mapping living in content-script memory only (never written to storage or disk, cleared on `pagehide`):

- `remember(entities)`: merges an array of `{ placeholder, type, original }` into the in-memory map.
- `all()`: returns a copy of current remembered entities.
- `clear()`: clears the in-memory map.

---

## 3. Modal & UI Overlay

### Modal API (`src/ui/overlay/preview-modal.js`, attached to `SafeShield.modal`)

- `show({ originalText, redactedText, entities, counts }) -> Promise<{ action: 'send' | 'restore' | 'cancel' }>`
  - Rendered inside a Shadow DOM so the host page styles cannot tamper with it.
  - Shows entity type, placeholder, and masked value (first 2 and last 2 characters only, rest masked with `*`).
  - Shows redacted text preview.
  - Action buttons:
    - **Send redacted**: releases redacted prompt to the host platform.
    - **Restore original**: replaces composer text with original for editing; does NOT send.
    - **Cancel**: leaves text in composer; does NOT send.
  - Keyboard accessible: `Escape` cancels; focus is trapped within modal while open and restored to composer on close.
- `warn(message) -> void`
  - Displays a blocking notification banner (e.g. "Send blocked: protection could not run").

---

## 4. Platform Status & Message Passing

### Status Request (`SS_GET_STATUS`)

- Content script listens for `chrome.runtime.onMessage` with `{ type: 'SS_GET_STATUS' }`.
- Responds with `{ state: 'active' | 'off' | 'unsupported' | 'error' }`.
- **Honest status guarantee**:
  - Returns `'active'` ONLY if protection is enabled AND the composer is found in DOM AND interception hooks are attached.
  - Returns `'off'` if user toggled protection off.
  - Returns `'unsupported'` if composer is not found or unsupported URL.
  - Returns `'error'` if an initialization or runtime fault occurred.
- **Privacy constraint**: NO prompt text, detected values, or entities in any message.
