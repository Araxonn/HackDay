// SafeShield Detection Preview Modal & Warning Banner
// Rendered inside an isolated Shadow DOM
globalThis.SafeShield = globalThis.SafeShield || {};

(function () {
  let hostEl = null;
  let shadowRoot = null;
  let activeWarningEl = null;

  function maskValue(val) {
    if (!val || typeof val !== 'string') return '';
    const str = val.trim();
    if (str.length <= 4) {
      return str.length > 2 ? `${str[0]}••${str.slice(-1)}` : '••••';
    }
    const first2 = str.slice(0, 2);
    const last2 = str.slice(-2);
    const maskLen = Math.min(Math.max(str.length - 4, 3), 10);
    return `${first2}${'•'.repeat(maskLen)}${last2}`;
  }

  function getShadowRoot() {
    if (!shadowRoot) {
      hostEl = document.createElement('div');
      hostEl.id = 'safeshield-preview-modal-host';
      hostEl.setAttribute('data-safeshield', 'true');
      document.body.appendChild(hostEl);
      shadowRoot = hostEl.attachShadow({ mode: 'open' });

      // Embed modal styles into shadow DOM
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #0f172a; }
        .ss-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2147483647; padding: 16px; box-sizing: border-box; }
        .ss-modal { background: #ffffff; color: #0f172a; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25); width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; border: 1px solid #e2e8f0; }
        @media (prefers-color-scheme: dark) { .ss-modal { background: #1e293b; color: #f8fafc; border-color: #334155; } }
        .ss-header { padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
        @media (prefers-color-scheme: dark) { .ss-header { border-color: #334155; } }
        .ss-header-title-wrap { display: flex; align-items: center; gap: 8px; }
        .ss-title { margin: 0; font-size: 15px; font-weight: 700; color: inherit; }
        .ss-close-btn { background: transparent; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
        .ss-close-btn:hover { background-color: #f1f5f9; color: #0f172a; }
        @media (prefers-color-scheme: dark) { .ss-close-btn:hover { background-color: #334155; color: #f8fafc; } }
        .ss-body { padding: 14px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
        .ss-banner { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: #047857; font-weight: 500; }
        @media (prefers-color-scheme: dark) { .ss-banner { color: #34d399; background: rgba(16, 185, 129, 0.15); } }
        .ss-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 4px 0; }
        @media (prefers-color-scheme: dark) { .ss-section-title { color: #94a3b8; } }
        .ss-entity-list { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; }
        .ss-entity-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12.5px; }
        @media (prefers-color-scheme: dark) { .ss-entity-row { background: #0f172a; border-color: #334155; } }
        .ss-entity-left { display: flex; align-items: center; gap: 6px; }
        .ss-type-tag { font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: #e2e8f0; color: #334155; }
        @media (prefers-color-scheme: dark) { .ss-type-tag { background: #334155; color: #cbd5e1; } }
        .ss-placeholder-tag { font-family: monospace; font-size: 11.5px; font-weight: 600; color: #047857; }
        @media (prefers-color-scheme: dark) { .ss-placeholder-tag { color: #34d399; } }
        .ss-masked-val { font-family: monospace; font-size: 11.5px; color: #64748b; }
        @media (prefers-color-scheme: dark) { .ss-masked-val { color: #94a3b8; } }
        .ss-preview-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; font-size: 12.5px; line-height: 1.4; max-height: 120px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; color: inherit; }
        @media (prefers-color-scheme: dark) { .ss-preview-box { background: #0f172a; border-color: #334155; } }
        .ss-footer { padding: 12px 18px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-end; gap: 8px; background: #f8fafc; }
        @media (prefers-color-scheme: dark) { .ss-footer { border-color: #334155; background: #1e293b; } }
        .ss-btn { display: inline-flex; align-items: center; justify-content: center; padding: 7px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: 0.15s; border: 1px solid transparent; }
        .ss-btn:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
        .ss-btn-primary { background: #10b981; color: #ffffff; }
        .ss-btn-primary:hover { background: #059669; }
        .ss-btn-secondary { background: #ffffff; color: #334155; border-color: #cbd5e1; }
        .ss-btn-secondary:hover { background: #f1f5f9; color: #0f172a; }
        @media (prefers-color-scheme: dark) { .ss-btn-secondary { background: #334155; color: #f8fafc; border-color: #475569; } .ss-btn-secondary:hover { background: #475569; } }
        .ss-btn-cancel { background: transparent; color: #64748b; }
        .ss-btn-cancel:hover { color: #0f172a; }
        @media (prefers-color-scheme: dark) { .ss-btn-cancel:hover { color: #f8fafc; } }
        .ss-warn-banner { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ef4444; color: #ffffff; font-weight: 600; font-size: 13.5px; padding: 10px 18px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); z-index: 2147483647; display: flex; align-items: center; gap: 10px; max-width: 90vw; }
        .ss-warn-close { background: transparent; border: none; color: #ffffff; font-size: 16px; cursor: pointer; padding: 0 4px; }
      `;
      shadowRoot.appendChild(styleEl);
    }
    return shadowRoot;
  }

  function show(params) {
    const { redactedText, entities, counts, note } = params || {};
    return new Promise((resolve) => {
      const root = getShadowRoot();
      const previousActiveEl = document.activeElement;

      const backdrop = document.createElement('div');
      backdrop.className = 'ss-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'ss-modal-title');

      const totalItems = Object.values(counts || {}).reduce((a, b) => a + b, 0);
      const noteBanner = note
        ? `<div class="ss-banner" style="background: rgba(245, 158, 11, 0.15); color: #d97706; border-color: rgba(245, 158, 11, 0.3); margin-bottom: 8px;">ℹ️ ${note}</div>`
        : '';

      const entityRows = (entities || [])
        .map(
          (e) => `
          <div class="ss-entity-row">
            <div class="ss-entity-left">
              <span class="ss-type-tag">${e.type}</span>
              <span class="ss-placeholder-tag">${e.placeholder}</span>
            </div>
            <span class="ss-masked-val" title="Masked preview">${maskValue(e.original)}</span>
          </div>
        `,
        )
        .join('');

      backdrop.innerHTML = `
        <div class="ss-modal">
          <div class="ss-header">
            <div class="ss-header-title-wrap">
              <svg class="ss-shield-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <h2 id="ss-modal-title" class="ss-title">SafeShield Protection</h2>
            </div>
            <button type="button" class="ss-close-btn" id="ss-close-x" aria-label="Cancel and close">&times;</button>
          </div>
          <div class="ss-body">
            ${noteBanner}
            <div class="ss-banner">
              🛡️ ${totalItems} sensitive item${totalItems === 1 ? '' : 's'} detected and redacted locally before sending.
            </div>

            <div>
              <div class="ss-section-title">Detected Identifiers</div>
              <div class="ss-entity-list">
                ${entityRows}
              </div>
            </div>

            <div>
              <div class="ss-section-title">Redacted Prompt Preview</div>
              <div class="ss-preview-box" id="ss-preview-text"></div>
            </div>
          </div>
          <div class="ss-footer">
            <button type="button" class="ss-btn ss-btn-cancel" id="ss-btn-cancel" aria-label="Cancel send">Cancel</button>
            <button type="button" class="ss-btn ss-btn-secondary" id="ss-btn-restore" title="Restore sensitive values locally for editing without sending">Restore original</button>
            <button type="button" class="ss-btn ss-btn-primary" id="ss-btn-send" aria-label="Send redacted prompt">Send redacted</button>
          </div>
        </div>
      `;

      // Set textContent safely to prevent any injection
      backdrop.querySelector('#ss-preview-text').textContent = redactedText;

      root.appendChild(backdrop);

      // Focus trapping & keyboard listeners
      const sendBtn = backdrop.querySelector('#ss-btn-send');
      const restoreBtn = backdrop.querySelector('#ss-btn-restore');
      const cancelBtn = backdrop.querySelector('#ss-btn-cancel');
      const closeX = backdrop.querySelector('#ss-close-x');

      const focusable = [sendBtn, restoreBtn, cancelBtn, closeX];
      sendBtn.focus();

      function cleanup(action) {
        document.removeEventListener('keydown', onKeyDown, true);
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
        if (previousActiveEl && typeof previousActiveEl.focus === 'function') {
          previousActiveEl.focus();
        }
        resolve({ action });
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup('cancel');
          return;
        }

        if (e.key === 'Tab') {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (
              shadowRoot.activeElement === first ||
              document.activeElement === hostEl
            ) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (shadowRoot.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }

      document.addEventListener('keydown', onKeyDown, true);

      sendBtn.addEventListener('click', () => cleanup('send'));
      restoreBtn.addEventListener('click', () => cleanup('restore'));
      cancelBtn.addEventListener('click', () => cleanup('cancel'));
      closeX.addEventListener('click', () => cleanup('cancel'));
    });
  }

  function warn(message) {
    const root = getShadowRoot();

    if (activeWarningEl && activeWarningEl.parentNode) {
      activeWarningEl.parentNode.removeChild(activeWarningEl);
    }

    const banner = document.createElement('div');
    banner.className = 'ss-warn-banner';
    banner.setAttribute('role', 'alert');

    const textSpan = document.createElement('span');
    textSpan.textContent = `⚠️ ${message || 'Send blocked: protection could not run'}`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ss-warn-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Dismiss warning');
    closeBtn.onclick = () => {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    };

    banner.appendChild(textSpan);
    banner.appendChild(closeBtn);
    root.appendChild(banner);
    activeWarningEl = banner;

    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 6000);
  }

  const modal = {
    show,
    warn,
    _maskValue: maskValue,
  };

  SafeShield.modal = modal;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeShield.modal;
  }
})();
