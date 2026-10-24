const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
const modal = require('../src/ui/overlay/preview-modal.js');

test('modal maskValue preserves first 2 and last 2 characters only', () => {
  const mask = modal._maskValue;

  // 10-digit phone
  const maskedPhone = mask('+91 98765 43210');
  assert.ok(maskedPhone.startsWith('+9'));
  assert.ok(maskedPhone.endsWith('10'));
  assert.ok(maskedPhone.includes('•'));
  assert.ok(!maskedPhone.includes('98765'));

  // 10-character PAN
  const maskedPan = mask('ABCPA1234Z');
  assert.ok(maskedPan.startsWith('AB'));
  assert.ok(maskedPan.endsWith('4Z'));
  assert.ok(!maskedPan.includes('CPA123'));

  // Short strings <= 4 chars
  assert.equal(mask('abcd'), 'a••d');
  assert.equal(mask('ab'), '••••');
  assert.equal(mask(''), '');
  assert.equal(mask(null), '');
});
