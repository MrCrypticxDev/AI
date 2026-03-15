/**
 * SecretWatch content script
 * Intercepts Enter keypresses and form submits on any page,
 * scans for secrets, and shows a modal before allowing the send.
 */
(function () {
  'use strict';

  function luhn(cardLike) {
    const digits = String(cardLike).replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = Number(digits[i]);
      if (dbl) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  // ── Site-disable state ────────────────────────────────────────────────────
  const HOST = location.hostname;
  let siteDisabled = false;

  browser.storage.local.get(['disabledHosts']).then(v => {
    siteDisabled = (v.disabledHosts || []).includes(HOST);
  }).catch(() => {});

  browser.storage.onChanged.addListener((changes) => {
    if (changes.disabledHosts) {
      siteDisabled = (changes.disabledHosts.newValue || []).includes(HOST);
    }
  });

  // ── Patterns ────────────────────────────────────────────────────────────────
  const PATTERNS = [
    { re: /sk-[a-zA-Z0-9\-_]{20,}/g,                          label: 'API Key (sk-)',    severity: 'high' },
    { re: /ghp_[a-zA-Z0-9]{36}/g,                             label: 'GitHub Token',     severity: 'high' },
    { re: /AKIA[0-9A-Z]{16}/g,                                label: 'AWS Access Key',   severity: 'high' },
    { re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, label: 'Private Key',   severity: 'critical' },
    { re: /https?:\/\/[^\s"'<>]*(?:token|api[_-]?key|auth|password|secret)=[^\s"'<>]+/gi, label: 'Sensitive URL Query', severity: 'high' },
    { re: /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})[^\s"'<>]*/gi, label: 'Internal URL', severity: 'medium' },
    { re: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,                 label: 'SSN',              severity: 'high' },
    { re: /\b(?:\d[ -]?){13,19}\b/g, label: 'Credit Card', severity: 'high', validate: luhn },
    { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'Email Address',   severity: 'medium' },
    { re: /\b[a-zA-Z0-9_\-]{40,}\b/g,                        label: 'Long Token/Secret', severity: 'medium' },
  ];

  function scanText(text) {
    const issues = [];
    let redacted = text;
    const seen = new Set();

    for (const def of PATTERNS) {
      def.re.lastIndex = 0;
      const matches = [...text.matchAll(def.re)];
      for (const m of matches) {
        const raw = m[0];
        if (raw.length < 8 || seen.has(raw)) continue;
        if (def.validate && !def.validate(raw)) continue;
        seen.add(raw);
        const tag = `[REDACTED-${def.label.toUpperCase().replace(/[\s/()]/g, '_')}]`;
        issues.push({ label: def.label, severity: def.severity, value: raw, tag });
        redacted = redacted.split(raw).join(tag);
      }
    }

    return { issues, redacted };
  }

  // ── DOM helpers ─────────────────────────────────────────────────────────────
  function getText(el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value;
    return el.innerText || el.textContent || '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setText(el, text) {
    el.focus();
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      // Use native React/Vue-compatible setter
      const proto = el.tagName === 'INPUT'
        ? window.HTMLInputElement.prototype
        : window.HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(el, text);
      } else {
        el.value = text;
      }
    } else {
      // contenteditable — clear all children and insert a plain text node
      // This avoids execCommand (deprecated) and works with ProseMirror/Lexical/Draft.js
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // Fire both input and change so React/Vue controlled state updates
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Find the nearest "Send" button to the editable element
  function findSendButton(el) {
    const SEND_SELECTORS = [
      'button[type="submit"]',
      'button[aria-label*="send" i]',
      'button[data-testid*="send" i]',
      'button[title*="send" i]',
      '[role="button"][aria-label*="send" i]',
      '[role="button"][data-testid*="send" i]',
    ].join(',');

    const form = el.closest('form');
    if (form) {
      const btn = form.querySelector(SEND_SELECTORS);
      if (btn) return btn;
    }
    let p = el.parentElement;
    for (let i = 0; i < 8; i++) {
      if (!p) break;
      const btn = p.querySelector(SEND_SELECTORS);
      if (btn && !btn.contains(el)) return btn;
      p = p.parentElement;
    }
    return null;
  }

  // ── Modal ───────────────────────────────────────────────────────────────────
  const SEV_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308' };

  function showModal(issues, host) {
    return new Promise((resolve) => {
      if (document.getElementById('pg-overlay')) return resolve('cancel');

      const overlay = document.createElement('div');
      overlay.id = 'pg-overlay';
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.65)',
        'z-index:2147483647', 'display:flex', 'align-items:center',
        'justify-content:center', 'font-family:system-ui,sans-serif',
      ].join(';');

      const issueRows = issues.map(i => {
        const color = SEV_COLOR[i.severity] || '#94a3b8';
        const rawPreview = i.value.length > 36 ? i.value.slice(0, 36) + '\u2026' : i.value;
        const preview = escapeHtml(rawPreview);
        const label = escapeHtml(i.label);
        return `<li style="color:${color};margin:5px 0;font-size:13px">
          <strong>${label}</strong>
          <code style="margin-left:6px;background:#1e293b;padding:2px 7px;border-radius:4px;font-size:11px">${preview}</code>
        </li>`;
      }).join('');

      overlay.innerHTML = `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:14px;padding:28px 30px;max-width:500px;width:92%;color:#f1f5f9;box-shadow:0 30px 60px rgba(0,0,0,0.6)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <span style="font-size:26px">🛡️</span>
            <div>
              <h2 style="margin:0;font-size:16px;font-weight:700">Secrets Detected</h2>
              <p style="margin:2px 0 0;font-size:12px;color:#64748b">SecretWatch found sensitive content before sending</p>
            </div>
          </div>
          <ul style="margin:0 0 20px;padding-left:18px;line-height:1.7">${issueRows}</ul>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button id="pg-sanitize" style="padding:10px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
              🧹 Sanitize &amp; Send
            </button>
            <button id="pg-send" style="padding:10px;background:#1e293b;color:#cbd5e1;border:1px solid #475569;border-radius:8px;cursor:pointer;font-size:13px">
              Send Anyway
            </button>
            <button id="pg-cancel" style="padding:10px;background:#1e293b;color:#cbd5e1;border:1px solid #475569;border-radius:8px;cursor:pointer;font-size:13px">
              Cancel
            </button>
            <button id="pg-disable" style="padding:10px;background:#1e293b;color:#64748b;border:1px solid #334155;border-radius:8px;cursor:pointer;font-size:11px">
              🔕 Disable for ${escapeHtml(host)}
            </button>
          </div>
        </div>`;

      document.body.appendChild(overlay);

      const done = (choice) => { overlay.remove(); resolve(choice); };
      overlay.querySelector('#pg-sanitize').onclick = () => done('sanitize');
      overlay.querySelector('#pg-send').onclick     = () => done('send');
      overlay.querySelector('#pg-cancel').onclick   = () => done('cancel');
      overlay.querySelector('#pg-disable').onclick  = () => done('disable-site');
      overlay.addEventListener('click', (e) => { if (e.target === overlay) done('cancel'); });
    });
  }

  // ── Core intercept logic ─────────────────────────────────────────────────────
  // Track elements currently being re-dispatched so we don't re-block them
  let skipNext = 0;

  async function intercept(event, el) {
    if (skipNext > 0) { skipNext--; return; }
    if (siteDisabled) return;

    const text = getText(el);
    if (!text || text.trim().length < 8) return;

    const { issues, redacted } = scanText(text);
    if (issues.length === 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const choice = await showModal(issues, HOST);
    if (choice === 'cancel') return;
    if (choice === 'disable-site') {
      siteDisabled = true;
      browser.storage.local.get(['disabledHosts']).then(v => {
        const hosts = v.disabledHosts || [];
        if (!hosts.includes(HOST)) hosts.push(HOST);
        browser.storage.local.set({ disabledHosts: hosts });
      }).catch(() => {});
      // fall through — send the message unchanged
    }
    if (choice === 'sanitize') {
      setText(el, redacted);
      // Wait for React/Vue to process the input event before sending
      await new Promise(r => setTimeout(r, 80));
    }

    // Prefer clicking the actual send button so the app reads updated state
    const sendBtn = findSendButton(el);
    if (sendBtn) {
      sendBtn.click();
      return;
    }

    // Fallback: re-dispatch the original event (bypass our handler this time)
    skipNext++;
    if (event.type === 'keydown') {
      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true,
      }));
    } else if (event.type === 'submit') {
      const form = event.target instanceof HTMLFormElement ? event.target : el.closest('form');
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
    }
  }

  // ── Attach to editable elements ──────────────────────────────────────────────
  const attached = new WeakSet();

  function isEditable(el) {
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'email', 'url', 'password'].includes(t);
    }
    return false;
  }

  function attachTo(el) {
    if (!isEditable(el) || attached.has(el)) return;
    attached.add(el);

    el.addEventListener('keydown', (e) => {
      // Shift+Enter = newline in most chat UIs, plain Enter = send
      if (e.key === 'Enter' && !e.shiftKey) intercept(e, el);
    }, true); // capture so we run before the page's handler
  }

  // Form submits (traditional pages)
  document.addEventListener('submit', (e) => {
    const active = document.activeElement;
    const el = active && e.target.contains(active) ? active : e.target;
    intercept(e, el);
  }, true);

  // Observe DOM for dynamically added elements (SPAs like ChatGPT, Claude, etc.)
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        attachTo(node);
        node.querySelectorAll('[contenteditable],textarea,input').forEach(attachTo);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Attach to elements already on the page
  document.querySelectorAll('[contenteditable],textarea,input').forEach(attachTo);
})();
