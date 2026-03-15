// ─── Core types shared across the app ─────────────────────────────────────────

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IssueType =
  | 'aws_key'
  | 'openai_key'
  | 'github_token'
  | 'generic_api_key'
  | 'pii_ssn'
  | 'pii_credit_card'
  | 'pii_email'
  | 'pii_phone'
  | 'password'
  | 'jwt_token'
  | 'private_key'
  | 'sensitive_context'
  | 'custom'

export interface DetectedIssue {
  type: IssueType | string
  severity: IssueSeverity
  match: string       // The raw matched string
  redacted: string    // Replacement string e.g. "[REDACTED-AWS-KEY]"
  explanation: string
}

export interface ScanResult {
  id: string
  riskScore: number     // 0-100
  riskLevel: RiskLevel
  issues: DetectedIssue[]
  redactedPrompt: string
  recommendation: string
  patternMatches: number
  aiMatches: number
  scanDuration: number   // ms
  timestamp: string
}

export interface ScanRequest {
  prompt: string
  userId?: string
}

export interface PolicyRule {
  id: string
  name: string
  pattern: string
  type: 'regex' | 'keyword'
  severity: IssueSeverity
  action: 'warn' | 'redact' | 'block'
  enabled: boolean
  createdAt: string
}

export interface ViolationRecord {
  id: string
  userId?: string | null
  promptSnippet: string
  redactedPrompt: string
  riskScore: number
  riskLevel: string
  issueTypes: string
  issueCount: number
  createdAt: string
}

export interface SSEEvent {
  type: 'connected' | 'violation' | 'heartbeat'
  data?: ViolationRecord
}
