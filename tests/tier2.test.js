const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
require('../src/shared/constants.js');
require('../src/core/validators.js');
require('../src/core/patterns.js');
const detector = require('../src/core/detector.js');

test('Tier 2: IFSC code detection', () => {
  const text = 'Transfer funds to IFSC SBIN0001234 or HDFC0000456.';
  const matches = detector.detect(text);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].type, 'IFSC');
  assert.equal(matches[0].value, 'SBIN0001234');
  assert.equal(matches[1].type, 'IFSC');
  assert.equal(matches[1].value, 'HDFC0000456');
});

test('Tier 2: UPI ID detection vs Email distinction', () => {
  const text = 'Pay via UPI rohit@okhdfcbank or merchant@paytm. Email us at support@example.com.';
  const matches = detector.detect(text);
  assert.equal(matches.length, 3);
  assert.equal(matches[0].type, 'UPI');
  assert.equal(matches[0].value, 'rohit@okhdfcbank');
  assert.equal(matches[1].type, 'UPI');
  assert.equal(matches[1].value, 'merchant@paytm');
  assert.equal(matches[2].type, 'EMAIL');
  assert.equal(matches[2].value, 'support@example.com');
});

test('Tier 2: PIN code only detected near keywords', () => {
  const textWithKeyword = 'Deliver to Bengaluru, pincode 560001.';
  const matchesWithKey = detector.detect(textWithKeyword);
  assert.equal(matchesWithKey.length, 1);
  assert.equal(matchesWithKey[0].type, 'PINCODE');
  assert.equal(matchesWithKey[0].value, '560001');

  // Random 6-digit number without keyword should NOT be flagged as PINCODE
  const textWithoutKey = 'Transaction reference was 560001 yesterday.';
  const matchesWithoutKey = detector.detect(textWithoutKey);
  assert.equal(matchesWithoutKey.length, 0);
});

test('Tier 2: DOB, Voter ID, Passport, and GSTIN detection', () => {
  const dobText = 'My DOB: 15/08/1995 and Voter ID: ABC1234567.';
  const m1 = detector.detect(dobText);
  assert.equal(m1.length, 2);
  assert.equal(m1[0].type, 'DOB');
  assert.equal(m1[0].value, '15/08/1995');
  assert.equal(m1[1].type, 'VOTER_ID');
  assert.equal(m1[1].value, 'ABC1234567');

  const gstinText = 'Company GSTIN: 29ABCPA1234Z1Z5 and passport no: A1234567.';
  const m2 = detector.detect(gstinText);
  assert.equal(m2.length, 2);
  assert.equal(m2[0].type, 'GSTIN');
  assert.equal(m2[0].value, '29ABCPA1234Z1Z5');
  assert.equal(m2[1].type, 'PASSPORT');
  assert.equal(m2[1].value, 'A1234567');
});
