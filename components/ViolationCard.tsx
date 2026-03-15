import type { DetectedIssue, IssueSeverity } from '@/types'

interface ViolationCardProps {
  issue: DetectedIssue
}

const SEVERITY_STYLES: Record<IssueSeverity, { badge: string; border: string; icon: string }> = {
  critical: { badge: 'bg-red-600/20 text-red-400 border border-red-600/40',   border: 'border-l-red-600',   icon: '🚨' },
  high:     { badge: 'bg-red-400/20 text-red-300 border border-red-400/40',   border: 'border-l-red-400',   icon: '⚠️' },
  medium:   { badge: 'bg-orange-400/20 text-orange-300 border border-orange-400/40', border: 'border-l-orange-400', icon: '⚡' },
  low:      { badge: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40', border: 'border-l-yellow-400', icon: '💡' },
}

const TYPE_LABELS: Record<string, string> = {
  aws_key:         'AWS Access Key',
  aws_secret:      'AWS Secret',
  openai_key:      'AI Provider Key',
  github_token:    'GitHub Token',
  jwt_token:       'JWT Token',
  private_key:     'Private Key',
  generic_api_key: 'API Key / Token',
  password:        'Password / Secret',
  pii_ssn:         'SSN',
  pii_credit_card: 'Credit Card',
  pii_email:       'Email Address',
  pii_phone:       'Phone Number',
  pii:             'Personal Data (PII)',
  api_key:         'API Key',
  credentials:     'Credentials',
  code_secret:     'Code Secret',
  sensitive_context: 'Sensitive Context',
}

export default function ViolationCard({ issue }: ViolationCardProps) {
  const severity = (issue.severity as IssueSeverity) ?? 'medium'
  const styles = SEVERITY_STYLES[severity]
  const label = TYPE_LABELS[issue.type] ?? issue.type

  return (
    <div className={`rounded-lg bg-gray-800/60 border-l-4 ${styles.border} p-4 space-y-2`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">{styles.icon}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${styles.badge}`}>
          {severity}
        </span>
      </div>

      {issue.match && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Matched:</span>
          <code className="text-xs bg-gray-900 px-2 py-0.5 rounded font-mono text-red-300 line-through opacity-70">
            {issue.match}
          </code>
          <span className="text-xs text-gray-500">→</span>
          <code className="text-xs bg-gray-900 px-2 py-0.5 rounded font-mono text-green-400">
            {issue.redacted}
          </code>
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">{issue.explanation}</p>
    </div>
  )
}
