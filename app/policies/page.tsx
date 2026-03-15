import { db } from '@/lib/db'
import PolicyBuilder from '@/components/PolicyBuilder'
import type { PolicyRule } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const rows = await db.policy.findMany({ orderBy: { createdAt: 'desc' } })

  const policies: PolicyRule[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    pattern: p.pattern,
    type: p.type as PolicyRule['type'],
    severity: p.severity as PolicyRule['severity'],
    action: p.action as PolicyRule['action'],
    enabled: p.enabled,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Detection Policies</h1>
        <p className="text-gray-400 text-sm mt-1">
          Define custom regex or keyword rules to flag sensitive content specific to your organization.
        </p>
      </div>

      {/* Built-in policies info */}
      <div className="rounded-xl bg-blue-900/20 border border-blue-700/30 p-5">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Built-in Policies (always active)</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'AWS Access Keys', 'AI Provider Keys', 'GitHub Tokens', 'JWT Tokens',
            'Private Keys', 'Passwords', 'SSN', 'Credit Cards', 'Email Addresses', 'Phone Numbers',
          ].map((name) => (
            <span key={name} className="text-xs px-2 py-0.5 bg-blue-800/30 text-blue-300 rounded-full border border-blue-700/30">
              ✓ {name}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-400/70 mt-3">
          These are powered by both regex pattern matching and AI analysis. You cannot disable them.
        </p>
      </div>

      {/* Custom policy builder */}
      <div className="bg-gray-900/60 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-purple-600/20 flex items-center justify-center">🛠️</div>
          <div>
            <h2 className="text-base font-semibold text-white">Custom Policies</h2>
            <p className="text-xs text-gray-500">
              Add rules for your internal hostnames, project codenames, proprietary identifiers, or any custom pattern.
            </p>
          </div>
        </div>
        <PolicyBuilder initial={policies} />
      </div>
    </div>
  )
}
