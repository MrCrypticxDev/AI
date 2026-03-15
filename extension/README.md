# 🔒 SecretWatch

**SecretWatch** is a Firefox extension that silently watches every text field on every page and blocks accidental secret leaks before you hit send.

---

## What It Does

When you press **Enter** in any chat box, search bar, or text field, SecretWatch scans your message for:

| Type | Examples |
|------|---------|
| API Keys | `sk-...`, `sk-api-...`, `sk-cp-...` |
| GitHub Tokens | `ghp_...` |
| AWS Access Keys | `AKIA...` |
| Private Keys | `-----BEGIN RSA PRIVATE KEY-----` |
| SSNs | `123-45-6789` |
| Credit Cards | Visa, Mastercard, Amex patterns |
| Email Addresses | `user@domain.com` |
| Long tokens / secrets | Any 40+ character alphanumeric string |

If secrets are found, a modal pops up with three options:

- **🧹 Sanitize & Send** — replaces secrets with `[REDACTED-...]` tags and sends the sanitized version
- **Send Anyway** — sends the original text unchanged  
- **Cancel** — blocks the send so you can edit manually

---

## Installation (Firefox)

1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to this `extension/` folder and select `manifest.json`
5. SecretWatch is now active — the 🔒 icon appears in your toolbar

> **Note:** Temporary add-ons are removed when Firefox restarts. For a permanent install, the extension needs to be signed by Mozilla (see [Distribute your extension](https://extensionworkshop.com/documentation/publish/)).

---

## Using the Popup

Click the **🔒** icon in the Firefox toolbar to open the popup:

- **Manual Scan** — paste any text and click **🔍 Scan** to see a risk report
- **⚙ Settings** — configure your OpenClaw gateway (optional, for AI-enhanced scanning)
- The **Active** indicator confirms SecretWatch is monitoring all tabs

---

## Settings (Optional AI Scanning)

SecretWatch works fully offline using pattern matching with no configuration needed.

Optionally, connect it to a local [OpenClaw](https://openclaw.dev) AI gateway for deeper analysis:

1. Click **⚙ Settings** in the popup (or go to `about:addons` → SecretWatch → Preferences)
2. Fill in:
   - **Gateway URL** — your OpenClaw WebSocket endpoint (e.g. `ws://127.0.0.1:18789`)
   - **Gateway Token** — your `sk-cp-...` token
   - **Model** — model name (e.g. `MiniMax-M2.5`)
3. Click **Save Settings**

If no gateway is configured, SecretWatch falls back to pattern-only scanning which catches all the common secret formats.

---

## File Structure

```
extension/
├── manifest.json     # Extension manifest (MV3)
├── content.js        # Injected into every page — intercepts Enter, shows modal
├── scan.js           # Popup scan logic + AI gateway client
├── background.js     # Sets default storage on install
├── popup.html        # Toolbar popup UI
├── options.html      # Settings page
├── options.js        # Settings save/load logic
└── README.md         # This file
```

---

## How Sanitize Works

When you click **Sanitize & Send**:

1. Each detected secret is replaced with a clearly labelled tag, e.g.:
   - `sk-api-abc123...` → `[REDACTED-API_KEY_(SK-)]`
   - `user@gmail.com` → `[REDACTED-EMAIL_ADDRESS]`
2. The sanitized text is written back to the input field, triggering framework state updates (works with React, Vue, ProseMirror, Lexical, etc.)
3. The page's own send button is clicked, so the message goes through normally — just without the secrets

---

## Supported Sites

SecretWatch works on all sites that use standard `<textarea>`, `<input>`, or `contenteditable` elements, including:

- ChatGPT, Claude, Gemini, Copilot
- Slack, Discord, Teams (web)
- GitHub, GitLab issues/PRs
- Any form or text input on any page
