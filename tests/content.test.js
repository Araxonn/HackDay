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

// Minimal fake DOM node for selector hierarchy tests
class FakeNode {
  constructor(tagName, attrs = {}, children = []) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attrs));
    this.children = [];
    this.parentNode = null;
    this.isConnected = true;
    this.disabled = Boolean(attrs.disabled);
    this.readOnly = Boolean(attrs.readonly);
    this.hidden = Boolean(attrs.hidden);
    this.id = attrs.id || '';
    this.className = attrs.class || '';
    this.value = attrs.value || '';
    this.textContent = attrs.textContent || '';
    this.isContentEditable =
      attrs.contenteditable === 'true' || attrs.contenteditable === '';
    this.listeners = new Map();

    for (const child of children) {
      this.appendChild(child);
    }
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.listeners.has(type)) return;
    const list = this.listeners.get(type).filter((l) => l !== listener);
    this.listeners.set(type, list);
  }

  dispatchEvent(evt) {
    const list = this.listeners.get(evt.type) || [];
    for (const l of list) {
      l(evt);
    }
  }

  getAttribute(name) {
    if (this.attributes.has(name)) {
      return this.attributes.get(name);
    }
    if (name === 'id' && this.id) return this.id;
    if (name === 'class' && this.className) return this.className;
    if (name === 'contenteditable' && this.isContentEditable) return 'true';
    return null;
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
    if (name === 'id') this.id = String(val);
    if (name === 'class') this.className = String(val);
    if (name === 'contenteditable') {
      this.isContentEditable = val === 'true' || val === '';
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matchesSelector && curr.matchesSelector(selector)) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  matchesSelector(selector) {
    if (!selector) return false;
    const s = selector.trim();

    if (s === '#prompt-textarea') {
      return (
        this.id === 'prompt-textarea' ||
        this.getAttribute('id') === 'prompt-textarea'
      );
    }
    if (s === 'div.ProseMirror[contenteditable="true"]') {
      return (
        this.tagName === 'DIV' &&
        this.className.includes('ProseMirror') &&
        (this.getAttribute('contenteditable') === 'true' ||
          this.isContentEditable)
      );
    }
    if (s === '[contenteditable="true"][role="textbox"]') {
      return (
        (this.getAttribute('contenteditable') === 'true' ||
          this.isContentEditable) &&
        this.getAttribute('role') === 'textbox'
      );
    }
    if (s === 'form [contenteditable="true"]') {
      const isCE =
        this.getAttribute('contenteditable') === 'true' ||
        this.isContentEditable;
      let p = this.parentNode;
      let inForm = false;
      while (p) {
        if (p.tagName === 'FORM') {
          inForm = true;
          break;
        }
        p = p.parentNode;
      }
      return isCE && inForm;
    }
    if (s === 'form textarea') {
      if (this.tagName !== 'TEXTAREA') return false;
      let p = this.parentNode;
      let inForm = false;
      while (p) {
        if (p.tagName === 'FORM') {
          inForm = true;
          break;
        }
        p = p.parentNode;
      }
      return inForm;
    }
    if (s === 'button[data-testid="send-button"]') {
      return (
        this.tagName === 'BUTTON' &&
        this.getAttribute('data-testid') === 'send-button'
      );
    }
    if (s === 'button[aria-label*="Send" i]') {
      return (
        this.tagName === 'BUTTON' &&
        /send/i.test(this.getAttribute('aria-label') || '')
      );
    }
    if (s === 'form button[type="submit"]') {
      if (this.tagName !== 'BUTTON') return false;
      if (this.getAttribute('type') !== 'submit') return false;
      let p = this.parentNode;
      while (p) {
        if (p.tagName === 'FORM') return true;
        p = p.parentNode;
      }
      return false;
    }
    if (s.includes('button[type="submit"]')) {
      return (
        this.tagName === 'BUTTON' && this.getAttribute('type') === 'submit'
      );
    }
    if (s === 'button' || s === 'form button') {
      return this.tagName === 'BUTTON';
    }
    return false;
  }

  querySelectorAll(selector) {
    const results = [];
    function traverse(node) {
      for (const child of node.children) {
        if (child.matchesSelector && child.matchesSelector(selector)) {
          results.push(child);
        }
        traverse(child);
      }
    }
    traverse(this);
    return results;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }
}

test('ProseMirror contenteditable composer found', () => {
  const doc = new FakeNode('DOCUMENT', {}, [
    new FakeNode('DIV', { class: 'ProseMirror', contenteditable: 'true' }),
  ]);
  const found = adapter.findComposer(doc);
  assert.ok(found, 'Should find ProseMirror contenteditable composer');
  assert.equal(found.className, 'ProseMirror');
});

test('textarea fallback inside form', () => {
  const textarea = new FakeNode('TEXTAREA', { name: 'prompt' });
  const doc = new FakeNode('DOCUMENT', {}, [
    new FakeNode('FORM', {}, [textarea]),
  ]);
  const found = adapter.findComposer(doc);
  assert.ok(found, 'Should find fallback textarea in form');
  assert.equal(found.tagName, 'TEXTAREA');
});

test('no composer gives unsupported with reason composer-not-found', () => {
  const interceptor = globalThis.SafeShield.interceptor;
  interceptor.setIsEnabled(true);
  const origFindComposer = adapter.findComposer;
  adapter.findComposer = () => null;
  adapter.matches = () => true;

  try {
    assert.equal(main.getStatus(), 'unsupported');
    assert.equal(main.getStatusWithReason().reason, 'composer-not-found');
  } finally {
    adapter.findComposer = origFindComposer;
  }
});

test('composer found but no Send button yet still gives active', () => {
  const interceptor = globalThis.SafeShield.interceptor;
  interceptor.setIsEnabled(true);
  const fakeComposer = new FakeNode('DIV', {
    class: 'ProseMirror',
    contenteditable: 'true',
  });
  // Empty document without send button, only composer
  const doc = new FakeNode('DOCUMENT', {}, [fakeComposer]);

  const origDoc = globalThis.document;
  globalThis.document = doc;

  const origFindComposer = adapter.findComposer;
  const origFindSend = adapter.findSendButton;
  adapter.findComposer = () => fakeComposer;
  adapter.matches = () => true;

  try {
    interceptor.attachHooks(fakeComposer, adapter);
    // Send button does NOT exist yet
    const sendBtn = adapter.findSendButton(doc, fakeComposer);
    assert.equal(sendBtn, null, 'Send button should not exist yet');

    // Status MUST still be active
    assert.equal(
      main.getStatus(),
      'active',
      'Status must be active even without send button',
    );
    assert.equal(main.getStatusWithReason().reason, 'active');
  } finally {
    adapter.findComposer = origFindComposer;
    adapter.findSendButton = origFindSend;
    if (origDoc !== undefined) {
      globalThis.document = origDoc;
    } else {
      delete globalThis.document;
    }
  }
});

test('Send button appearing later is found at click time', () => {
  const form = new FakeNode('FORM');
  const composerEl = new FakeNode('DIV', {
    id: 'prompt-textarea',
    contenteditable: 'true',
  });
  form.appendChild(composerEl);
  const doc = new FakeNode('DOCUMENT', {}, [form]);

  // Initially: only voice button present
  const voiceBtn = new FakeNode('BUTTON', {
    'data-testid': 'fruitjuice-send-button',
    'aria-label': 'Start voice mode',
  });
  form.appendChild(voiceBtn);

  assert.equal(
    adapter.findSendButton(doc, composerEl),
    null,
    'Voice button must not be matched as send button',
  );

  // User types text -> ChatGPT removes voice button and mounts real send button
  form.removeChild(voiceBtn);
  const sendBtn = new FakeNode('BUTTON', {
    'data-testid': 'send-button',
    'aria-label': 'Send prompt',
  });
  form.appendChild(sendBtn);

  // Lazy lookup at click/submit time finds the newly appeared send button
  const foundBtn = adapter.findSendButton(doc, composerEl);
  assert.equal(
    foundBtn,
    sendBtn,
    'Should lazily find send button when it appears',
  );
});

test('voice and dictation buttons are never matched as Send', () => {
  const form = new FakeNode('FORM');
  const voiceBtn1 = new FakeNode('BUTTON', {
    'data-testid': 'fruitjuice-send-button',
    'aria-label': 'Start voice mode',
  });
  const voiceBtn2 = new FakeNode('BUTTON', {
    'data-testid': 'composer-speech-button',
    'aria-label': 'Dictate message',
  });
  const thinkBtn = new FakeNode('BUTTON', {
    type: 'submit',
    'aria-label': 'Think',
    textContent: 'Think',
  });
  form.appendChild(voiceBtn1);
  form.appendChild(voiceBtn2);
  form.appendChild(thinkBtn);

  const doc = new FakeNode('DOCUMENT', {}, [form]);

  assert.equal(
    adapter.findSendButton(doc),
    null,
    'Voice, dictation, and think buttons must never be matched as Send',
  );
});

test('fail closed if Enter intercepted but cannot find a way to submit', () => {
  let warned = null;
  globalThis.SafeShield.modal = {
    warn: (msg) => {
      warned = msg;
    },
  };
  const emptyAdapter = {
    findSendButton: () => null,
  };
  const result = composer.submit(emptyAdapter);
  assert.equal(result, false, 'submit should return false if no send button');
  assert.ok(
    warned && warned.includes('Send blocked: could not find a way to submit'),
    'modal.warn must be called when submission has no send button',
  );
});
