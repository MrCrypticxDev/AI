import { NextRequest, NextResponse } from 'next/server'
import { runPatternScan, computeRiskScore } from '@/lib/pattern-scanner'
import { runAIScan } from '@/lib/ai-scanner'
import { db } from '@/lib/db'
import { broadcastViolation } from '@/lib/sse'
import type { ScanResult, RiskLevel, ViolationRecord } from '@/types'
import { randomUUID } from 'crypto'

function scoreToLevel(score: number): RiskLevel {
  if (score === 0) return 'safe'
  if (score <= 20) return 'low'
  if (score <= 50) return 'medium'
  if (score <= 75) return 'high'
  return 'critical'
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  const hasAIConfig = Boolean((process.env.OPENCLAW_API_KEY || process.env.OPENCLAW_GATEWAY_TOKEN) && process.env.OPENCLAW_BASE_URL)

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

  // ── Step 2: AI deep scan (always run if API key is set) ────────────────────
  let aiIssues: typeof patternIssues = []
  let finalRedacted = patternRedacted
  let recommendation = ''
  let aiScore = 0
  let aiErrorMessage = ''

  if (hasAIConfig) {
    try {
      const aiResult = await runAIScan(prompt, patternRedacted)
      aiIssues = aiResult.issues
      finalRedacted = aiResult.redactedPrompt
      recommendation = aiResult.recommendation
      aiScore = aiResult.aiRiskScore
    } catch (err) {
      console.error('[PromptGuard] AI scan error:', err)
      aiErrorMessage = err instanceof Error ? err.message : 'Unknown AI scan error'
      // Fall back to pattern scan only — don't fail the request
    }
  } else {
    recommendation = 'Set OPENCLAW_API_KEY and OPENCLAW_BASE_URL to enable AI-powered deep scanning.'
  }

  // ── Step 3: Merge results ──────────────────────────────────────────────────
  const allIssues = [...patternIssues, ...aiIssues]
  const finalScore = Math.max(patternScore, aiScore)
  const riskLevel = scoreToLevel(finalScore)

  const result: ScanResult = {
    id: randomUUID(),
    riskScore: finalScore,
    riskLevel,
    issues: allIssues,
    redactedPrompt: finalRedacted,
    recommendation:
      recommendation ||
      (aiErrorMessage
        ? `AI scan unavailable: ${aiErrorMessage}`
        : allIssues.length === 0
          ? 'This prompt looks safe to send.'
          : 'Remove or replace the flagged values before sending.'),
    patternMatches: patternIssues.length,
    aiMatches: aiIssues.length,
    scanDuration: Date.now() - start,
    timestamp: new Date().toISOString(),
  }

  // ── Step 4: Persist violation (only if risk > 0) ───────────────────────────
  if (finalScore > 0) {
    const issueTypes = [...new Set(allIssues.map((i) => i.type))].join(',')
    const promptSnippet = finalRedacted.slice(0, 120)

    try {
      const saved = await db.violation.create({
        data: {
          userId: userId ?? null,
          promptSnippet,
          redactedPrompt: finalRedacted.slice(0, 2000),
          riskScore: finalScore,
          riskLevel,
          issueTypes,
          issueCount: allIssues.length,
        },
      })

      // ── Step 5: Push to SSE admin feed ──────────────────────────────────────
      const record: ViolationRecord = {
        id: saved.id,
        userId: saved.userId ?? undefined,
        promptSnippet: saved.promptSnippet,
        redactedPrompt: saved.redactedPrompt,
        riskScore: saved.riskScore,
        riskLevel: saved.riskLevel,
        issueTypes: saved.issueTypes,
        issueCount: saved.issueCount,
        createdAt: saved.createdAt.toISOString(),
      }
      broadcastViolation(record)
    } catch (err) {
      console.error('[PromptGuard] DB save error:', err)
      // Don't fail the scan response if DB write fails
    }
  }

  return NextResponse.json(result)
}
