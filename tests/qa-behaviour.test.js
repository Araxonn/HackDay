const test = require('node:test');
const assert = require('node:assert/strict');

// Helper to reset and initialize all SafeShield modules
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

  // Clear module caches
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
      // Ignored if not yet loaded
    }
  }

  // Load modules
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
    return (
      this.attributes.get(name) ||
      (name === 'contenteditable' && this.isContentEditable ? 'true' : null)
    );
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
    this.inputType = init.inputType || '';
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

// -------------------------------------------------------------
// Tests 1 - 15
// -------------------------------------------------------------

test('1. Enter with no PII: send is released unchanged, no modal', async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement(
    'TEXTAREA',
    'Tell me a story about space exploration',
  );

  let modalShown = false;
  SS.modal = {
    show: async () => {
      modalShown = true;
      return { action: 'send' };
    },
    warn: () => {},
  };

  const adapter = {
    matches: () => true,
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(
    enterEvt.defaultPrevented,
    false,
    'Send event must not be blocked when no PII is found',
  );
  assert.equal(
    modalShown,
    false,
    'Modal should not be shown when no PII is found',
  );
  assert.equal(
    composerEl.value,
    'Tell me a story about space exploration',
    'Composer text must remain untouched',
  );
});

test('2. Enter with PII: send is paused, text replaced with redacted text, modal.show called with entities and counts', async () => {
  const SS = setupSafeShieldEnv();
  const validators = SS.validators;
  const prefix11 = '23456789012';
  const validAadhaar = prefix11 + validators.verhoeffGenerate(prefix11);
  const prompt = `Contact 9876543210, mail to test@corp.in, aadhaar ${validAadhaar}, pan ABCPE1234F`;

  const composerEl = new FakeElement('TEXTAREA', prompt);

  let modalPayload = null;
  SS.modal = {
    show: async (params) => {
      modalPayload = params;
      return { action: 'cancel' };
    },
    warn: () => {},
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(
    enterEvt.defaultPrevented,
    true,
    'Submission event must be paused/blocked immediately',
  );
  assert.ok(modalPayload, 'modal.show must be called');
  assert.equal(modalPayload.counts.PHONE, 1);
  assert.equal(modalPayload.counts.EMAIL, 1);
  assert.equal(modalPayload.counts.AADHAAR, 1);
  assert.equal(modalPayload.counts.PAN, 1);
  assert.equal(modalPayload.entities.length, 4);

  // Redacted text verification
  assert.ok(modalPayload.redactedText.includes('[PHONE_1]'));
  assert.ok(modalPayload.redactedText.includes('[EMAIL_1]'));
  assert.ok(modalPayload.redactedText.includes('[AADHAAR_1]'));
  assert.ok(modalPayload.redactedText.includes('[PAN_1]'));
  assert.equal(modalPayload.redactedText.includes('9876543210'), false);
  assert.equal(modalPayload.redactedText.includes('test@corp.in'), false);
  assert.equal(modalPayload.redactedText.includes(validAadhaar), false);
  assert.equal(modalPayload.redactedText.includes('ABCPE1234F'), false);
});

test('2b. Enter blocks the original prompt before async Gemma/storage work', async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA', 'Call 9876543210 today.');
  let submitted = false;
  SS.composer.submit = () => {
    submitted = true;
    return true;
  };
  SS.storage.getAiAssist = () =>
    new Promise((resolve) => setTimeout(() => resolve(true), 10));
  SS.modal = {
    show: async () => ({ action: 'cancel' }),
    warn: () => {},
  };
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  SS.interceptor.attachHooks(composerEl, adapter);
  const enterEvt = new FakeEvent('keydown', {
    key: 'Enter',
    cancelable: true,
  });
  composerEl.dispatchEvent(enterEvt);

  assert.equal(enterEvt.defaultPrevented, true);
  assert.equal(submitted, false);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(submitted, false, 'Cancel must never submit the original prompt');
});

test('2a. AI address detection uses the same preview flow as structured PII', async () => {
  const SS = setupSafeShieldEnv();
  await SS.storage.setAiAssist(true);
  const prompt = 'Deliver the file to 42 Green Park Lane today.';
  const composerEl = new FakeElement('TEXTAREA', prompt);
  let modalPayload = null;

  globalThis.chrome = {
    runtime: {
      sendMessage: (message, callback) => {
        assert.equal(message.type, 'SS_AI_CLASSIFY');
        assert.equal(message.text, prompt);
        callback({
          ok: true,
          spans: [{ type: 'ADDRESS', text: '42 Green Park Lane' }],
        });
      },
    },
  };

  SS.modal = {
    show: async (params) => {
      modalPayload = params;
      return { action: 'cancel' };
    },
    warn: () => {},
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(enterEvt.defaultPrevented, true);
  assert.ok(modalPayload);
  assert.equal(modalPayload.counts.ADDRESS, 1);
  assert.equal(modalPayload.redactedText, 'Deliver the file to [ADDRESS_1] today.');
});

test('3. Modal action "send": only redacted text submitted; vault.remember and storage.addCounts called once', async () => {
  const SS = setupSafeShieldEnv();
  const prompt = 'My phone is 9876543210';
  const composerEl = new FakeElement('TEXTAREA', prompt);

  let vaultRememberCalls = 0;
  let rememberedEntities = null;
  SS.vault.remember = (ents) => {
    vaultRememberCalls++;
    rememberedEntities = ents;
  };

  let addCountsCalls = 0;
  let addedCounts = null;
  SS.storage.addCounts = async (c) => {
    addCountsCalls++;
    addedCounts = c;
  };

  SS.modal = {
    show: async () => ({ action: 'send' }),
    warn: () => {},
  };

  let submittedText = null;
  const sendBtn = new FakeElement('BUTTON');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => sendBtn,
  };

  SS.composer.submit = () => {
    submittedText = composerEl.value;
    return true;
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(
    vaultRememberCalls,
    1,
    'vault.remember must be called exactly once',
  );
  assert.equal(
    addCountsCalls,
    1,
    'storage.addCounts must be called exactly once',
  );
  assert.deepEqual(addedCounts, { PHONE: 1 });
  assert.ok(rememberedEntities[0].placeholder === '[PHONE_1]');
  assert.equal(
    submittedText,
    'My phone is [PHONE_1]',
    'Submitted text must be redacted',
  );
  assert.equal(submittedText.includes('9876543210'), false);
});

test('4. Modal action "cancel": nothing is submitted, composer text handling restores original', async () => {
  const SS = setupSafeShieldEnv();
  const prompt = 'Private email: secret@qa-test.in';
  const composerEl = new FakeElement('TEXTAREA', prompt);

  let submitCalled = false;
  SS.composer.submit = () => {
    submitCalled = true;
    return true;
  };

  SS.modal = {
    show: async () => ({ action: 'cancel' }),
    warn: () => {},
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(submitCalled, false, 'Nothing should be submitted on cancel');
  // When canceled, interceptor restores original draft so user does not lose input
  assert.equal(
    composerEl.value,
    prompt,
    'Composer text must be restored to original draft on cancel',
  );
});

test('5. Modal action "restore": originals put back locally and NOT submitted', async () => {
  const SS = setupSafeShieldEnv();
  const prompt = 'Please call 9876543210 urgently';
  const composerEl = new FakeElement('TEXTAREA', prompt);

  let submitCalled = false;
  SS.composer.submit = () => {
    submitCalled = true;
    return true;
  };

  SS.modal = {
    show: async () => ({ action: 'restore' }),
    warn: () => {},
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(submitCalled, false, 'Nothing should be submitted on restore');
  assert.equal(
    composerEl.value,
    prompt,
    'Originals must be put back locally into composer for manual editing',
  );
});

test('6. Send-button click is intercepted the same way as Enter', async () => {
  const SS = setupSafeShieldEnv();
  const prompt = 'Phone number: 9876543210';
  const composerEl = new FakeElement('TEXTAREA', prompt);
  const sendButton = new FakeElement('BUTTON');

  let modalShown = false;
  SS.modal = {
    show: async () => {
      modalShown = true;
      return { action: 'cancel' };
    },
    warn: () => {},
  };

  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => sendButton,
  };

  const clickEvt = new FakeEvent('click', {
    bubbles: true,
    cancelable: true,
    target: sendButton,
  });
  await SS.interceptor.handleSubmission(clickEvt, composerEl, adapter);

  assert.equal(
    clickEvt.defaultPrevented,
    true,
    'Send button click must be intercepted and defaultPrevented',
  );
  assert.equal(
    modalShown,
    true,
    'Modal must be shown on Send button click with PII',
  );
});

test('7. Shift+Enter does not trigger interception. IME composition does not trigger it', async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA', '9876543210');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  let modalShowCalls = 0;
  SS.modal = {
    show: async () => {
      modalShowCalls++;
      return { action: 'cancel' };
    },
    warn: () => {},
  };

  // Attach hooks
  SS.interceptor.attachHooks(composerEl, adapter);

  // 1. Shift+Enter
  const shiftEnterEvt = new FakeEvent('keydown', {
    key: 'Enter',
    shiftKey: true,
    cancelable: true,
  });
  composerEl.dispatchEvent(shiftEnterEvt);
  assert.equal(modalShowCalls, 0, 'Shift+Enter must not trigger interception');

  // 2. IME composition
  const imeEvt = new FakeEvent('keydown', {
    key: 'Enter',
    isComposing: true,
    cancelable: true,
  });
  composerEl.dispatchEvent(imeEvt);
  assert.equal(
    modalShowCalls,
    0,
    'IME composition must not trigger interception',
  );

  // 3. Normal Enter triggers it
  const normalEnterEvt = new FakeEvent('keydown', {
    key: 'Enter',
    cancelable: true,
  });
  composerEl.dispatchEvent(normalEnterEvt);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(modalShowCalls, 1, 'Standard Enter should trigger interception');
});

test('8. Protection toggled OFF: text passes through untouched', async () => {
  const SS = setupSafeShieldEnv();
  const prompt = 'Phone number: 9876543210';
  const composerEl = new FakeElement('TEXTAREA', prompt);

  let modalShown = false;
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

  SS.interceptor.setIsEnabled(false);
  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(
    enterEvt.defaultPrevented,
    false,
    'Event must not be prevented when protection is off',
  );
  assert.equal(
    modalShown,
    false,
    'Modal must not be shown when protection is off',
  );
  assert.equal(
    composerEl.value,
    prompt,
    'Composer text must remain untouched when protection is off',
  );
});

test('9. Fail closed: force detect() to throw and force redact() to throw. The send must be blocked and modal.warn must be called', async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA', '9876543210');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  let warnCalls = 0;
  SS.modal = {
    warn: () => {
      warnCalls++;
    },
  };

  // Case A: redactor.redact throws
  SS.redactor.redact = () => {
    throw new Error('Simulated redaction engine failure');
  };

  const evtA = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(evtA, composerEl, adapter);

  assert.equal(
    evtA.defaultPrevented,
    true,
    'Send must be blocked (fail closed) when redact throws',
  );
  assert.equal(
    evtA._immediateStopped,
    true,
    'Immediate propagation must be stopped when redact throws',
  );
  assert.equal(warnCalls, 1, 'modal.warn must be called when redact throws');

  // Case B: composer.getText throws
  SS.composer.getText = () => {
    throw new Error('Simulated DOM access error');
  };

  const evtB = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(evtB, composerEl, adapter);

  assert.equal(
    evtB.defaultPrevented,
    true,
    'Send must be blocked (fail closed) when getText throws',
  );
  assert.equal(warnCalls, 2, 'modal.warn must be called when getText throws');
});

test('10. setText returns false: prove the ORIGINAL unredacted text is never submitted in that case', async () => {
  const SS = setupSafeShieldEnv();
  const originalPrompt = 'Urgent secret phone: 9876543210';
  const composerEl = new FakeElement('TEXTAREA', originalPrompt);

  // Force setText to fail (return false)
  SS.composer.setText = () => false;

  let modalShown = false;
  SS.modal = {
    show: async () => {
      modalShown = true;
      return { action: 'send' };
    },
    warn: () => {},
  };

  let submittedText = null;
  let submitTriggered = false;
  const sendBtn = new FakeElement('BUTTON');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => sendBtn,
  };

  SS.composer.submit = () => {
    submitTriggered = true;
    submittedText = composerEl.value; // What is in the composer element at submit time
    return true;
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  // INVESTIGATION: When setText returns false, what happens?
  // In interceptor.js lines 153-194:
  // setText fails -> console.warn is logged -> modal.show is still shown -> user clicks send ->
  // composer.submit() is called -> because setText failed, composerEl STILL has originalPrompt!
  // Therefore the unredacted text WOULD be submitted!
  //
  // Assert rule: Original unredacted text MUST NEVER be submitted.
  assert.equal(
    submitTriggered && submittedText === originalPrompt,
    false,
    'CRITICAL PRIVACY BUG: When setText returns false, composer.submit was called and submitted the original unredacted prompt text from composerEl instead of failing closed!',
  );
  assert.equal(
    modalShown,
    false,
    'Modal must not be shown when setText fails closed',
  );
});

test("11. Re-entrancy: the extension's own submit is not intercepted again (no infinite loop)", async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA', 'Contact 9876543210');

  let modalShowCount = 0;
  SS.modal = {
    show: async () => {
      modalShowCount++;
      return { action: 'send' };
    },
    warn: () => {},
  };

  const sendBtn = new FakeElement('BUTTON');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => sendBtn,
  };

  // Simulate composer.submit dispatching another keydown or submit event
  let secondEventIntercepted = false;
  SS.composer.submit = () => {
    // When composer submits, it triggers an event
    const reentrantEvt = new FakeEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    SS.interceptor.handleSubmission(reentrantEvt, composerEl, adapter);
    if (reentrantEvt.defaultPrevented) {
      secondEventIntercepted = true;
    }
    return true;
  };

  const enterEvt = new FakeEvent('keydown', { key: 'Enter', cancelable: true });
  await SS.interceptor.handleSubmission(enterEvt, composerEl, adapter);

  assert.equal(modalShowCount, 1, 'Modal should be shown only once');
  assert.equal(
    secondEventIntercepted,
    false,
    'Re-entrant event must bypass interception (isBypassing === true)',
  );
});

test('12. Paste interception shows a warning for pasted PII and does not block normal paste', () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  let warnMessage = null;
  SS.modal = {
    warn: (msg) => {
      warnMessage = msg;
    },
  };

  SS.interceptor.attachHooks(composerEl, adapter);

  const pasteEvt = new FakeEvent('paste', {
    cancelable: true,
    clipboardData: {
      getData: (format) =>
        format === 'text' ? 'Pasting fake email: user@domain-test.com' : '',
    },
  });

  composerEl.dispatchEvent(pasteEvt);

  assert.equal(
    pasteEvt.defaultPrevented,
    false,
    'Normal paste must NOT be blocked',
  );
  assert.ok(
    warnMessage,
    'modal.warn must be called with sensitive data detected notice',
  );
  assert.ok(
    warnMessage.includes('EMAIL'),
    'Warning message must mention detected type',
  );
});

test('12b. Paste warning uses browser text/plain data and regex fallback with AI enabled', async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  await SS.storage.setAiAssist(true);
  let aiCalled = false;
  globalThis.chrome = {
    runtime: {
      sendMessage: (message, callback) => {
        aiCalled = true;
        callback({ ok: true, spans: [] });
      },
    },
  };

  let warnMessage = null;
  SS.modal = {
    warn: (message) => {
      warnMessage = message;
    },
  };

  SS.interceptor.attachHooks(composerEl, adapter);
  composerEl.dispatchEvent(
    new FakeEvent('paste', {
      cancelable: true,
      clipboardData: {
        getData: (format) =>
          format === 'text/plain' ? 'Call 9876543210 today' : '',
      },
    }),
  );

  assert.ok(warnMessage, 'Regex-detected paste must show a warning');
  assert.ok(warnMessage.includes('PHONE'));
  assert.equal(aiCalled, false, 'Gemma must not replace deterministic detection');
});

test('12c. Address regex fallback warns without requiring Gemma', () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  SS.storage.getAiAssist = async () => false;
  let warnMessage = null;
  SS.modal = {
    warn: (message) => {
      warnMessage = message;
    },
  };

  SS.interceptor.attachHooks(composerEl, adapter);
  composerEl.dispatchEvent(
    new FakeEvent('paste', {
      cancelable: true,
      clipboardData: {
        getData: (format) =>
          format === 'text/plain'
            ? 'Deliver this to 42 Green Park Lane, Pune.'
            : '',
      },
    }),
  );

  assert.ok(warnMessage, 'Address fallback must show a warning');
  assert.ok(warnMessage.includes('ADDRESS'));
});

test('12d. Address warning falls back to post-paste input events', () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement(
    'TEXTAREA',
    'Deliver this to 42 Green Park Lane, Pune.',
  );
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  let warnMessage = null;
  SS.modal = {
    warn: (message) => {
      warnMessage = message;
    },
  };

  SS.interceptor.attachHooks(composerEl, adapter);
  composerEl.dispatchEvent(
    new FakeEvent('input', {
      inputType: 'insertFromPaste',
    }),
  );

  assert.ok(warnMessage);
  assert.ok(warnMessage.includes('ADDRESS'));
});

test('12a. Paste interception warns for an AI-detected address', async () => {
  const SS = setupSafeShieldEnv();
  const composerEl = new FakeElement('TEXTAREA');
  const adapter = {
    findComposer: () => composerEl,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  await SS.storage.setAiAssist(true);
  globalThis.chrome = {
    runtime: {
      sendMessage: (message, callback) => {
        assert.equal(message.type, 'SS_AI_CLASSIFY');
        assert.equal(
          message.text,
          'Deliver this to [ADDRESS_1].',
        );
        callback({
          ok: true,
          spans: [{ type: 'ADDRESS', text: '42 Green Park Lane, Pune' }],
        });
      },
    },
  };

  let warnMessage = null;
  SS.modal = {
    warn: (message) => {
      warnMessage = message;
    },
  };

  SS.interceptor.attachHooks(composerEl, adapter);
  composerEl.dispatchEvent(
    new FakeEvent('paste', {
      cancelable: true,
      clipboardData: {
        getData: (format) =>
          format === 'text' ? 'Deliver this to 42 Green Park Lane, Pune.' : '',
      },
    }),
  );

  for (let i = 0; i < 10 && !warnMessage; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  assert.ok(warnMessage);
  assert.ok(warnMessage.includes('ADDRESS'));
});

test('13. Status rules in main.js: active, off, unsupported', () => {
  const SS = setupSafeShieldEnv();
  const main = SS.main;
  const interceptor = SS.interceptor;

  // 1. Off
  interceptor.setIsEnabled(false);
  assert.equal(main.getStatus(), 'off');

  // 2. Unsupported: enabled, but adapter does not match
  interceptor.setIsEnabled(true);
  SS.chatgptAdapter.matches = () => false;
  assert.equal(main.getStatus(), 'unsupported');

  // 3. Unsupported: adapter matches, but no composer found
  SS.chatgptAdapter.matches = () => true;
  SS.chatgptAdapter.findComposer = () => null;
  assert.equal(main.getStatus(), 'unsupported');

  // 4. Unsupported: adapter matches, composer found, but hooks NOT attached
  const fakeComposer = new FakeElement('TEXTAREA');
  SS.chatgptAdapter.findComposer = () => fakeComposer;
  interceptor.getIsAttached = () => false;
  assert.equal(main.getStatus(), 'unsupported');

  // 5. Active: enabled, composer found, hooks attached
  interceptor.getIsAttached = () => true;
  assert.equal(main.getStatus(), 'active');
});

test('14. Idempotent placeholders and round-trip restoration with Hinglish and Devanagari numerals', () => {
  const SS = setupSafeShieldEnv();
  const redactor = SS.redactor;
  const validators = SS.validators;

  // Create valid Aadhaar with Devanagari digits
  const asciiPrefix = '23456789012';
  const checkDigit = validators.verhoeffGenerate(asciiPrefix);
  const asciiAadhaar = asciiPrefix + checkDigit;
  // Convert Aadhaar to Devanagari numerals (०-९)
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const devanagariAadhaar = asciiAadhaar
    .split('')
    .map((d) => devanagariDigits[Number(d)])
    .join('');

  // Prompt with Hinglish, repeated phone, repeated email, Devanagari Aadhaar, PAN
  const text = `Mera phone number 9876543210 hai, call me on 9876543210. Email hai test@corp.in aur dusra contact test@corp.in. Aadhaar: ${devanagariAadhaar}, PAN: ABCPE1234F.`;

  const result = redactor.redact(text);

  // 1. Same value repeated gets the same placeholder
  const phoneEntities = result.entities.filter((e) => e.type === 'PHONE');
  assert.equal(
    phoneEntities.length,
    1,
    'Repeated phone should only generate one unique entity',
  );
  assert.equal(phoneEntities[0].placeholder, '[PHONE_1]');

  const emailEntities = result.entities.filter((e) => e.type === 'EMAIL');
  assert.equal(
    emailEntities.length,
    1,
    'Repeated email should only generate one unique entity',
  );
  assert.equal(emailEntities[0].placeholder, '[EMAIL_1]');

  // Counts reflect total occurrences
  assert.equal(result.counts.PHONE, 2);
  assert.equal(result.counts.EMAIL, 2);
  assert.equal(result.counts.AADHAAR, 1);
  assert.equal(result.counts.PAN, 1);

  // 2. Round-trip restoration guarantee: restore(redacted, entities) === original text
  const restored = redactor.restore(result.redactedText, result.entities);
  assert.equal(
    restored,
    text,
    'Restored text must match original exactly character for character',
  );
});

test('15. Gemma path: AI off no message; hallucinated span dropped; timeout does not block send; modal note set; structured PII skips AI', async () => {
  const SS = setupSafeShieldEnv();

  let messageSent;
  globalThis.chrome = {
    runtime: {
      sendMessage: (msg, cb) => {
        messageSent = msg;
        if (msg.type === 'SS_AI_CLASSIFY') {
          // Return a response with one valid span and one hallucinated span
          cb({
            ok: true,
            spans: [
              { type: 'NAME', text: 'Dr. Ramesh Sharma' }, // in prompt
              { type: 'NAME', text: 'Hallucinated Nonexistent Ghost' }, // NOT in prompt
            ],
          });
        }
      },
    },
  };

  // Case 1: AI Off -> no SS_AI_CLASSIFY message
  SS.storage.getAiAssist = async () => false;
  const composerEl1 = new FakeElement(
    'TEXTAREA',
    'My email is test@corp.in and my manager is Dr. Ramesh Sharma',
  );
  let modalNote1 = null;
  SS.modal = {
    show: async (p) => {
      modalNote1 = p.note;
      return { action: 'cancel' };
    },
    warn: () => {},
  };
  const adapter = {
    findComposer: () => composerEl1,
    findSendButton: () => new FakeElement('BUTTON'),
  };

  messageSent = null;
  await SS.interceptor.handleSubmission(
    new FakeEvent('keydown', { key: 'Enter', cancelable: true }),
    composerEl1,
    adapter,
  );
  assert.equal(
    messageSent,
    null,
    'When AI is off, no message should be sent to background',
  );
  assert.equal(modalNote1, null, 'When AI is off, modal note must be null');

  // Case 2: AI On, but structured PII still detected -> AI skipped
  SS.storage.getAiAssist = async () => true;
  // If detector still finds PII in the text after regex redaction (or if prompt has remaining structured PII)
  // According to interceptor.js line 88:
  // const hasRemainingStructuredPII = SafeShield.detector ? SafeShield.detector.detect(redactedText).length > 0 : false;
  // If redactedText still has a phone or Aadhaar, AI is skipped:
  SS.detector.detect = (t) => {
    if (t.includes('REMAINING_PII')) {
      return [{ type: 'PHONE', start: 0, end: 10, value: '9876543210' }];
    }
    return [];
  };
  SS.redactor.redact = () => ({
    redactedText: 'This prompt has REMAINING_PII present here',
    entities: [
      { placeholder: '[PHONE_1]', type: 'PHONE', original: '9876543210' },
    ],
    counts: { PHONE: 1 },
  });

  messageSent = null;
  const composerEl2 = new FakeElement(
    'TEXTAREA',
    'Test prompt with remaining PII',
  );
  await SS.interceptor.handleSubmission(
    new FakeEvent('keydown', { key: 'Enter', cancelable: true }),
    composerEl2,
    adapter,
  );
  assert.equal(
    messageSent,
    null,
    'AI must be skipped if detect() still finds structured PII in redacted text',
  );

  // Case 3: AI On, clean text >= 3 words, model returns hallucinated span + valid span
  SS.detector.detect = () => []; // No remaining structured PII
  SS.redactor.redact = () => ({
    redactedText:
      'Please consult Dr. Ramesh Sharma regarding this project draft',
    entities: [],
    counts: {},
  });

  let modalEntities = null;
  SS.modal.show = async (p) => {
    modalEntities = p.entities;
    return { action: 'cancel' };
  };

  messageSent = null;
  const composerEl3 = new FakeElement(
    'TEXTAREA',
    'Please consult Dr. Ramesh Sharma regarding this project draft',
  );
  await SS.interceptor.handleSubmission(
    new FakeEvent('keydown', { key: 'Enter', cancelable: true }),
    composerEl3,
    adapter,
  );

  assert.ok(
    messageSent,
    'Message must be sent when AI is enabled and prompt is eligible',
  );
  assert.equal(messageSent.type, 'SS_AI_CLASSIFY');
  // Valid span was included
  const nameEntity = modalEntities.find(
    (e) => e.original === 'Dr. Ramesh Sharma',
  );
  assert.ok(nameEntity, 'Valid span must be redacted and added to entities');
  assert.equal(nameEntity.placeholder, '[NAME_1]');
  // Hallucinated span was dropped
  const ghostEntity = modalEntities.find((e) =>
    e.original.includes('Hallucinated'),
  );
  assert.equal(ghostEntity, undefined, 'Hallucinated span must be dropped');

  // Case 4: AI timeout / error -> never blocks an AI-eligible send, note set in modal
  globalThis.chrome.runtime.sendMessage = (msg, cb) => {
    cb({ ok: false, error: 'timeout' });
  };
  let modalShownOnAiFailure = false;
  SS.modal.show = async () => {
    modalShownOnAiFailure = true;
    return { action: 'cancel' };
  };

  const composerEl4 = new FakeElement(
    'TEXTAREA',
    'Please review this address draft carefully today',
  );
  SS.redactor.redact = () => ({
    redactedText: 'Please review this address draft carefully today',
    entities: [],
    counts: {},
  });
  await SS.interceptor.handleSubmission(
    new FakeEvent('keydown', { key: 'Enter', cancelable: true }),
    composerEl4,
    adapter,
  );

  assert.equal(
    modalShownOnAiFailure,
    false,
    'AI failure with no detected entity should release the unchanged prompt',
  );
});
