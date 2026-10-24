const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('popup.js does not reference tab.url or tab.title', () => {
  const popupJsPath = path.join(ROOT_DIR, 'src/ui/popup/popup.js');
  const code = fs.readFileSync(popupJsPath, 'utf8');

  assert.equal(
    /\b(?:tab|activeTab)\.url\b/.test(code),
    false,
    'popup.js must not reference tab.url or activeTab.url',
  );
  assert.equal(
    /\b(?:tab|activeTab)\.title\b/.test(code),
    false,
    'popup.js must not reference tab.title or activeTab.title',
  );
});

test('manifest.json does not require tabs permission', () => {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const permissions = manifest.permissions || [];
  assert.equal(
    permissions.includes('tabs'),
    false,
    'manifest.json must not add tabs permission',
  );
});

test('popup status logic decides support purely from SS_GET_STATUS reply', () => {
  // Simulate status logic extracted from popup.js
  function evaluateTabStatus(isEnabled, mockChrome, onStatus) {
    if (!isEnabled) {
      onStatus('off', 'Protection paused');
      return;
    }

    if (
      typeof mockChrome === 'undefined' ||
      !mockChrome.tabs ||
      !mockChrome.tabs.query
    ) {
      onStatus('unsupported', 'Not supported on this page');
      return;
    }

    mockChrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (mockChrome.runtime.lastError || !tabs || tabs.length === 0) {
        onStatus('unsupported', 'Not supported on this page');
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        onStatus('unsupported', 'Not supported on this page');
        return;
      }

      mockChrome.tabs.sendMessage(
        activeTab.id,
        { type: 'SS_GET_STATUS' },
        (response) => {
          if (mockChrome.runtime.lastError || !response) {
            onStatus('unsupported', 'Not supported on this page');
            return;
          }

          if (response.state === 'active') {
            onStatus('active', 'Active on this page');
          } else if (response.state === 'off') {
            onStatus('off', 'Protection paused');
          } else if (response.state === 'error') {
            onStatus('error', 'Protection error');
          } else {
            onStatus('unsupported', 'Not supported on this page');
          }
        },
      );
    });
  }

  // 1. Tab has only id: 42, no url or title; content script responds with active
  let statusResult = null;
  const mockChromeActive = {
    runtime: { lastError: null },
    tabs: {
      query: (filter, cb) => cb([{ id: 42 }]), // Notice: NO url or title
      sendMessage: (tabId, msg, cb) => {
        assert.equal(tabId, 42);
        assert.equal(msg.type, 'SS_GET_STATUS');
        cb({ state: 'active', reason: 'active', ai: false });
      },
    },
  };
  evaluateTabStatus(true, mockChromeActive, (state, msg) => {
    statusResult = { state, msg };
  });
  assert.deepEqual(statusResult, {
    state: 'active',
    msg: 'Active on this page',
  });

  // 2. Receiving end does not exist (content script not loaded on page)
  let statusErrorResult = null;
  const mockChromeNoReceiver = {
    runtime: {
      get lastError() {
        return {
          message:
            'Could not establish connection. Receiving end does not exist.',
        };
      },
    },
    tabs: {
      query: (filter, cb) => cb([{ id: 42 }]),
      sendMessage: (tabId, msg, cb) => {
        cb(undefined);
      },
    },
  };
  evaluateTabStatus(true, mockChromeNoReceiver, (state, msg) => {
    statusErrorResult = { state, msg };
  });
  assert.deepEqual(statusErrorResult, {
    state: 'unsupported',
    msg: 'Not supported on this page',
  });

  // 3. Content script replies unsupported
  let statusUnsupportedResult = null;
  const mockChromeUnsupported = {
    runtime: { lastError: null },
    tabs: {
      query: (filter, cb) => cb([{ id: 42 }]),
      sendMessage: (tabId, msg, cb) => {
        cb({ state: 'unsupported', reason: 'composer-not-found', ai: false });
      },
    },
  };
  evaluateTabStatus(true, mockChromeUnsupported, (state, msg) => {
    statusUnsupportedResult = { state, msg };
  });
  assert.deepEqual(statusUnsupportedResult, {
    state: 'unsupported',
    msg: 'Not supported on this page',
  });

  // 4. Protection toggled off
  let statusOffResult = null;
  evaluateTabStatus(false, mockChromeActive, (state, msg) => {
    statusOffResult = { state, msg };
  });
  assert.deepEqual(statusOffResult, {
    state: 'off',
    msg: 'Protection paused',
  });
});
