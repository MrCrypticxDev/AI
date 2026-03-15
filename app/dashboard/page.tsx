import { db } from '@/lib/db'
import AdminFeed from '@/components/AdminFeed'
import type { ViolationRecord } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [violations, total] = await Promise.all([
    db.violation.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    db.violation.count(),
  ])

  const initial: ViolationRecord[] = violations.map((v) => ({
    id: v.id,
    userId: v.userId ?? undefined,
    promptSnippet: v.promptSnippet,
    redactedPrompt: v.redactedPrompt,
    riskScore: v.riskScore,
    riskLevel: v.riskLevel,
    issueTypes: v.issueTypes,
    issueCount: v.issueCount,
    createdAt: v.createdAt.toISOString(),
  }))

  // Aggregate stats
  const criticalCount = violations.filter((v) => v.riskLevel === 'critical').length
  const uniqueIssueTypes = [...new Set(violations.flatMap((v) => v.issueTypes.split(',').filter(Boolean)))]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real-time feed of all flagged prompts across your organization.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Scans (approx)" value={total} color="text-blue-400" />
        <StatCard label="Violations" value={total} color="text-orange-400" />
        <StatCard label="Critical" value={criticalCount} color="text-red-400" />
        <StatCard label="Issue Types Seen" value={uniqueIssueTypes.length} color="text-purple-400" />
      </div>

      {/* Top issue types */}
      {uniqueIssueTypes.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Top Issue Types Detected</h2>
          <div className="flex flex-wrap gap-2">
            {uniqueIssueTypes.slice(0, 12).map((t) => (
              <span key={t} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full font-mono">
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live feed */}
      <div className="bg-gray-900/60 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-red-600/20 flex items-center justify-center">📡</div>
          <div>
            <h2 className="text-base font-semibold text-white">Live Violation Feed</h2>
            <p className="text-xs text-gray-500">Updates in real-time as scans happen</p>
          </div>
        </div>
        <AdminFeed initial={initial} totalCount={total} />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
