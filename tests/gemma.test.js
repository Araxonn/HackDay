const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
const gemma = require('../src/ai/gemma.js');

test('assertLoopback accepts localhost and 127.0.0.1 and rejects all other hosts', () => {
  assert.equal(gemma.assertLoopback('http://localhost:11434'), true);
  assert.equal(gemma.assertLoopback('http://127.0.0.1:11434/'), true);
  assert.equal(gemma.assertLoopback('http://localhost:8080/api/chat'), true);

  // Lookalike domains must throw
  assert.throws(() => gemma.assertLoopback('http://localhost.evil.com:11434'));
  assert.throws(() => gemma.assertLoopback('http://127.0.0.1.attacker.org'));
  assert.throws(() => gemma.assertLoopback('http://example.com:11434'));
  // HTTPS is rejected (Ollama runs on plain HTTP locally; prevent external tunneling tricks)
  assert.throws(() => gemma.assertLoopback('https://localhost:11434'));
  assert.throws(() => gemma.assertLoopback('invalid-url'));
});

test('extractSpans keeps only valid literal spans without square brackets', () => {
  const sourceText =
    'Hello my name is Ramesh Kumar and I live at Indiranagar Bengaluru.';
  const rawSpans = [
    { type: 'NAME', text: 'Ramesh Kumar' },
    { type: 'ADDRESS', text: 'Indiranagar Bengaluru' },
    { type: 'NAME', text: 'NonExistent Person' }, // not in text
    { type: 'NAME', text: 'R' }, // too short (< 2 chars)
    { type: 'NAME', text: '[PHONE_1]' }, // contains square brackets
    { type: 'NAME', text: 'Ramesh Kumar' }, // duplicate
  ];

  const filtered = gemma.extractSpans(sourceText, rawSpans);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].text, 'Indiranagar Bengaluru'); // longest first
  assert.equal(filtered[1].text, 'Ramesh Kumar');
});

test('classify with injected fake fetch: successful classification', async () => {
  const fakeFetch = async (url, options) => {
    assert.ok(url.includes('/api/chat'));
    const parsedBody = JSON.parse(options.body);
    assert.equal(parsedBody.stream, false);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        message: {
          content: JSON.stringify({
            spans: [
              { type: 'NAME', text: 'Aarav Gupta' },
              { type: 'ADDRESS', text: 'Koramangala 4th Block' },
            ],
          }),
        },
      }),
    };
  };

  const text =
    'Profile for Aarav Gupta at Koramangala 4th Block with ID [PAN_1].';
  const result = await gemma.classify(text, {}, fakeFetch);

  assert.equal(result.ok, true);
  assert.equal(result.spans.length, 2);
  assert.equal(result.spans[0].text, 'Koramangala 4th Block');
  assert.equal(result.spans[1].text, 'Aarav Gupta');
});

test('classify accepts fenced JSON containing an address span', async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      message: {
        content:
          '```json\n{"spans":[{"type":"ADDRESS","text":"42 Green Park Lane"}]}\n```',
      },
    }),
  });

  const result = await gemma.classify(
    'Deliver the file to 42 Green Park Lane today.',
    {},
    fakeFetch,
  );

  assert.deepEqual(result, {
    ok: true,
    spans: [{ type: 'ADDRESS', text: '42 Green Park Lane' }],
  });
});

test('classify error mappings: timeout, 404 model-missing, 403 forbidden', async () => {
  // 404 model missing
  const fetch404 = async () => ({ ok: false, status: 404 });
  const res404 = await gemma.classify('test text', {}, fetch404);
  assert.deepEqual(res404, { ok: false, error: 'model-missing' });

  // 403 forbidden
  const fetch403 = async () => ({ ok: false, status: 403 });
  const res403 = await gemma.classify('test text', {}, fetch403);
  assert.deepEqual(res403, { ok: false, error: 'forbidden' });

  // Timeout (AbortError)
  const fetchTimeout = async () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  };
  const resTimeout = await gemma.classify('test text', {}, fetchTimeout);
  assert.deepEqual(resTimeout, { ok: false, error: 'timeout' });
});

test('ping returns models list on success', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      models: [{ name: 'gemma4:e2b' }, { name: 'llama3:latest' }],
    }),
  });

  const res = await gemma.ping('http://localhost:11434', fakeFetch);
  assert.equal(res.ok, true);
  assert.deepEqual(res.models, ['gemma4:e2b', 'llama3:latest']);
});
