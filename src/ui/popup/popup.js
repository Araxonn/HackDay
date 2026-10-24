// SafeShield Popup Controller
document.addEventListener('DOMContentLoaded', async () => {
  const storage = SafeShield.storage;

  const toggle = document.getElementById('shield-toggle');
  const aiToggle = document.getElementById('ai-toggle');
  const statusCard = document.getElementById('status-card');
  const statusText = document.getElementById('status-text');
  const totalCountEl = document.getElementById('total-count');
  const statPhone = document.getElementById('stat-phone');
  const statEmail = document.getElementById('stat-email');
  const statAadhaar = document.getElementById('stat-aadhaar');
  const statPan = document.getElementById('stat-pan');
  const dashboardBtn = document.getElementById('open-dashboard-btn');
  const sendRedactedBtn = document.getElementById('send-redacted-btn');
  const sendRedactedFeedback = document.getElementById('send-redacted-feedback');

  function setStatusUI(state, message) {
    statusCard.className = `status-card status-${state}`;
    statusText.textContent = message;
    // Enable Send Redacted only when actively protecting a supported page
    if (sendRedactedBtn) {
      sendRedactedBtn.disabled = state !== 'active';
    }
  }

  function renderStats(stats) {
    stats = stats || {};
    const phone = stats.PHONE || 0;
    const email = stats.EMAIL || 0;
    const aadhaar = stats.AADHAAR || 0;
    const pan = stats.PAN || 0;
    const total = Object.values(stats).reduce(
      (acc, c) => acc + (typeof c === 'number' ? c : 0),
      0,
    );

    totalCountEl.textContent = `${total} protected`;
    statPhone.textContent = String(phone);
    statEmail.textContent = String(email);
    statAadhaar.textContent = String(aadhaar);
    statPan.textContent = String(pan);
  }

  function checkTabStatus(isEnabled) {
    if (!isEnabled) {
      setStatusUI('off', 'Protection paused');
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      setStatusUI('unsupported', 'Not supported on this page');
      return;
    }

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          setStatusUI('unsupported', 'Not supported on this page');
          return;
        }

        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          setStatusUI('unsupported', 'Not supported on this page');
          return;
        }

        // Send status request to content script (decide support only from response)
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: 'SS_GET_STATUS' },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              // Content script not loaded or page unsupported (e.g. "Receiving end does not exist")
              setStatusUI('unsupported', 'Not supported on this page');
              return;
            }

            // NEVER show "Active" unless state is strictly 'active'
            if (response.state === 'active') {
              setStatusUI('active', 'Active on this page');
            } else if (response.state === 'off') {
              setStatusUI('off', 'Protection paused');
            } else if (response.state === 'error') {
              setStatusUI('error', 'Protection error');
            } else {
              setStatusUI('unsupported', 'Not supported on this page');
            }
          },
        );
      });
    } catch {
      setStatusUI('unsupported', 'Not supported on this page');
    }
  }

  // Initialize toggle from storage
  const isEnabled = await storage.getEnabled();
  toggle.checked = isEnabled;
  checkTabStatus(isEnabled);

  if (aiToggle && typeof storage.getAiAssist === 'function') {
    const isAiEnabled = await storage.getAiAssist();
    aiToggle.checked = Boolean(isAiEnabled);

    aiToggle.addEventListener('change', async () => {
      await storage.setAiAssist(aiToggle.checked);
    });
  }

  // Load and render initial stats
  const initialStats = await storage.getStats();
  renderStats(initialStats);

  // Handle toggle switch change
  toggle.addEventListener('change', async () => {
    const nextVal = toggle.checked;
    await storage.setEnabled(nextVal);
    checkTabStatus(nextVal);
  });

  // Subscribe to live storage changes
  storage.onChange((change) => {
    if (change.key === 'enabled') {
      toggle.checked = Boolean(change.newValue);
      checkTabStatus(Boolean(change.newValue));
    }
    if (change.key === 'aiAssist' && aiToggle) {
      aiToggle.checked = Boolean(change.newValue);
    }
    if (change.key === 'stats') {
      renderStats(change.newValue);
    }
  });

  // Dashboard link click
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        chrome.runtime.openOptionsPage
      ) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('../dashboard/dashboard.html');
      }
    });
  }

  // Send Redacted button — triggers redaction flow in the content script
  if (sendRedactedBtn) {
    // Start disabled; setStatusUI will enable it once we know the page is active
    sendRedactedBtn.disabled = true;

    sendRedactedBtn.addEventListener('click', () => {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return;

      sendRedactedBtn.disabled = true;
      showFeedback('', '');

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          showFeedback('Could not reach the page.', 'error');
          sendRedactedBtn.disabled = false;
          return;
        }
        const tabId = tabs[0] && tabs[0].id;
        if (!tabId) {
          showFeedback('No active tab found.', 'error');
          sendRedactedBtn.disabled = false;
          return;
        }

        chrome.tabs.sendMessage(tabId, { type: 'SS_SEND_REDACTED' }, (response) => {
          if (chrome.runtime.lastError) {
            showFeedback('Extension not active on this page.', 'error');
            sendRedactedBtn.disabled = false;
            return;
          }
          if (response && response.ok) {
            showFeedback('✓ Redaction triggered — review the preview.', 'success');
          } else if (response && response.reason === 'no_pii') {
            showFeedback('No PII detected — prompt sent as-is.', 'success');
          } else if (response && response.reason === 'disabled') {
            showFeedback('Protection is off.', 'error');
          } else {
            showFeedback(response && response.message ? response.message : 'Blocked — see page for details.', 'error');
          }
          sendRedactedBtn.disabled = false;
        });
      });
    });
  }

  function showFeedback(msg, type) {
    if (!sendRedactedFeedback) return;
    sendRedactedFeedback.textContent = msg;
    sendRedactedFeedback.className = 'send-redacted-feedback' + (type ? ` ${type}` : '');
  }
});
