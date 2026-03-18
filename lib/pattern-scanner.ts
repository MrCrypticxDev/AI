import type { DetectedIssue, IssueSeverity } from '@/types'

interface PatternDef {
  type: string
  pattern: RegExp
  severity: IssueSeverity
  label: string
  redactLabel: string
}

// Pre-compiled patterns ordered by severity — most critical first
// Compiled once at module load for optimal performance
const BUILT_IN_PATTERNS: PatternDef[] = [
  {
    type: 'aws_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    label: 'AWS Access Key',
    redactLabel: 'AWS-KEY',
  },
  {
    type: 'aws_secret',
    pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
    severity: 'high',
    label: 'AWS Secret Key (possible)',
    redactLabel: 'AWS-SECRET',
  },
  {
    type: 'openai_key',
    pattern: /sk-[A-Za-z0-9]{20,60}/g,
    severity: 'critical',
    label: 'OpenAI API Key',
    redactLabel: 'OPENAI-KEY',
  },
  {
    type: 'github_token',
    pattern: /gh[pso]_[A-Za-z0-9]{36,}/g,
    severity: 'critical',
    label: 'GitHub Token',
    redactLabel: 'GITHUB-TOKEN',
  },
  {
    type: 'jwt_token',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    severity: 'high',
    label: 'JWT Token',
    redactLabel: 'JWT-TOKEN',
  },
  {
    type: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    label: 'Private Key Block',
    redactLabel: 'PRIVATE-KEY',
  },
  {
    type: 'generic_api_key',
    pattern: /(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})/gi,
    severity: 'high',
    label: 'API Key / Token Assignment',
    redactLabel: 'API-KEY',
  },
  {
    type: 'password',
    pattern: /(?:password|passwd|pwd|secret)\s*[:=]\s*['"]?([^\s'"]{8,})/gi,
    severity: 'high',
    label: 'Password / Secret Value',
    redactLabel: 'PASSWORD',
  },
  {
    type: 'pii_ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: 'critical',
    label: 'Social Security Number (SSN)',
    redactLabel: 'SSN',
  },
  {
    type: 'pii_credit_card',
    pattern: /\b(?:\d{4}[- ]){3}\d{4}\b/g,
    severity: 'critical',
    label: 'Credit Card Number',
    redactLabel: 'CREDIT-CARD',
  },
  {
    type: 'pii_email',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    severity: 'medium',
    label: 'Email Address',
    redactLabel: 'EMAIL',
  },
  {
    type: 'pii_phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
    severity: 'medium',
    label: 'Phone Number',
    redactLabel: 'PHONE',
  },
]

const SEVERITY_SCORE: Record<IssueSeverity, number> = {
  low: 10,
  medium: 25,
  high: 50,
  critical: 80,
}

export interface PatternScanResult {
  issues: DetectedIssue[]
  redactedPrompt: string
}

export function runPatternScan(prompt: string): PatternScanResult {
  const issues: DetectedIssue[] = []
  const replacementMap = new Map<string, string>()
  let redactedPrompt = prompt

  for (const def of BUILT_IN_PATTERNS) {
    const matches = [...prompt.matchAll(def.pattern)]

    for (const match of matches) {
      const raw = match[0]
      // Skip very short/common matches that are likely false positives
      if (raw.length < 8) continue

      const redactTag = `[REDACTED-${def.redactLabel}]`
      // Cache redaction tags to avoid duplicate replacements
      replacementMap.set(raw, redactTag)
      
      issues.push({
        type: def.type,
        severity: def.severity,
        match: raw.slice(0, 12) + (raw.length > 12 ? '…' : ''),
        redacted: redactTag,
        explanation: `Detected ${def.label}. This should never be included in an AI prompt.`,
      })
    }
  }

  // Apply all replacements efficiently
  for (const [raw, redactTag] of replacementMap.entries()) {
    redactedPrompt = redactedPrompt.replaceAll(raw, redactTag)
  }

  return { issues, redactedPrompt }
}

export function computeRiskScore(issues: DetectedIssue[]): number {
  if (issues.length === 0) return 0
  const topScore = Math.max(...issues.map((i) => SEVERITY_SCORE[i.severity as IssueSeverity] ?? 10))
  const bonus = Math.min((issues.length - 1) * 5, 20)
  return Math.min(topScore + bonus, 100)
}
