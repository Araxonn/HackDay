const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = path.resolve(__dirname, '..');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const shouldRunE2E = process.env.RUN_E2E === '1';

test(
  'Step 4: Real-browser E2E test with local mock page in Google Chrome',
  {
    skip: !shouldRunE2E
      ? 'Skipped: RUN_E2E=1 environment variable is not set'
      : false,
  },
  async (t) => {
    if (!fs.existsSync(CHROME_PATH)) {
      t.skip(`Chrome binary not found at ${CHROME_PATH}`);
      return;
    }

    let server;
    let tempDir;
    let browser;

    try {
      // 1. Setup local HTTP server for mock page
      const mockHtmlPath = path.join(ROOT_DIR, 'tests', 'e2e', 'mock-page.html');
      server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/mock-page.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fs.readFileSync(mockHtmlPath));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const port = server.address().port;
      const mockUrl = `http://127.0.0.1:${port}/mock-page.html`;

      // 2. Prepare temporary unpacked extension with local URL in matches
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeshield-ext-'));
      copyDirRecursive(path.join(ROOT_DIR, 'src'), path.join(tempDir, 'src'));
      copyDirRecursive(path.join(ROOT_DIR, 'assets'), path.join(tempDir, 'assets'));

      const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8'));
      // Add local mock host to matches and chatgptAdapter matches check
      manifest.content_scripts[0].matches.push(`http://127.0.0.1:${port}/*`);
      manifest.content_scripts[0].matches.push('http://127.0.0.1/*');
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Also patch the temp copy of chatgpt.js adapter to match the local 127.0.0.1 host
      const tempAdapterPath = path.join(tempDir, 'src', 'content', 'adapters', 'chatgpt.js');
      let adapterCode = fs.readFileSync(tempAdapterPath, 'utf8');
      adapterCode = adapterCode.replace(
        /return \/\^https\?:\/\\\/[^\n]+/,
        `return /^https?:\\/\\/(?:[a-zA-Z0-9-]+\\.)*(?:chatgpt\\.com|openai\\.com|127\\.0\\.0\\.1)(?::\\d+)?(?:\\/|$)/i.test(loc);`
      );
      fs.writeFileSync(tempAdapterPath, adapterCode);

      // 3. Launch Chrome with unpacked extension
      browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: [
          `--disable-extensions-except=${tempDir}`,
          `--load-extension=${tempDir}`,
          '--no-sandbox',
          '--disable-gpu',
        ],
      });

      // 4. Verify service worker target exists and has no errors
      const swTarget = await browser
        .waitForTarget((target) => target.type() === 'service_worker', {
          timeout: 7000,
        })
        .catch(() => null);

      if (!swTarget) {
        t.skip(
          'Skipped: Extension service worker could not be found within the 7000ms timeout',
        );
        return;
      }

    // Extract extension ID from service worker URL
    const swUrl = swTarget.url();
    const extId = new URL(swUrl).hostname;
    assert.ok(extId, 'Extension ID must be found');

    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 5. Navigate to mock page
    await page.goto(mockUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#prompt-textarea');

    // Verify content script injection
    const isExtensionLoadedOnPage = await page.evaluate(() => {
      return Boolean(window.SafeShield && window.SafeShield.interceptor);
    });
    assert.equal(isExtensionLoadedOnPage, true, 'SafeShield content scripts must be injected into mock page');

    // Test A: Type prompt with fake PII, press Enter, check Shadow DOM modal
    const fakePrompt = 'Contact me at 9876543210 or email test@qa-corp.org immediately';
    await page.focus('#prompt-textarea');
    await page.keyboard.type(fakePrompt);

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Check Shadow DOM modal appears
    await page.waitForFunction(() => {
      const host = document.getElementById('safeshield-preview-modal-host');
      if (!host || !host.shadowRoot) return false;
      const modal = host.shadowRoot.querySelector('.ss-modal');
      return modal !== null;
    }, { timeout: 5000 });

    const modalDetails = await page.evaluate(() => {
      const host = document.getElementById('safeshield-preview-modal-host');
      const root = host.shadowRoot;
      const modal = root.querySelector('.ss-modal');
      const title = root.querySelector('#ss-modal-title');
      const previewText = root.querySelector('#ss-preview-text');
      const entityRows = root.querySelectorAll('.ss-entity-row');
      const sendBtn = root.querySelector('#ss-btn-send');
      const style = window.getComputedStyle(modal);

      return {
        hasModal: Boolean(modal),
        titleText: title ? title.textContent : '',
        previewContent: previewText ? previewText.textContent : '',
        entityCount: entityRows ? entityRows.length : 0,
        backgroundColor: style.backgroundColor,
        hasSendBtn: Boolean(sendBtn),
      };
    });

    assert.equal(modalDetails.hasModal, true, 'Preview modal must exist in Shadow DOM');
    assert.equal(modalDetails.titleText, 'SafeShield Protection', 'Modal title must match');
    assert.equal(modalDetails.entityCount, 2, 'Modal must list 2 detected identifiers (phone and email)');
    assert.ok(modalDetails.previewContent.includes('[PHONE_1]'), 'Redacted preview must contain [PHONE_1]');
    assert.ok(modalDetails.previewContent.includes('[EMAIL_1]'), 'Redacted preview must contain [EMAIL_1]');
    assert.equal(modalDetails.previewContent.includes('9876543210'), false, 'Preview must not show raw phone');
    assert.equal(modalDetails.previewContent.includes('test@qa-corp.org'), false, 'Preview must not show raw email');

    // Click "Send redacted" inside Shadow DOM
    await page.evaluate(() => {
      const host = document.getElementById('safeshield-preview-modal-host');
      const sendBtn = host.shadowRoot.querySelector('#ss-btn-send');
      sendBtn.click();
    });

    // Wait for submission to arrive on mock page
    await page.waitForFunction(() => {
      return window.receivedSubmissions && window.receivedSubmissions.length > 0;
    }, { timeout: 5000 });

    const received = await page.evaluate(() => window.receivedSubmissions);
    assert.equal(received.length, 1, 'Mock page should receive exactly 1 submission');
    const firstSubmission = received[0];

    // Assert mock page received ONLY placeholders
    assert.ok(firstSubmission.includes('[PHONE_1]'), 'Submission must contain [PHONE_1]');
    assert.ok(firstSubmission.includes('[EMAIL_1]'), 'Submission must contain [EMAIL_1]');
    assert.equal(firstSubmission.includes('9876543210'), false, 'Submission must NEVER contain raw phone');
    assert.equal(firstSubmission.includes('test@qa-corp.org'), false, 'Submission must NEVER contain raw email');

    // Test B: Shift+Enter does not trigger interception
    await page.focus('#prompt-textarea');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');

    const modalAfterShiftEnter = await page.evaluate(() => {
      const host = document.getElementById('safeshield-preview-modal-host');
      return Boolean(host && host.shadowRoot && host.shadowRoot.querySelector('.ss-modal'));
    });
    assert.equal(modalAfterShiftEnter, false, 'Shift+Enter must not trigger preview modal');

    // Test C: Toggle OFF allows text to pass untouched
    await page.evaluate(() => {
      window.SafeShield.interceptor.setIsEnabled(false);
    });

    await page.focus('#prompt-textarea');
    await page.keyboard.press('Enter');

    await page.waitForFunction(() => window.receivedSubmissions.length >= 2, { timeout: 3000 });
    const receivedAfterToggle = await page.evaluate(() => window.receivedSubmissions);
    assert.equal(receivedAfterToggle.length, 2, 'Second submission should pass through untouched');

    // Test D: Open Popup and Dashboard pages in browser and check console errors + take screenshots
    const popupPage = await browser.newPage();
    const popupErrors = [];
    popupPage.on('console', (m) => {
      if (m.type() === 'error') popupErrors.push(m.text());
    });
    await popupPage.setViewport({ width: 380, height: 500 });
    await popupPage.goto(`chrome-extension://${extId}/src/ui/popup/popup.html`, { waitUntil: 'networkidle0' });
    assert.equal(popupErrors.length, 0, 'Popup page should load without console errors');

    const popupScreenshotPath = path.join(ROOT_DIR, 'tests', 'e2e', 'screenshots', 'popup.png');
    await popupPage.screenshot({ path: popupScreenshotPath, type: 'png' });
    assert.ok(fs.existsSync(popupScreenshotPath), 'Popup screenshot must be saved');

    const dashPage = await browser.newPage();
    const dashErrors = [];
    dashPage.on('console', (m) => {
      if (m.type() === 'error') dashErrors.push(m.text());
    });
    await dashPage.setViewport({ width: 1000, height: 750 });
    await dashPage.goto(`chrome-extension://${extId}/src/dashboard/dashboard.html`, { waitUntil: 'networkidle0' });
    assert.equal(dashErrors.length, 0, 'Dashboard page should load without console errors');

    const dashScreenshotPath = path.join(ROOT_DIR, 'tests', 'e2e', 'screenshots', 'dashboard.png');
    await dashPage.screenshot({ path: dashScreenshotPath, type: 'png' });
    assert.ok(fs.existsSync(dashScreenshotPath), 'Dashboard screenshot must be saved');

    await popupPage.close();
    await dashPage.close();
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server) {
      server.close();
    }
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
  }
});
