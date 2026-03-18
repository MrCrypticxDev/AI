import { NextRequest, NextResponse } from 'next/server'
import { runPatternScan, computeRiskScore } from '@/lib/pattern-scanner'
import { runAIScan } from '@/lib/ai-scanner'
import type { ScanResult, RiskLevel } from '@/types'
import { randomUUID } from 'crypto'

const RISK_LEVEL_THRESHOLDS = { low: 20, medium: 50, high: 75 } as const

function scoreToLevel(score: number): RiskLevel {
  if (score === 0) return 'safe'
  if (score <= RISK_LEVEL_THRESHOLDS.low) return 'low'
  if (score <= RISK_LEVEL_THRESHOLDS.medium) return 'medium'
  if (score <= RISK_LEVEL_THRESHOLDS.high) return 'high'
  return 'critical'
}

const DEMO_ISSUE_FALLBACK = {
  type: 'sensitive_context',
  severity: 'medium' as const,
  match: 'example-secret-12345',
  redacted: '[REDACTED-SENSITIVE_CONTEXT]',
  explanation: 'Demonstration issue: the AI scan could not run, so this is a placeholder finding.',
}

export async function POST(req: NextRequest) {
  const start = Date.now()

  let body: { prompt?: string; userId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prompt, userId } = body
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  if (prompt.length > 8000) {
    return NextResponse.json({ error: 'Prompt exceeds 8000 character limit' }, { status: 400 })
  }

  // ── Step 1: Fast regex-based pattern scan ──────────────────────────────────
  const { issues: patternIssues, redactedPrompt: patternRedacted } = runPatternScan(prompt)
  const patternScore = computeRiskScore(patternIssues)

  // ── Step 2: AI deep scan (simulated when OpenClaw is unavailable) ─────────────
  let aiIssues: typeof patternIssues = []
  let finalRedacted = patternRedacted
  let recommendation = ''
  let aiScore = 0

  try {
    const aiResult = await runAIScan(prompt, patternRedacted)
    aiIssues = aiResult.issues
    finalRedacted = aiResult.redactedPrompt
    recommendation = aiResult.recommendation
    aiScore = aiResult.aiRiskScore
  } catch (err) {
    console.error('[PromptGuard] AI scan error:', err)
    aiIssues = [DEMO_ISSUE_FALLBACK]
    aiScore = 15
    recommendation = 'AI scan is currently unavailable; only basic pattern scanning is applied.'
  }

  // ── Step 3: Merge results ──────────────────────────────────────────────────
  const allIssues = [...patternIssues, ...aiIssues]
  const finalScore = Math.max(patternScore, aiScore)
  const riskLevel = scoreToLevel(finalScore)
  const scanDuration = Date.now() - start

  const result: ScanResult = {
    id: randomUUID(),
    riskScore: finalScore,
    riskLevel,
    issues: allIssues,
    redactedPrompt: finalRedacted,
    recommendation:
      recommendation ||
      (allIssues.length === 0 ? 'This prompt looks safe to send.' : 'Remove or replace the flagged values before sending.'),
    patternMatches: patternIssues.length,
    aiMatches: aiIssues.length,
    scanDuration,
    timestamp: new Date().toISOString(),
  }

  // Local-first mode: persistence is handled in the browser (localStorage).
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Scan-Duration': `${scanDuration}ms`,
    },
  })
}
