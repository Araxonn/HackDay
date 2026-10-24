const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
const vault = require('../src/shared/vault.js');

test('vault remember, all, and clear', () => {
  vault.clear();
  assert.deepEqual(vault.all(), []);

  const entities = [
    { placeholder: '[PHONE_1]', type: 'PHONE', original: '+91 98765 43210' },
    { placeholder: '[EMAIL_1]', type: 'EMAIL', original: 'user@example.com' },
  ];

  vault.remember(entities);
  assert.equal(vault.all().length, 2);
  assert.deepEqual(vault.all(), entities);

  // Updating or adding existing placeholder
  vault.remember([{ placeholder: '[PHONE_1]', type: 'PHONE', original: '+91 98765 43210' }]);
  assert.equal(vault.all().length, 2);

  vault.clear();
  assert.deepEqual(vault.all(), []);
});
