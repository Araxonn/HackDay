const test = require('node:test');
const assert = require('node:assert/strict');

// Ensure clean environment
delete globalThis.SafeShield;
require('../src/shared/constants.js');
const storage = require('../src/shared/storage.js');

test('storage defaults: enabled is true, stats is empty object', async () => {
  const enabled = await storage.getEnabled();
  assert.equal(enabled, true);

  const stats = await storage.getStats();
  assert.deepEqual(stats, {});
});

test('storage setEnabled and onChange', async () => {
  const events = [];
  const unsubscribe = storage.onChange((e) => events.push(e));

  await storage.setEnabled(false);
  assert.equal(await storage.getEnabled(), false);

  await storage.setEnabled(true);
  assert.equal(await storage.getEnabled(), true);

  unsubscribe();
  await storage.setEnabled(false);

  // Should have recorded exactly two events before unsubscribe
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], { key: 'enabled', newValue: false, oldValue: true });
  assert.deepEqual(events[1], { key: 'enabled', newValue: true, oldValue: false });

  // Reset back to true for other tests
  await storage.setEnabled(true);
});

test('storage addCounts accumulates counts and notifies listeners', async () => {
  await storage.resetStats();
  const initial = await storage.getStats();
  assert.deepEqual(initial, {});

  const statEvents = [];
  const unsub = storage.onChange((e) => {
    if (e.key === 'stats') statEvents.push(e);
  });

  const res1 = await storage.addCounts({ PHONE: 2, EMAIL: 1 });
  assert.deepEqual(res1, { PHONE: 2, EMAIL: 1 });

  const res2 = await storage.addCounts({ PHONE: 1, AADHAAR: 3 });
  assert.deepEqual(res2, { PHONE: 3, EMAIL: 1, AADHAAR: 3 });

  const current = await storage.getStats();
  assert.deepEqual(current, { PHONE: 3, EMAIL: 1, AADHAAR: 3 });

  await storage.resetStats();
  assert.deepEqual(await storage.getStats(), {});

  unsub();
  assert.ok(statEvents.length >= 3);
});
