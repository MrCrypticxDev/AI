'use client'

import { useEffect, useRef, useState } from 'react'
import type { ViolationRecord, SSEEvent } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const LEVEL_STYLES: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'bg-red-600/20 text-red-400 border-red-600/40',   dot: 'bg-red-500' },
  high:     { badge: 'bg-red-400/20 text-red-300 border-red-400/40',   dot: 'bg-red-400' },
  medium:   { badge: 'bg-orange-400/20 text-orange-300 border-orange-400/40', dot: 'bg-orange-400' },
  low:      { badge: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40', dot: 'bg-yellow-400' },
  safe:     { badge: 'bg-green-400/20 text-green-300 border-green-400/40',    dot: 'bg-green-400' },
}

interface Props {
  initial: ViolationRecord[]
  totalCount: number
}

export default function AdminFeed({ initial, totalCount }: Props) {
  const [violations, setViolations] = useState<ViolationRecord[]>(initial)
  const [liveCount, setLiveCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const event: SSEEvent = JSON.parse(e.data)
        if (event.type === 'violation' && event.data) {
          setViolations((prev) => [event.data!, ...prev].slice(0, 100))
          setLiveCount((n) => n + 1)
        }
      } catch { /* malformed event */ }
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [])

  const displayed = filter === 'all'
    ? violations
    : violations.filter((v) => v.riskLevel === filter)

  const totals = violations.reduce(
    (acc, v) => { acc[v.riskLevel] = (acc[v.riskLevel] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      {/* Connection indicator + live counter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Live feed connected' : 'Connecting…'}</span>
          {liveCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30">
              +{liveCount} live
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{totalCount + liveCount} total violations</span>
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
          const isNew = i < liveCount
          return (
            <div
              key={v.id}
              className={`rounded-xl bg-gray-800/60 border border-gray-700 p-4 space-y-2
                ${isNew ? 'animate-slide-up border-blue-500/40' : ''}`}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
