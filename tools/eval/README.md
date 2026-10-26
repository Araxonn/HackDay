# Accuracy evaluation

Measures how well `detect()` finds personal data. It only reads; it changes nothing.

Run: `node tools/eval/run-eval.js` (add `--show-holdout` to see holdout mistakes, `--json` for machine output, `--min-f1=0.90` to exit 1 if dev F1 is lower).

## How the test set works

`dataset.json` holds one case per line. Text is a template; tokens mark the correct answers.

- `[[TYPE:value]]` : this value IS personal data of that type (the correct answer).
- `[[RAW:value]]` : plain text that must NOT be detected.
- `gen:<11 digits>` : generates a valid Aadhaar (Verhoeff). `bad:<11 digits>` : generates a 12-digit number with a wrong check digit.
- Modifiers: `~spaced`, `~hyphen`, `~deva` (Devanagari digits). Example: `[[AADHAAR:gen:49876543210~spaced]]`.
- Text with no tokens must produce zero detections.
- A match counts only if type, start and end all equal the correct answer.

## Groups

- `dev`: use these to find and fix mistakes.
- `holdout`: never tune on these. Mistakes stay hidden unless you pass `--show-holdout`.

## Adding cases

Append new lines only. Use fake or generated values. Never remove a case to make a score look better.
