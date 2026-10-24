const test = require('node:test');
const assert = require('node:assert/strict');

delete globalThis.SafeShield;
const adapter = require('../src/content/adapters/chatgpt.js');
const composer = require('../src/content/composer.js');
require('../src/content/interceptor.js');
const main = require('../src/content/main.js');

test('chatgpt adapter matches only ChatGPT and OpenAI domains', () => {
  assert.equal(adapter.matches('https://chatgpt.com/c/12345'), true);
  assert.equal(adapter.matches('https://chat.openai.com/'), true);
  assert.equal(adapter.matches('https://subdomain.chatgpt.com/test'), true);

  // False matches
  assert.equal(adapter.matches('https://google.com/'), false);
  assert.equal(adapter.matches('https://claude.ai/chat'), false);
  assert.equal(adapter.matches('https://chatgpt.com.evil.com/'), false);
});

test('composer getText extracts value from mock elements', () => {
  // Textarea mock
  const textareaMock = { tagName: 'TEXTAREA', value: 'Hello world' };
  assert.equal(composer.getText(textareaMock), 'Hello world');

  // Contenteditable mock
  const ceMock = {
    tagName: 'DIV',
    isContentEditable: true,
    innerText: 'Line 1\nLine 2',
    getAttribute: () => 'true',
  };
  assert.equal(composer.getText(ceMock), 'Line 1\nLine 2');

  // Empty / null
  assert.equal(composer.getText(null), '');
});

test('main.getStatus implements honest status rules', () => {
  const interceptor = globalThis.SafeShield.interceptor;

  // 1. When protection is toggled off -> 'off'
  interceptor.setIsEnabled(false);
  assert.equal(main.getStatus(), 'off');

  // 2. When enabled but unsupported page or composer missing -> 'unsupported'
  interceptor.setIsEnabled(true);
  assert.equal(main.getStatus(), 'unsupported');
});
