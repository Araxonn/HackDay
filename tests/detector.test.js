const test = require('node:test');
const assert = require('node:assert/strict');

// Ensure clean environment
delete globalThis.SafeShield;
require('../src/shared/constants.js');
require('../src/core/validators.js');
require('../src/core/patterns.js');
const detector = require('../src/core/detector.js');
const validators = globalThis.SafeShield.validators;

function generateAadhaar(prefix11) {
  return `${prefix11}${validators.verhoeffGenerate(prefix11)}`;
}

test('detector true positives: PHONE, EMAIL, AADHAAR, PAN', () => {
  const aadhaar = generateAadhaar('29876543210');
  const text = `Contact raj@example.com, phone +91 98765 43210, PAN ABCPA1234Z and Aadhaar ${aadhaar}.`;
  const matches = detector.detect(text);

  assert.equal(matches.length, 4);
  assert.equal(matches[0].type, 'EMAIL');
  assert.equal(matches[0].value, 'raj@example.com');
  assert.equal(matches[1].type, 'PHONE');
  assert.equal(matches[1].value, '+91 98765 43210');
  assert.equal(matches[2].type, 'PAN');
  assert.equal(matches[2].value, 'ABCPA1234Z');
  assert.equal(matches[3].type, 'AADHAAR');
  assert.equal(matches[3].value, aadhaar);
});

test('detector false positives: bad checksum Aadhaar, 10-digit starting 1-5, lowercase PAN', () => {
  // Bad checksum Aadhaar: 12 digits
  const badAadhaar = '298765432109'; // Ensure invalid checksum
  const badPhone = '1234567890'; // Starts with 1
  const badPhone2 = '5432167890'; // Starts with 5
  const lowercasePan = 'abcpa1234z';
  const invalidPan4th = 'ABCDA1234Z';

  const text = `Bad: ${badAadhaar}, phones ${badPhone} and ${badPhone2}, pans ${lowercasePan} and ${invalidPan4th}.`;
  const matches = detector.detect(text);

  assert.equal(matches.length, 0);
});

test('detector conflict resolution: valid Aadhaar beats phone on same digits', () => {
  // 12-digit number starting with 9 that passes Verhoeff
  const validAadhaar = generateAadhaar('98765432109');
  const text = `Aadhaar is ${validAadhaar}.`;
  const matches = detector.detect(text);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].type, 'AADHAAR');
  assert.equal(matches[0].value, validAadhaar);
});

test('detector handles Hinglish sentences and Devanagari numerals', () => {
  const phone = '9876543210';
  const textHinglish = `Mera number ${phone} hai aur email priya.sharma@example.in hai please call mat karna.`;
  const matches1 = detector.detect(textHinglish);

  assert.equal(matches1.length, 2);
  assert.equal(matches1[0].type, 'PHONE');
  assert.equal(matches1[0].value, phone);
  assert.equal(matches1[1].type, 'EMAIL');
  assert.equal(matches1[1].value, 'priya.sharma@example.in');

  // Devanagari numerals: फोन ९८७६५४३२१० (9876543210)
  const devanagariPhone = '९८७६५४३२१०';
  const textDevanagari = `मेरा संपर्क नंबर ${devanagariPhone} है।`;
  const matches2 = detector.detect(textDevanagari);

  assert.equal(matches2.length, 1);
  assert.equal(matches2[0].type, 'PHONE');
  // Value must be sliced from the ORIGINAL text
  assert.equal(matches2[0].value, devanagariPhone);
  assert.equal(
    textDevanagari.slice(matches2[0].start, matches2[0].end),
    devanagariPhone,
  );
});

test('detector handles empty and falsy input', () => {
  assert.deepEqual(detector.detect(''), []);
  assert.deepEqual(detector.detect(null), []);
  assert.deepEqual(detector.detect(undefined), []);
  assert.deepEqual(
    detector.detect('Plain text without any personal data.'),
    [],
  );
});

test('detector performance: 100k characters processed under 200ms', () => {
  const aadhaar = generateAadhaar('34567890123');
  const block = `Lorem ipsum dolor sit amet, email contact@example.com, phone 9876543210, Aadhaar ${aadhaar}, PAN ABCPA1234Z. Consectetur adipiscing elit. `;
  // 100k characters is roughly 800 repetitions of ~150 chars
  const largeText = block.repeat(800);
  assert.ok(largeText.length >= 100000, `Text length was ${largeText.length}`);

  const start = performance.now();
  const matches = detector.detect(largeText);
  const elapsed = performance.now() - start;

  assert.ok(matches.length > 0);
  assert.ok(
    elapsed < 200,
    `Execution took ${elapsed.toFixed(2)}ms (expected < 200ms)`,
  );
});
