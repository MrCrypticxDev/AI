'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminFeed from '@/components/AdminFeed'
import type { ViolationRecord } from '@/types'
import { getViolations } from '@/lib/local-storage'

export default function DashboardPage() {
  const [violations, setViolations] = useState<ViolationRecord[]>([])

  useEffect(() => {
    const load = () => setViolations(getViolations())
    load()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'prompt_guard_violations_v1') load()
    }
    window.addEventListener('storage', onStorage)
    const poll = setInterval(load, 1000)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(poll)
    }
  }, [])

  const criticalCount = useMemo(
    () => violations.filter((v) => v.riskLevel === 'critical').length,
    [violations]
  )

  const uniqueIssueTypes = useMemo(
    () => [...new Set(violations.flatMap((v) => v.issueTypes.split(',').filter(Boolean)))],
    [violations]
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Local-first dashboard powered by browser storage. No external database required.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Violations" value={violations.length} color="text-blue-400" />
        <StatCard label="Critical" value={criticalCount} color="text-red-400" />
        <StatCard label="Issue Types Seen" value={uniqueIssueTypes.length} color="text-amber-400" />
        <StatCard label="Storage Mode" value="Local" color="text-emerald-400" />
      </div>

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

      <div className="bg-gray-900/60 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-red-600/20 flex items-center justify-center">📡</div>
          <div>
            <h2 className="text-base font-semibold text-white">Live Violation Feed</h2>
            <p className="text-xs text-gray-500">Auto-syncs with scans saved in your browser</p>
          </div>
        </div>
        <AdminFeed initial={violations} />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
