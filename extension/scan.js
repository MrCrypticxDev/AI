// Basic prompt scanner and OpenClaw gateway client (WebExtension-friendly)

function runPatternScan(prompt) {
  const patterns = [
    { re: /\b[A-Za-z0-9_]{20,}\b/g, label: 'generic_api_key', severity: 'medium' },
    { re: /\b[0-9]{3}-?[0-9]{2}-?[0-9]{4}\b/g, label: 'pii_ssn', severity: 'high' },
    { re: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, label: 'pii_cc', severity: 'high' },
    { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: 'pii_email', severity: 'medium' },
  ]

  const issues = []
  let redacted = prompt

  for (const def of patterns) {
    const matches = [...prompt.matchAll(def.re)]
    for (const match of matches) {
      const raw = match[0]
      if (raw.length < 8) continue
      const tag = `[REDACTED-${def.label.toUpperCase()}]`
      issues.push({ type: def.label, severity: def.severity, match: raw, redacted: tag, explanation: `Detected ${def.label}` })
      redacted = redacted.replaceAll(raw, tag)
    }
  }

  return { issues, redacted }
}

function uiSetText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

function getStoredSettings() {
  return browser.storage.local.get(['openclawBaseUrl', 'openclawToken', 'openclawModel'])
}

function saveSettings(settings) {
  return browser.storage.local.set(settings)
}

async function runAiScan(prompt) {
  const { openclawBaseUrl, openclawToken, openclawModel } = await getStoredSettings()

  if (!openclawBaseUrl || !openclawToken) {
    throw new Error('OpenClaw gateway URL and token are required in Options.')
  }

  // Try WebSocket gateway (the default OpenClaw gateway mode)
  const wsUrl = openclawBaseUrl.startsWith('ws://') || openclawBaseUrl.startsWith('wss://')
    ? openclawBaseUrl
    : openclawBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const id = Math.random().toString(36).slice(2)
    const payload = {
      type: 'req',
      id,
      method: 'chat.send',
      params: {
        message: prompt,
        deliver: false,
      },
      token: openclawToken,
    }

    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('WebSocket timeout'))
    }, 12000)

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify(payload))
    })

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'res' && msg.id === id) {
          clearTimeout(timeout)
          ws.close()
          if (msg.ok) {
            resolve(msg.payload)
          } else {
            reject(new Error(msg.error?.message || 'OpenClaw error'))
          }
        }
      } catch (err) {
        // ignore
      }
    })

    ws.addEventListener('error', (err) => {
      clearTimeout(timeout)
      ws.close()
      reject(new Error('WebSocket error'))
    })
  })
}

async function scanPrompt() {
  const prompt = document.getElementById('prompt').value
  if (!prompt || prompt.trim().length === 0) return

  const resultEl = document.getElementById('result')
  resultEl.className = ''
  uiSetText('result', 'Scanning...')

  const { issues, redacted } = runPatternScan(prompt)
  const baseScore = issues.length ? Math.min(20 + issues.length * 15, 100) : 0

  // Format a human-readable result
  function formatResult(score, patternIssues, aiIssues, recommendation) {
    const level = score >= 80 ? '🔴 CRITICAL' : score >= 50 ? '🟠 HIGH' : score >= 20 ? '🟡 MEDIUM' : '🟢 CLEAN'
    let out = `Risk: ${level} (${score}/100)\n`
    if (patternIssues.length) {
      out += `\nPattern matches (${patternIssues.length}):\n`
      for (const i of patternIssues) {
        const preview = i.match.length > 30 ? i.match.slice(0, 30) + '…' : i.match
        out += `  • [${i.severity.toUpperCase()}] ${i.type} — ${preview}\n`
      }
    }
    if (aiIssues && aiIssues.length) {
      out += `\nAI findings (${aiIssues.length}):\n`
      for (const i of aiIssues) out += `  • ${i}\n`
    }
    if (recommendation) out += `\n${recommendation}`
    return out.trim()
  }

  try {
    const aiResult = await runAiScan(redacted)
    const aiIssues = aiResult.aiIssues ?? []
    const score = Math.max(baseScore, aiResult.riskScore ?? 0)
    const text = formatResult(score, issues, aiIssues, aiResult.recommendation)
    uiSetText('result', text)
    resultEl.className = issues.length || aiIssues.length ? 'has-issues' : 'clean'
  } catch (_err) {
    const text = formatResult(baseScore, issues, [], null)
    uiSetText('result', text + (issues.length === 0 ? '' : '\n\n(AI scan unavailable — pattern scan only)'))
    resultEl.className = issues.length ? 'has-issues' : 'clean'
  }
}

function updateSiteStatus(host, disabled) {
  const statusEl = document.getElementById('siteStatus')
  const toggleEl = document.getElementById('siteToggle')
  if (!statusEl || !toggleEl) return
  statusEl.textContent = disabled ? '⛔ Disabled on this site' : '🟢 Watching this site'
  statusEl.className   = 'site-status ' + (disabled ? 'disabled' : 'active')
  toggleEl.textContent = disabled ? '✓ Re-enable' : 'Disable here'
  toggleEl.className   = 'btn btn-sm ' + (disabled ? 'btn-primary' : 'btn-ghost')
}

async function setup() {
  document.getElementById('scan').addEventListener('click', scanPrompt)
  document.getElementById('options').addEventListener('click', () => {
    browser.runtime.openOptionsPage()
  })

  // ─ Site status toggle ────────────────────────────────────────────────────────────
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const url   = tab && tab.url ? new URL(tab.url) : null
    const host  = url && url.protocol.startsWith('http') ? url.hostname : null
    if (host) {
      document.getElementById('siteHost').textContent = host
      const v = await browser.storage.local.get(['disabledHosts'])
      const disabled = (v.disabledHosts || []).includes(host)
      updateSiteStatus(host, disabled)
      document.getElementById('siteToggle').addEventListener('click', async () => {
        const v2    = await browser.storage.local.get(['disabledHosts'])
        const hosts = v2.disabledHosts || []
        const isNowDisabled = hosts.includes(host)
        const next  = isNowDisabled ? hosts.filter(h => h !== host) : [...hosts, host]
        await browser.storage.local.set({ disabledHosts: next })
        updateSiteStatus(host, !isNowDisabled)
      })
    } else {
      const row = document.getElementById('siteRow')
      if (row) row.style.display = 'none'
    }
  } catch (_) {
    const row = document.getElementById('siteRow')
    if (row) row.style.display = 'none'
  }
}

setup().catch(console.error)
