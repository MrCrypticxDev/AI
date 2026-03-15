'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ViolationRecord } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { clearViolations, getViolations, removeViolation } from '@/lib/local-storage'

const LEVEL_STYLES: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'bg-red-600/20 text-red-400 border-red-600/40',   dot: 'bg-red-500' },
  high:     { badge: 'bg-red-400/20 text-red-300 border-red-400/40',   dot: 'bg-red-400' },
  medium:   { badge: 'bg-orange-400/20 text-orange-300 border-orange-400/40', dot: 'bg-orange-400' },
  low:      { badge: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40', dot: 'bg-yellow-400' },
  safe:     { badge: 'bg-green-400/20 text-green-300 border-green-400/40',    dot: 'bg-green-400' },
}

interface Props {
  initial?: ViolationRecord[]
}

export default function AdminFeed({ initial = [] }: Props) {
  const [violations, setViolations] = useState<ViolationRecord[]>(initial)
  const [filter, setFilter] = useState<string>('all')

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

  const displayed = useMemo(() => {
    if (filter === 'all') return violations
    return violations.filter((v) => v.riskLevel === filter)
  }, [violations, filter])

  const totals = violations.reduce(
    (acc, v) => { acc[v.riskLevel] = (acc[v.riskLevel] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      {/* Connection indicator + live counter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Local browser storage active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{violations.length} total violations</span>
          {violations.length > 0 && (
            <button
              onClick={() => {
                clearViolations()
                setViolations([])
              }}
              className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => {
          const s = LEVEL_STYLES[lvl]
          return (
            <div key={lvl} className={`rounded-xl p-3 bg-gray-800/60 border ${s.badge.includes('red-6') ? 'border-red-600/20' : 'border-gray-700'}`}>
              <p className="text-xs text-gray-400 capitalize">{lvl}</p>
              <p className={`text-2xl font-bold ${s.badge.split(' ')[1]}`}>{totals[lvl] ?? 0}</p>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'critical', 'high', 'medium', 'low'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilter(lvl)}
            className={`text-xs px-3 py-1 rounded-full capitalize transition-colors border
              ${filter === lvl
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-400'}`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {displayed.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No violations yet. Run some scans to see them here.
          </div>
        )}
        {displayed.map((v, i) => {
          const s = LEVEL_STYLES[v.riskLevel] ?? LEVEL_STYLES.low
          const types = v.issueTypes.split(',').filter(Boolean)
          return (
            <div
              key={v.id}
              className="rounded-xl bg-gray-800/60 border border-gray-700 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${s.badge}`}>
                    {v.riskLevel}
                  </span>
                  <span className="text-xs font-bold text-white">{v.riskScore}/100</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {types.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full font-mono">
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <p className="text-xs text-gray-400 font-mono leading-relaxed truncate">
                {v.promptSnippet}
              </p>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    removeViolation(v.id)
                    setViolations((prev) => prev.filter((x) => x.id !== v.id))
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
