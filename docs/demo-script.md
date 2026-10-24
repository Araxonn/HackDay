# SafeShield 5-Step Demo Script

Follow this step-by-step walk-through to test or demonstrate SafeShield end-to-end on ChatGPT (`chatgpt.com`).

---

### Prerequisites

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in upper right).
4. Click **Load unpacked** and select the root directory of this repository (`SafeShield`).
5. Open [chatgpt.com](https://chatgpt.com) and sign in or start a new conversation.

---

### Step 1: Paste Prompt with Synthetic PII

In ChatGPT's prompt composer at the bottom of the page, paste the following prompt containing synthetic Indian identifiers:

```text
Please summarize this profile: Name Raj, email raj.kumar@example.com, phone +91 98765 43210, PAN ABCPA1234Z, and Aadhaar 2098 7654 3212.
```

Press **Enter** (or click the Send button).

---

### Step 2: Review Detection Preview Modal

Notice that the submission is **immediately intercepted** before any network request is initiated.

- An isolated Shadow DOM modal titled **SafeShield Protection** appears.
- Review the detected identifiers list:
  - `PHONE`: `[PHONE_1]` with masked value `+9••••••10`
  - `EMAIL`: `[EMAIL_1]` with masked value `ra••••••om`
  - `PAN`: `[PAN_1]` with masked value `AB••••••4Z`
  - `AADHAAR`: `[AADHAAR_1]` with masked value `20••••••12`
- Review the **Redacted Prompt Preview** box displaying the prompt text with safe typed placeholders substituted.

---

### Step 3: Send Redacted Prompt to ChatGPT

1. Click the green **Send redacted** button in the modal.
2. Observe ChatGPT's chat stream:
   - ChatGPT receives ONLY the redacted prompt containing `[EMAIL_1]`, `[PHONE_1]`, `[PAN_1]`, and `[AADHAAR_1]`.
   - Your sensitive identifiers never leave your browser or touch OpenAI's servers.
3. Check the SafeShield extension icon in the Chrome toolbar:
   - Notice the badge count incrementing to reflect the newly protected items.

---

### Step 4: Test Local Restoration

1. Paste another test prompt into ChatGPT:
   ```text
   Contact priya.sharma@example.in or 9876543210 to reschedule.
   ```
2. Press **Enter**.
3. In the preview modal, click **Restore original**.
4. Observe the result:
   - The submission is blocked and not sent.
   - The original text with full numbers and email is restored directly into the composer so you can edit it locally.

---

### Step 5: Toggle Protection & Explore Privacy Dashboard

1. Click the **SafeShield extension icon** in the Chrome toolbar to open the popup:
   - Confirm status shows **Active on this page** (green indicator).
   - See the live breakdown of protected items.
2. Toggle the protection switch **Off**:
   - Status updates instantly to **Protection paused** (grey indicator).
   - Try typing a message in ChatGPT — submissions proceed directly without interception.
3. Toggle the protection switch back **On**:
   - Status returns to **Active on this page**.
4. Click **Privacy Dashboard** at the bottom of the popup (or right-click extension icon -> Options):
   - Review total protected items.
   - Observe visual percentage progress bars for Phone, Email, Aadhaar, and PAN.
   - Read the local-first privacy statement.
   - Optionally click **Reset statistics** to verify the reset confirmation dialog.
