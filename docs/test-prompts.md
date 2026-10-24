# SafeShield Test Prompts (100% Synthetic Fake Data)

Use these test prompts to safely evaluate SafeShield's interception, redaction, and local restoration flows on ChatGPT or in the local dev harness (`src/ui/dev/preview-demo.html`).

> **Privacy Notice**: All identifiers below are strictly synthetic and generated for testing purposes only. Aadhaar numbers use a Verhoeff checksum generator on synthetic prefixes. Emails use the reserved `example.com` / `example.in` domains.

---

### Prompt 1: Job Application & Resume Review (All 4 Tier 1 Types)

```text
Please review and improve my resume summary:
I am an IT professional located in Bengaluru. Contact details:
- Email: rahul.verma@example.com
- Mobile: +91 98765 43210
- Identity PAN: ABCPA1234Z
- Aadhaar UID: 2098 7654 3212

Please suggest five punchy bullet points highlighting cloud migration skills.
```

**Expected Entities**:

- `[EMAIL_1]` -> `rahul.verma@example.com`
- `[PHONE_1]` -> `+91 98765 43210`
- `[PAN_1]` -> `ABCPA1234Z`
- `[AADHAAR_1]` -> `2098 7654 3212`

---

### Prompt 2: Hinglish Support Escalation (Phone & Email)

```text
Mera account login issue aa raha hai. Mera registered mobile number 9876543210 hai aur backup email priya.sharma@example.in hai. Please draft a formal escalation message for customer support.
```

**Expected Entities**:

- `[PHONE_1]` -> `9876543210`
- `[EMAIL_1]` -> `priya.sharma@example.in`

---

### Prompt 3: Financial & Tax Filing Query (Aadhaar & PAN)

```text
I am preparing my ITR form. For verification, my details are recorded as PAN: BNZPK1234A and Aadhaar number: 3123-4567-8909. Can you explain whether section 80C deductions apply to tax saver fixed deposits?
```

**Expected Entities**:

- `[PAN_1]` -> `BNZPK1234A`
- `[AADHAAR_1]` -> `3123-4567-8909`

---

### Prompt 4: Repeated Identifiers & Multi-item List (Placeholder Stability)

```text
Client confirmation memo:
Primary contact: amit@example.com, Phone: +91 91234 56789.
Aadhaar verified: 498712345679.
If amit@example.com is unreachable, send SMS confirmation to +91 91234 56789.
Secondary contact: hr@example.com, PAN: XYZCA9876Q, Secondary Aadhaar: 587654321092.
```

**Expected Entities**:

- `[EMAIL_1]` -> `amit@example.com` (occurs twice, same placeholder `[EMAIL_1]`)
- `[PHONE_1]` -> `+91 91234 56789` (occurs twice, same placeholder `[PHONE_1]`)
- `[AADHAAR_1]` -> `498712345679`
- `[EMAIL_2]` -> `hr@example.com`
- `[PAN_1]` -> `XYZCA9876Q`
- `[AADHAAR_2]` -> `587654321092`

---

### Prompt 5: Devanagari Hindi Script Numerals

```text
कृपया मेरे विवरण की जांच करें:
संपर्क नंबर: ९८७६५४३२१० (९८७६५४३२१०)
आधार संख्या: ६१२३९८७४५६११
ईमेल: dev.support@example.org
```

**Expected Entities**:

- `[PHONE_1]` -> `९८७६५४३२१०` (sliced from original Devanagari text)
- `[AADHAAR_1]` -> `६१२३९८७४५६११`
- `[EMAIL_1]` -> `dev.support@example.org`
