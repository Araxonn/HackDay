const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
const validators = require('../src/core/validators.js');

// Verhoeff helper for test generation
function makeTestAadhaar(prefix11) {
  const check = validators.verhoeffGenerate(prefix11);
  return `${prefix11}${check}`;
}

test('verhoeff checksum validates generated digits and rejects tampered ones', () => {
  const prefix = '23456789012';
  const valid = makeTestAadhaar(prefix);
  assert.equal(validators.verhoeff(valid), true);

  // Tamper last digit
  const badCheck = (Number(valid[11]) + 1) % 10;
  const tampered = `${prefix}${badCheck}`;
  assert.equal(validators.verhoeff(tampered), false);

  // Transpose adjacent digits
  const transposed = `${valid.slice(0, 4)}${valid[5]}${valid[4]}${valid.slice(6)}`;
  assert.equal(validators.verhoeff(transposed), false);
});

test('isValidAadhaar accepts valid 12-digit numbers starting 2-9', () => {
  const validNum = makeTestAadhaar('54321678901');
  assert.equal(validators.isValidAadhaar(validNum), true);
  // With space grouping
  assert.equal(
    validators.isValidAadhaar(
      `${validNum.slice(0, 4)} ${validNum.slice(4, 8)} ${validNum.slice(8)}`,
    ),
    true,
  );
  // With hyphen grouping
  assert.equal(
    validators.isValidAadhaar(
      `${validNum.slice(0, 4)}-${validNum.slice(4, 8)}-${validNum.slice(8)}`,
    ),
    true,
  );
});

test('isValidAadhaar rejects false positives (starting 0 or 1, wrong length)', () => {
  // NOTE: Verhoeff checksum is intentionally NOT enforced — safer to over-redact.
  // A 12-digit number starting 2-9 IS accepted regardless of checksum.
  assert.equal(validators.isValidAadhaar('234567890123'), true); // structurally valid
  // Starting with 0 or 1 — still rejected
  const startsZero = makeTestAadhaar('01234567890');
  assert.equal(validators.isValidAadhaar(startsZero), false);
  const startsOne = makeTestAadhaar('12345678901');
  assert.equal(validators.isValidAadhaar(startsOne), false);
  // Wrong length
  assert.equal(validators.isValidAadhaar('2345678901'), false);
  assert.equal(validators.isValidAadhaar('2345678901234'), false);
  assert.equal(validators.isValidAadhaar(''), false);
  assert.equal(validators.isValidAadhaar(null), false);
});

test('isValidPAN validates uppercase 10-char format with valid 4th letter', () => {
  // Valid 4th letters: A, B, C, F, G, H, L, J, P, T
  assert.equal(validators.isValidPAN('ABCPA1234Z'), true); // P = Individual
  assert.equal(validators.isValidPAN('XYZCA9876Q'), true); // C = Company
  assert.equal(validators.isValidPAN('AAAFB1111A'), true); // F = Firm
  assert.equal(validators.isValidPAN('ZZZTA9999Z'), true); // T = Trust
});

test('isValidPAN rejects invalid PANs (lowercase, invalid 4th letter, malformed)', () => {
  // Lowercase
  assert.equal(validators.isValidPAN('abcpa1234z'), false);
  // Invalid 4th letter 'D' (not in ABCFGHLJPT)
  assert.equal(validators.isValidPAN('ABCDA1234Z'), false);
  // Invalid 4th letter 'E'
  assert.equal(validators.isValidPAN('ABCEA1234Z'), false);
  // Missing digits or letters
  assert.equal(validators.isValidPAN('ABCPA123Z'), false);
  assert.equal(validators.isValidPAN('ABCPA12345'), false);
  assert.equal(validators.isValidPAN('12345ABCDE'), false);
  assert.equal(validators.isValidPAN(''), false);
});

test('normalizeDigits preserves length and maps Devanagari numerals to ASCII', () => {
  const devanagari = 'फोन: ९८७६५४३२१०, आधार: २३४५६७८९०१२';
  const normalized = validators.normalizeDigits(devanagari);
  assert.equal(devanagari.length, normalized.length);
  assert.ok(normalized.includes('9876543210'));
  assert.ok(normalized.includes('23456789012'));

  // All 10 digits
  assert.equal(validators.normalizeDigits('०१२३४५६७८९'), '0123456789');
  // Mixed text
  assert.equal(validators.normalizeDigits('Hello 123'), 'Hello 123');
  assert.equal(validators.normalizeDigits(''), '');
});
