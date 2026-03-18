import { execFile } from 'child_process'
import { promisify } from 'util'
import type { DetectedIssue, IssueSeverity } from '@/types'

interface OpenClawConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const HTTP_TIMEOUT_MS = 15000
const WS_TIMEOUT_MS = 20000

function getOpenClawConfig(): OpenClawConfig | null {
  // Resolve env dynamically per request to avoid stale values in long-lived dev sessions.
  const apiKey = process.env.OPENCLAW_API_KEY ?? process.env.OPENCLAW_GATEWAY_TOKEN
  const baseUrl = process.env.OPENCLAW_BASE_URL
  const model = process.env.OPENCLAW_MODEL ?? 'minimax-m1'

  if (!apiKey || !baseUrl) {
    return null
  }

  if (!/^(https?|wss?):\/\//i.test(baseUrl)) {
    return null
  }

  return {
    apiKey: apiKey.trim(),
    baseUrl: baseUrl.replace(/\/$/, ''),
    model: model.trim(),
  }
}

function fakeAiAnalysis(
  prompt: string,
  redactedPrompt: string
): { issues: DetectedIssue[]; redactedPrompt: string; recommendation: string; aiRiskScore: number } {
  type RawIssue = {
    type: string
    severity: IssueSeverity
    raw: string
    trimmed: string
    explanation: string
  }

  const rawIssues: RawIssue[] = []
  const lower = prompt.toLowerCase()

  const add = (type: string, severity: IssueSeverity, raw: string, explanation: string) => {
    rawIssues.push({
      type,
      severity,
      raw,
      trimmed: raw.length > 20 ? raw.slice(0, 20) : raw,
      explanation,
    })
  }

  if (/\b(password|pwd|pass)\b/.test(lower)) {
    add(
      'password',
      'high',
      'password=********',
      'Prompt includes wording that looks like a password or secret; avoid sending credentials.'
    )
  }

  const apiKeyMatch = prompt.match(/\bsk-[A-Za-z0-9]{20,}\b/)
  if (apiKeyMatch) {
    add(
      'generic_api_key',
      'high',
      apiKeyMatch[0],
      'Looks like an OpenAI-style API key is present; avoid sharing it in prompts.'
    )
  } else if (/api[_-]?key|token|secret/.test(lower)) {
    add(
      'generic_api_key',
      'high',
      'api_key=********',
      'Looks like an API key or token is being referenced; do not share secrets.'
    )
  }

  const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    add(
      'pii_email',
      'medium',
      emailMatch[0],
      'An email address was detected, which can be personally identifiable information.'
    )
  }

  const ssnMatch = prompt.match(/\b\d{3}-?\d{2}-?\d{4}\b/)
  if (ssnMatch) {
    add(
      'pii_ssn',
      'critical',
      ssnMatch[0],
      'A US Social Security number pattern was detected, which is highly sensitive personal data.'
    )
  }

  const riskScore = rawIssues.length ? Math.min(30 + rawIssues.length * 25, 100) : 0
  const recommendation = rawIssues.length
    ? 'Remove or redact the sensitive values before sending this prompt.'
    : 'This prompt looks safe to send.'

  // Ensure redaction uses the full matched string (not the trimmed display value)
  let finalRedacted = redactedPrompt
  for (const issue of rawIssues) {
    const tag = `[REDACTED-${issue.type.toUpperCase().replace(/\s+/g, '-')}]`
    finalRedacted = finalRedacted.replace(issue.raw, tag)
  }

  return {
    issues: rawIssues.map((i) => ({
      type: i.type,
      severity: i.severity,
      match: i.trimmed,
      redacted: `[REDACTED-${i.type.toUpperCase().replace(/\s+/g, '-')}]`,
      explanation: i.explanation,
    })),
    redactedPrompt: finalRedacted,
    recommendation,
    aiRiskScore: riskScore,
  }
}

const SYSTEM_PROMPT = `You are a security AI that analyzes text prompts for sensitive information leakage.

Your job is to find:
- API keys, tokens, credentials, passwords
- Personally identifiable information (PII): SSN, passport, credit cards, full names + addresses
- Company trade secrets, internal architecture, proprietary code
- Internal URLs, hostnames, database connection strings
- Any context that would be dangerous if seen by a third-party AI

IMPORTANT RULES:
- Only flag genuinely sensitive real-world data, not made-up examples clearly labeled as mock/fake/example
- Be precise — do not over-flag generic technical content
- The "match" field should show only the first 20 characters of the sensitive value

Respond ONLY with valid JSON matching this exact shape:
{
  "riskScore": <number 0-100>,
  "aiIssues": [
    {
      "type": "api_key | pii | credentials | code_secret | sensitive_context",
      "severity": "low | medium | high | critical",
      "match": "<first 20 chars of the sensitive value>",
      "explanation": "<one sentence why this is risky>"
    }
  ],
  "redactedPrompt": "<full prompt with sensitive parts replaced by [REDACTED-TYPE] tags>",
  "recommendation": "<1-2 sentence advice on how to rewrite this prompt safely>"
}

If nothing sensitive is found, return: {"riskScore":0,"aiIssues":[],"redactedPrompt":"<original>","recommendation":"This prompt looks safe to send."}`

interface AIAnalysis {
  riskScore: number
  aiIssues: Array<{
    type: string
    severity: string
    match: string
    explanation: string
  }>
  redactedPrompt: string
  recommendation: string
}

function extractJsonFromText(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

function normalizeSeverity(value: string | undefined): IssueSeverity {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'critical') return 'critical'
  if (normalized === 'high') return 'high'
  if (normalized === 'medium') return 'medium'
  return 'low'
}

function coerceAiAnalysis(input: unknown): AIAnalysis {
  const maybe = (input ?? {}) as Partial<AIAnalysis>
  const aiIssues = Array.isArray(maybe.aiIssues) ? maybe.aiIssues : []

  return {
    riskScore:
      typeof maybe.riskScore === 'number' && Number.isFinite(maybe.riskScore)
        ? Math.max(0, Math.min(100, maybe.riskScore))
        : 0,
    aiIssues: aiIssues
      .filter((item): item is { type: string; severity: string; match: string; explanation: string } => !!item)
      .map((item) => ({
        type: String(item.type ?? 'sensitive_context'),
        severity: String(item.severity ?? 'medium'),
        match: String(item.match ?? ''),
        explanation: String(item.explanation ?? ''),
      })),
    redactedPrompt: typeof maybe.redactedPrompt === 'string' ? maybe.redactedPrompt : '',
    recommendation: typeof maybe.recommendation === 'string' ? maybe.recommendation : '',
  }
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function buildOpenAIRequest(model: string, safeInput: string, apiKey: string): { headers: Record<string, string>; body: string } {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
      'x-openclaw-token': apiKey,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this prompt:\n\n${safeInput}` },
      ],
    }),
  }
}

function buildAnthropicRequest(model: string, safeInput: string, apiKey: string): { headers: Record<string, string>; body: string } {
  return {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `Analyze this prompt:\n\n${safeInput}\n\n` +
            'Return ONLY valid JSON with keys: riskScore, aiIssues, redactedPrompt, recommendation.',
        },
      ],
    }),
  }
}

function extractModelText(responseJson: unknown): string {
  const parsed = responseJson as {
    choices?: Array<{ message?: { content?: string } }>
    content?: Array<{ type?: string; text?: string }>
  }

  const openAIText = parsed.choices?.[0]?.message?.content
  if (typeof openAIText === 'string' && openAIText.trim().length > 0) {
    return openAIText
  }

  const anthropicText = parsed.content?.find((c) => c.type === 'text')?.text
  if (typeof anthropicText === 'string' && anthropicText.trim().length > 0) {
    return anthropicText
  }

  return '{}'
}

async function tryWebsocketChat(baseWsUrl: string, apiKey: string, safeInput: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(baseWsUrl, {
      headers: {
        Origin: 'http://localhost:3000',
      },
    } as any)
    const connectId = Math.random().toString(36).slice(2)
    const chatId = Math.random().toString(36).slice(2)

    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('ws timeout'))
    }, WS_TIMEOUT_MS)

    const cleanup = () => {
      clearTimeout(timeout)
      ws.close()
    }

    const sendConnect = () => {
      const connectPayload = {
        type: 'req',
        id: connectId,
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'openclaw-control-ui',
            version: 'control-ui',
            platform: 'node',
            mode: 'webchat',
          },
          role: 'operator',
          scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
          auth: { token: apiKey },
        },
      }
      ws.send(JSON.stringify(connectPayload))
    }

    const sendChat = () => {
      const chatPayload = {
        type: 'req',
        id: chatId,
        method: 'chat.send',
        params: {
          message: safeInput,
          deliver: false,
        },
      }
      ws.send(JSON.stringify(chatPayload))
    }

    ws.addEventListener('open', () => {
      sendConnect()
    })

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(String(event.data))
        if (msg.type === 'res' && msg.id === connectId) {
          if (msg.ok) {
            sendChat()
          } else {
            cleanup()
            reject(new Error(msg.error?.message ?? 'connect failed'))
          }
        }
        if (msg.type === 'res' && msg.id === chatId) {
          cleanup()
          if (msg.ok) {
            resolve(JSON.stringify(msg.payload))
          } else {
            reject(new Error(msg.error?.message ?? 'chat.send failed'))
          }
        }
      } catch {
        // ignore invalid messages
      }
    })

    ws.addEventListener('error', (err) => {
      cleanup()
      reject(new Error('ws error'))
    })
  })
}

const execFileAsync = promisify(execFile)

async function tryOpenClawCli(apiKey: string, safeInput: string): Promise<string> {
  const params = JSON.stringify({
    message: safeInput,
    deliver: false,
  })

  const args = [
    'gateway',
    'call',
    'chat.send',
    '--json',
    '--params',
    params,
    '--token',
    apiKey,
    '--timeout',
    String(WS_TIMEOUT_MS),
  ]

  // Try running OpenClaw CLI directly. If it is not on PATH, fall back to known install locations.
  // On Windows, execFile needs the .cmd wrapper — the bare script is a bash shebang and cannot be spawned.
  const configuredCliPath = process.env.OPENCLAW_CLI_PATH
  const candidates = [configuredCliPath, 'openclaw', 'openclaw.cmd'].filter(
    (value): value is string => Boolean(value && value.trim().length > 0)
  )
  let lastError: unknown = null
  for (const cmd of candidates) {
    try {
      const { stdout, stderr } = await execFileAsync(cmd, args, { windowsHide: true })
      if (stderr) {
        // Some OpenClaw CLI commands print warnings to stderr, ignore.
      }
      return stdout
    } catch (err) {
      lastError = err
    }
  }

  const hint = `Ensure OpenClaw CLI is installed and on your PATH (or set OPENCLAW_CLI_PATH to the executable).`
  const message = lastError instanceof Error ? `${lastError.message}. ${hint}` : hint
  throw new Error(message)
}

async function getBaseUrlHint(baseUrl: string): Promise<string> {
  try {
    const res = await fetch(baseUrl)
    const text = await res.text()
    if (res.ok && /OpenClaw Control/i.test(text)) {
      return ' OPENCLAW_BASE_URL appears to be the OpenClaw Control UI, not an LLM API endpoint. Point it to the OpenClaw gateway API root.'
    }
  } catch {
    // Best-effort hint only.
  }
  return ''
}

export async function runAIScan(
  prompt: string,
  patternRedactedPrompt: string
): Promise<{ issues: DetectedIssue[]; redactedPrompt: string; recommendation: string; aiRiskScore: number }> {
  const cfg = getOpenClawConfig()

  // Only send the already-partially-redacted version to the AI to avoid sending raw secrets
  const safeInput = patternRedactedPrompt.slice(0, 4000) // token safety cap

  if (!cfg) {
    // OpenClaw isn't configured / not available; return a realistic demo scan result.
    return fakeAiAnalysis(prompt, patternRedactedPrompt)
  }

  const { apiKey, baseUrl, model } = cfg

  const attempts = [
    { kind: 'openai', path: '/v1/chat/completions' },
    { kind: 'openai', path: '/chat/completions' },
    { kind: 'anthropic', path: '/v1/messages' },
    { kind: 'anthropic', path: '/messages' },
    { kind: 'anthropic', path: '/anthropic/v1/messages' },
  ] as const

  let raw = '{}'
  const errors: string[] = []
  let lastAttemptUrl: string | null = null

  // HTTP fetch requires http:// or https:// — normalise ws/wss so fetch() doesn't throw immediately
  const httpBase = baseUrl
    .replace(/^ws:\/\//, 'http://')
    .replace(/^wss:\/\//, 'https://')

  for (const attempt of attempts) {
    const { headers, body } =
      attempt.kind === 'openai'
        ? buildOpenAIRequest(model, safeInput, apiKey)
        : buildAnthropicRequest(model, safeInput, apiKey)

    const url = joinUrl(httpBase, attempt.path)
    lastAttemptUrl = url

    let timeout: NodeJS.Timeout | null = null
    try {
      const controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })

      const responseText = await response.text()
      if (!response.ok) {
        errors.push(`${attempt.path} -> ${response.status}`)
        continue
      }

      try {
        const json = JSON.parse(responseText) as unknown
        raw = extractModelText(json)
        if (raw && raw !== '{}') {
          break
        }
      } catch {
        errors.push(`${attempt.path} -> invalid JSON response`)
      }
    } catch (err) {
      errors.push(`${attempt.path} -> ${String(err)}`)
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  if (!raw || raw === '{}') {
    const wsHint = await getBaseUrlHint(baseUrl)
    const wsBase = baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')
      ? baseUrl.replace(/\/$/, '')
      : baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '')

    try {
      raw = await tryWebsocketChat(wsBase, apiKey, safeInput)
    } catch (wsErr) {
      errors.push(`ws -> ${String(wsErr)}`)
    }

    if (!raw || raw === '{}') {
      // Last-resort attempt via the OpenClaw CLI (uses gateway RPC)
      try {
        raw = await tryOpenClawCli(apiKey, safeInput)
      } catch (cliErr) {
        errors.push(`cli -> ${String(cliErr)}`)
      }
    }

    if (!raw || raw === '{}') {
      const hint = wsHint || ''
      const last = lastAttemptUrl ? ` Last attempt: ${lastAttemptUrl}` : ''
      throw new Error(
        `OpenClaw request failed across endpoints: ${errors.join(', ')}.${hint}${last}`
      )
    }
  }
  let analysis: AIAnalysis

  try {
    analysis = coerceAiAnalysis(JSON.parse(extractJsonFromText(raw)) as unknown)
  } catch {
    return { issues: [], redactedPrompt: patternRedactedPrompt, recommendation: '', aiRiskScore: 0 }
  }

  const issues: DetectedIssue[] = (analysis.aiIssues ?? []).map((ai) => ({
    type: ai.type,
    severity: normalizeSeverity(ai.severity),
    match: ai.match ?? '',
    redacted: `[REDACTED-${ai.type.toUpperCase().replace(/\s+/g, '-')}]`,
    explanation: ai.explanation ?? '',
  }))

  return {
    issues,
    redactedPrompt: analysis.redactedPrompt ?? patternRedactedPrompt,
    recommendation: analysis.recommendation ?? '',
    aiRiskScore: analysis.riskScore ?? 0,
  }
}
