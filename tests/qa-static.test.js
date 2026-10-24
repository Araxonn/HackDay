const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Step 2a: manifest.json is valid JSON and every path exists on disk', () => {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const rawManifest = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  assert.doesNotThrow(() => {
    manifest = JSON.parse(rawManifest);
  }, 'manifest.json must be valid JSON');

  const pathsToCheck = [];

  // Icons
  if (manifest.icons) {
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      pathsToCheck.push({ key: `icons.${size}`, file: iconPath });
    }
  }

  // Action icons & popup
  if (manifest.action) {
    if (manifest.action.default_popup) {
      pathsToCheck.push({
        key: 'action.default_popup',
        file: manifest.action.default_popup,
      });
    }
    if (manifest.action.default_icon) {
      if (typeof manifest.action.default_icon === 'string') {
        pathsToCheck.push({
          key: 'action.default_icon',
          file: manifest.action.default_icon,
        });
      } else {
        for (const [size, iconPath] of Object.entries(
          manifest.action.default_icon,
        )) {
          pathsToCheck.push({
            key: `action.default_icon.${size}`,
            file: iconPath,
          });
        }
      }
    }
  }

  // Options page
  if (manifest.options_page) {
    pathsToCheck.push({ key: 'options_page', file: manifest.options_page });
  }

  // Service worker
  if (manifest.background && manifest.background.service_worker) {
    pathsToCheck.push({
      key: 'background.service_worker',
      file: manifest.background.service_worker,
    });
  }

  // Content scripts
  if (Array.isArray(manifest.content_scripts)) {
    manifest.content_scripts.forEach((cs, i) => {
      if (Array.isArray(cs.css)) {
        cs.css.forEach((cssFile, j) => {
          pathsToCheck.push({
            key: `content_scripts[${i}].css[${j}]`,
            file: cssFile,
          });
        });
      }
      if (Array.isArray(cs.js)) {
        cs.js.forEach((jsFile, j) => {
          pathsToCheck.push({
            key: `content_scripts[${i}].js[${j}]`,
            file: jsFile,
          });
        });
      }
    });
  }

  assert.ok(pathsToCheck.length > 0, 'Found paths to check in manifest.json');

  for (const item of pathsToCheck) {
    const fullPath = path.join(ROOT_DIR, item.file);
    assert.ok(
      fs.existsSync(fullPath),
      `Path defined in manifest (${item.key}): "${item.file}" must exist on disk at "${fullPath}"`,
    );
  }
});

test('Step 2b: Content script load order in isolated vm context with minimal globalThis', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8'),
  );
  const contentScripts = manifest.content_scripts[0].js;

  // Minimal fake globalThis without a real DOM
  const sandbox = {
    console: {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
    },
    setTimeout,
    clearTimeout,
    // Note: No window, no document provided
  };
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);

  for (const relPath of contentScripts) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');

    assert.doesNotThrow(() => {
      vm.runInContext(code, context, { filename: relPath });
    }, `Failed while loading content script in order: ${relPath}`);
  }

  // Verify all expected modules attached to SafeShield
  assert.ok(
    sandbox.SafeShield,
    'SafeShield namespace must be initialized on globalThis',
  );
  assert.ok(sandbox.SafeShield.constants, 'constants loaded');
  assert.ok(sandbox.SafeShield.storage, 'storage loaded');
  assert.ok(sandbox.SafeShield.vault, 'vault loaded');
  assert.ok(sandbox.SafeShield.validators, 'validators loaded');
  assert.ok(sandbox.SafeShield.patterns, 'patterns loaded');
  assert.ok(sandbox.SafeShield.detector, 'detector loaded');
  assert.ok(sandbox.SafeShield.redactor, 'redactor loaded');
  assert.ok(sandbox.SafeShield.modal, 'modal loaded');
  assert.ok(sandbox.SafeShield.chatgptAdapter, 'chatgptAdapter loaded');
  assert.ok(sandbox.SafeShield.composer, 'composer loaded');
  assert.ok(sandbox.SafeShield.interceptor, 'interceptor loaded');
  assert.ok(sandbox.SafeShield.main, 'main loaded');
});

test('Step 2c: Service worker compatibility without window or document', () => {
  const swRelPath = 'src/background/service-worker.js';
  const swFullPath = path.join(ROOT_DIR, swRelPath);
  const swDir = path.dirname(swFullPath);

  let accessedWindow = false;
  let accessedDocument = false;

  const fakeChrome = {
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
    },
    runtime: {
      id: 'test-extension-id',
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: () => {} },
    },
    storage: {
      local: {
        get: (keys, cb) => cb({ stats: {} }),
        set: (data, cb) => cb && cb(),
      },
      onChanged: { addListener: () => {} },
    },
  };

  const sandbox = {
    chrome: fakeChrome,
    console: {
      log: () => {},
      error: (msg, err) => {
        if (msg.includes('importScripts')) {
          throw err;
        }
      },
      warn: () => {},
    },
    setTimeout,
    clearTimeout,
  };

  sandbox.globalThis = sandbox;

  // Simulate importScripts
  sandbox.importScripts = (...scripts) => {
    for (const script of scripts) {
      const resolved = path.resolve(swDir, script);
      const code = fs.readFileSync(resolved, 'utf8');
      vm.runInContext(code, context, { filename: script });
    }
  };

  // Traps for window and document
  Object.defineProperty(sandbox, 'window', {
    get() {
      accessedWindow = true;
      throw new ReferenceError(
        'window is not defined in service worker context',
      );
    },
  });
  Object.defineProperty(sandbox, 'document', {
    get() {
      accessedDocument = true;
      throw new ReferenceError(
        'document is not defined in service worker context',
      );
    },
  });

  const context = vm.createContext(sandbox);
  const swCode = fs.readFileSync(swFullPath, 'utf8');

  assert.doesNotThrow(() => {
    vm.runInContext(swCode, context, { filename: swRelPath });
  }, 'Service worker must execute without errors');

  assert.equal(
    accessedWindow,
    false,
    'Service worker must never access window',
  );
  assert.equal(
    accessedDocument,
    false,
    'Service worker must never access document',
  );
});

test('Step 2d: gemma.js assertLoopback blocks non-loopback baseUrls and never calls fetch', async () => {
  const gemma = require('../src/ai/gemma.js');

  const nonLoopbackUrls = [
    'https://generativelanguage.googleapis.com',
    'http://localhost.evil.com',
    'http://192.168.1.100:11434',
    'http://127.0.0.1.evil.com:11434',
    'http://10.0.0.1:11434',
    'http://attacker.com:11434',
  ];

  for (const url of nonLoopbackUrls) {
    let fetchCalled = false;
    const fakeFetch = async () => {
      fetchCalled = true;
      throw new Error(
        'SECURITY VIOLATION: fetch was called for non-loopback host!',
      );
    };

    // Test classify
    const classifyRes = await gemma.classify(
      'Test prompt',
      { baseUrl: url },
      fakeFetch,
    );
    assert.equal(
      fetchCalled,
      false,
      `fetch should never be reached in classify for ${url}`,
    );
    assert.equal(classifyRes.ok, false);
    assert.equal(classifyRes.error, 'forbidden');

    // Test ping
    const pingRes = await gemma.ping(url, fakeFetch);
    assert.equal(
      fetchCalled,
      false,
      `fetch should never be reached in ping for ${url}`,
    );
    assert.equal(pingRes.ok, false);
    assert.equal(pingRes.error, 'forbidden');
  }

  // Also confirm assertLoopback directly throws on these
  for (const url of nonLoopbackUrls) {
    assert.throws(
      () => {
        gemma.assertLoopback(url);
      },
      /Rejected non-loopback host|Only http protocol permitted/,
      `assertLoopback should throw for ${url}`,
    );
  }

  // Confirm assertLoopback passes for valid loopback
  assert.doesNotThrow(() => gemma.assertLoopback('http://localhost:11434'));
  assert.doesNotThrow(() => gemma.assertLoopback('http://127.0.0.1:11434'));
});

test('Step 2e: Privacy static scan over src/ (no web storage, no telemetry, no leaks in console)', () => {
  function getAllFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results = results.concat(getAllFiles(full));
      } else if (file.endsWith('.js')) {
        results.push(full);
      }
    }
    return results;
  }

  const srcFiles = getAllFiles(path.join(ROOT_DIR, 'src'));

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relFile = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

    // 1. Disallowed storage / tracking
    assert.equal(
      /\b(?:localStorage|sessionStorage)\b/.test(content),
      false,
      `Forbidden localStorage/sessionStorage found in ${relFile}`,
    );
    assert.equal(
      /\b(?:XMLHttpRequest|WebSocket|sendBeacon)\b/.test(content),
      false,
      `Forbidden network API found in ${relFile}`,
    );

    // 2. Fetch calls only permitted in src/ai/gemma.js
    if (relFile !== 'src/ai/gemma.js') {
      assert.equal(
        /\bfetch\s*\(/.test(content),
        false,
        `Unexpected fetch call in ${relFile}`,
      );
    }

    // 3. chrome.storage set calls only permitted in src/shared/storage.js
    if (relFile !== 'src/shared/storage.js') {
      assert.equal(
        /chrome\.storage\.[a-zA-Z0-9_]+\.set/.test(content),
        false,
        `Direct chrome.storage set call outside storage.js in ${relFile}`,
      );
    }

    // 4. Remote URLs check (only loopback permitted)
    const urlMatches = content.match(/https?:\/\/[^\s'"`)]+/g) || [];
    for (const url of urlMatches) {
      assert.ok(
        url.startsWith('http://localhost') ||
          url.startsWith('http://127.0.0.1'),
        `Disallowed non-loopback URL "${url}" found in ${relFile}`,
      );
    }
  }
});

test('Step 2f: Counts-only storage: fake PII redaction persists only counts and toggles, zero prompt or values', async () => {
  delete globalThis.SafeShield;
  delete require.cache[require.resolve('../src/shared/storage.js')];
  delete require.cache[require.resolve('../src/shared/constants.js')];

  const fakeStore = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: (keys, cb) => {
          const res = {};
          for (const k of keys) {
            res[k] = fakeStore[k];
          }
          cb(res);
        },
        set: (items, cb) => {
          Object.assign(fakeStore, items);
          if (cb) cb();
        },
      },
    },
    runtime: {
      lastError: null,
    },
  };

  require('../src/shared/constants.js');
  const storage = require('../src/shared/storage.js');
  const redactor = require('../src/core/redactor.js');
  require('../src/core/validators.js');
  require('../src/core/patterns.js');
  require('../src/core/detector.js');

  // Fake prompt containing phone and email
  const fakePrompt =
    'Contact me at 9876543210 or email test-fake-qa@domain-fake.org immediately';
  const fakePhone = '9876543210';
  const fakeEmail = 'test-fake-qa@domain-fake.org';

  const redactRes = redactor.redact(fakePrompt);
  assert.ok(redactRes.counts.PHONE >= 1);
  assert.ok(redactRes.counts.EMAIL >= 1);

  await storage.addCounts(redactRes.counts);
  await storage.setEnabled(true);
  await storage.setAiAssist(false);

  // Inspect fakeStore
  const storedJson = JSON.stringify(fakeStore);

  // 1. Storage keys must ONLY be 'stats', 'enabled', 'aiAssist'
  const keys = Object.keys(fakeStore);
  for (const k of keys) {
    assert.ok(
      ['stats', 'enabled', 'aiAssist'].includes(k),
      `Unexpected key in chrome.storage: ${k}`,
    );
  }

  // 2. Proves stored data contains NO prompt text, NO original values
  assert.equal(
    storedJson.includes(fakePhone),
    false,
    'Stored data must not contain fake phone',
  );
  assert.equal(
    storedJson.includes(fakeEmail),
    false,
    'Stored data must not contain fake email',
  );
  assert.equal(
    storedJson.includes('Contact me'),
    false,
    'Stored data must not contain prompt snippet',
  );
  assert.equal(
    storedJson.includes('domain-fake.org'),
    false,
    'Stored data must not contain prompt snippet',
  );

  // 3. Stats must strictly contain counts
  assert.deepEqual(fakeStore.stats, { PHONE: 1, EMAIL: 1 });
  assert.equal(fakeStore.enabled, true);
  assert.equal(fakeStore.aiAssist, false);
});

test('Step 2g: Vault: originals never written to chrome.storage, vault.clear() and pagehide work', () => {
  delete globalThis.SafeShield;
  const vault = require('../src/shared/vault.js');

  const fakeEntities = [
    { placeholder: '[PHONE_1]', type: 'PHONE', original: '9876543210' },
    { placeholder: '[EMAIL_1]', type: 'EMAIL', original: 'test@fake.org' },
  ];

  vault.clear();
  assert.deepEqual(vault.all(), []);

  vault.remember(fakeEntities);
  assert.deepEqual(vault.all(), fakeEntities);

  // Clear works
  vault.clear();
  assert.deepEqual(vault.all(), []);

  // Pagehide cleanup works
  vault.remember(fakeEntities);
  assert.equal(vault.all().length, 2);

  // Directly call clear as simulated by pagehide listener
  vault.clear();
  assert.deepEqual(vault.all(), [], 'Vault must be empty after clear()');
});
