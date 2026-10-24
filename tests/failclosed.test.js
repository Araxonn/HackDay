const test = require('node:test');
const assert = require('node:assert/strict');

// Minimal DOM Element fake
class FakeElement {
  constructor(tagName = 'DIV', initialText = '') {
    this.tagName = tagName.toUpperCase();
    this.value = initialText;
    this.innerText = initialText;
    this.textContent = initialText;
    this.isConnected = true;
    this.isContentEditable = this.tagName === 'DIV';
    this.listeners = new Map();
    this.attributes = new Map();
  }

  getAttribute(name) {
    return this.attributes.get(name) || (name === 'contenteditable' && this.isContentEditable ? 'true' : null);
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }

  addEventListener(type, listener, useCapture = false) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push({ listener, useCapture });
  }

  removeEventListener(type, listener) {
    if (!this.listeners.has(type)) return;
    const arr = this.listeners.get(type).filter((l) => l.listener !== listener);
    this.listeners.set(type, arr);
  }

  dispatchEvent(event) {
    event.target = this;
    event.currentTarget = this;
    const list = this.listeners.get(event.type) || [];
    for (const item of list) {
      item.listener(event);
      if (event._immediateStopped) break;
    }
    return !event.defaultPrevented;
  }

  click() {
    const evt = new FakeEvent('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(evt);
  }

  focus() {}
}

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.defaultPrevented = false;
    this._immediateStopped = false;
    this.key = init.key || '';
    this.shiftKey = Boolean(init.shiftKey);
    this.ctrlKey = Boolean(init.ctrlKey);
    this.metaKey = Boolean(init.metaKey);
    this.altKey = Boolean(init.altKey);
    this.isComposing = Boolean(init.isComposing);
    this.clipboardData = init.clipboardData || null;
    this.target = init.target || null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopImmediatePropagation() {
    this._immediateStopped = true;
  }
}

// Reset and load SafeShield modules
function setupSafeShieldEnv() {
  delete globalThis.SafeShield;
  delete globalThis.chrome;
  delete globalThis.Event;
  delete globalThis.InputEvent;
  delete globalThis.KeyboardEvent;

  globalThis.document = new FakeElement('DOCUMENT');
  globalThis.window = {
    location: {
      href: 'https://chatgpt.com/',
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const modules = [
    '../src/shared/constants.js',
    '../src/shared/storage.js',
    '../src/shared/vault.js',
    '../src/core/validators.js',
    '../src/core/patterns.js',
    '../src/core/detector.js',
    '../src/core/redactor.js',
    '../src/content/adapters/chatgpt.js',
    '../src/content/composer.js',
    '../src/content/interceptor.js',
    '../src/content/main.js',
  ];
  for (const m of modules) {
    try {
      delete require.cache[require.resolve(m)];
    } catch {
      // Ignored if not yet cached
    }
  }

  require('../src/shared/constants.js');
  require('../src/shared/storage.js');
  require('../src/shared/vault.js');
  require('../src/core/validators.js');
  require('../src/core/patterns.js');
  require('../src/core/detector.js');
  require('../src/core/redactor.js');
  require('../src/content/adapters/chatgpt.js');
  require('../src/content/composer.js');
  require('../src/content/interceptor.js');
  require('../src/content/main.js');

  return globalThis.SafeShield;
}

test('setText returns false: submit is never called, modal.warn is called', async () => {
  const SS = setupSafeShieldEnv();
  const originalPrompt = 'My phone number is 9876543210';
  const composerEl = new FakeElement('TEXTAREA', originalPrompt);

  let submitCalled = false;
  SS.composer.submit = () => {
    submitCalled = true;
    return true;
  };

  // Mock setText to fail
  SS.composer.setText = () => false;

  let modalShown = false;
  let warnMsg = null;
  SS.modal = {
    show: async () => {
      modalShown = true;
      return { action: 'send' };
    },
    warn: (msg) => {
      warnMsg = msg;
    },
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(enterEvt.defaultPrevented, true, 'Event must be blocked');
  assert.equal(submitCalled, false, 'submit must NEVER be called when setText fails');
  assert.equal(modalShown, false, 'modal.show must NOT be called when setText fails');
  assert.ok(warnMsg && warnMsg.includes('Send blocked'), 'modal.warn must be called with a send blocked message');
});

test('setText returns true but getText still returns the original text: submit is never called', async () => {
  const SS = setupSafeShieldEnv();
  const originalPrompt = 'Contact me at 9876543210';
  const composerEl = new FakeElement('TEXTAREA', originalPrompt);

  let submitCalled = false;
  SS.composer.submit = () => {
    submitCalled = true;
    return true;
  };

  // setText returns true, but getText still returns originalPrompt
  SS.composer.setText = () => true;
  SS.composer.getText = () => originalPrompt;

  let modalShown = false;
  let warnMsg = null;
  SS.modal = {
    show: async () => {
      modalShown = true;
      return { action: 'send' };
    },
    warn: (msg) => {
      warnMsg = msg;
    },
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(enterEvt.defaultPrevented, true, 'Event must be blocked');
  assert.equal(submitCalled, false, 'submit must NEVER be called when composer does not match redactedText');
  assert.equal(modalShown, false, 'modal.show must NOT be called when text mismatch occurs');
  assert.ok(warnMsg && warnMsg.includes('Send blocked'), 'modal.warn must be called with a send blocked message');
});

test('User edits the composer to add a fake PII value while the modal is open, then clicks Send redacted: submit is never called', async () => {
  const SS = setupSafeShieldEnv();
  const originalPrompt = 'Urgent phone: 9876543210';
  const composerEl = new FakeElement('TEXTAREA', originalPrompt);

  let submitCalled = false;
  SS.composer.submit = () => {
    submitCalled = true;
    return true;
  };

  let warnMsg = null;
  SS.modal = {
    show: async () => {
      // User edits composer element to insert a new phone number while modal is active
      composerEl.value = 'Replaced with new phone: 9123456780';
      return { action: 'send' };
    },
    warn: (msg) => {
      warnMsg = msg;
    },
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(submitCalled, false, 'submit must NEVER be called when PII is detected before submit');
  assert.ok(warnMsg && warnMsg.includes('Send blocked'), 'modal.warn must be called when safety check fails');
});

test('Normal happy path still submits only the redacted text', async () => {
  const SS = setupSafeShieldEnv();
  const originalPrompt = 'Call 9876543210 please';
  const composerEl = new FakeElement('TEXTAREA', originalPrompt);

  let submittedText = null;
  let submitCalled = false;
  SS.composer.submit = () => {
    submitCalled = true;
    submittedText = composerEl.value;
    return true;
  };

  let modalShown = false;
  let rememberedEntities = null;
  SS.vault.remember = (ents) => {
    rememberedEntities = ents;
  };

  let recordedCounts = null;
  SS.storage.addCounts = async (c) => {
    recordedCounts = c;
  };

  SS.modal = {
    show: async () => {
      modalShown = true;
      return { action: 'send' };
    },
    warn: () => {},
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(modalShown, true, 'modal.show must be called on happy path');
  assert.equal(submitCalled, true, 'composer.submit must be called on happy path');
  assert.equal(submittedText, 'Call [PHONE_1] please', 'Submitted text must be redacted');
  assert.equal(submittedText.includes('9876543210'), false, 'Raw phone must not be submitted');
  assert.ok(rememberedEntities && rememberedEntities.length === 1);
  assert.deepEqual(recordedCounts, { PHONE: 1 });
});
