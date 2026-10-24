const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
require('../src/shared/constants.js');
require('../src/core/validators.js');
require('../src/core/patterns.js');
require('../src/core/detector.js');
const redactor = require('../src/core/redactor.js');
const validators = globalThis.SafeShield.validators;

function generateAadhaar(prefix11) {
  return `${prefix11}${validators.verhoeffGenerate(prefix11)}`;
}

test('redactor assigns stable placeholders and accurate counts', () => {
  const aadhaar = generateAadhaar('23456789012');
  const text = `Contact user1@example.com or 9876543210. Repeat user1@example.com and call 9876543210 again. Aadhaar: ${aadhaar}.`;
  const result = redactor.redact(text);

  assert.equal(result.counts.EMAIL, 2);
  assert.equal(result.counts.PHONE, 2);
  assert.equal(result.counts.AADHAAR, 1);

  // Entities has distinct values
  assert.equal(result.entities.length, 3);
  const emailEnt = result.entities.find((e) => e.type === 'EMAIL');
  assert.equal(emailEnt.placeholder, '[EMAIL_1]');
  assert.equal(emailEnt.original, 'user1@example.com');

  const phoneEnt = result.entities.find((e) => e.type === 'PHONE');
  assert.equal(phoneEnt.placeholder, '[PHONE_1]');
  assert.equal(phoneEnt.original, '9876543210');

  // Same value got same placeholder in text
  assert.ok(result.redactedText.includes('Contact [EMAIL_1] or [PHONE_1]. Repeat [EMAIL_1] and call [PHONE_1] again.'));
  assert.ok(result.redactedText.includes('Aadhaar: [AADHAAR_1].'));
});

test('redactor numbering starts at 1 per type for different values', () => {
  const text = `Phones: 9876543210 and 9123456789. Emails: first@example.com, second@example.com.`;
  const result = redactor.redact(text);

  assert.equal(result.counts.PHONE, 2);
  assert.equal(result.counts.EMAIL, 2);

  const placeholders = result.entities.map((e) => e.placeholder);
  assert.ok(placeholders.includes('[PHONE_1]'));
  assert.ok(placeholders.includes('[PHONE_2]'));
  assert.ok(placeholders.includes('[EMAIL_1]'));
  assert.ok(placeholders.includes('[EMAIL_2]'));
});

test('restore round trip guarantee: restore(redact(x).redactedText, entities) === x', () => {
  const aadhaar1 = generateAadhaar('21111111111');
  const aadhaar2 = generateAadhaar('42222222222');
  const prompts = [
    `My PAN is ABCPA1234Z and email is hello@test.com. Call me at +91 98765 43210.`,
    `Aadhaar 1: ${aadhaar1}, Aadhaar 2: ${aadhaar2}. Repeat PAN ABCPA1234Z again!`,
    `Hinglish prompt: mera phone 9876543210 hai, send code to help@safe.in`,
    `Simple text with no sensitive data at all.`,
    `Devanagari phone ९८७६५४३२१० with email user@dev.org`,
  ];

  for (const originalPrompt of prompts) {
    const { redactedText, entities } = redactor.redact(originalPrompt);
    const restored = redactor.restore(redactedText, entities);
    assert.equal(restored, originalPrompt, `Failed round trip for: "${originalPrompt}"`);
  }
});

test('redactor handles edge cases: empty string, falsy, no matches', () => {
  assert.deepEqual(redactor.redact(''), { redactedText: '', entities: [], counts: {} });
  assert.deepEqual(redactor.redact(null), { redactedText: '', entities: [], counts: {} });
  assert.equal(redactor.restore('', []), '');
  assert.equal(redactor.restore('plain text', []), 'plain text');
});
