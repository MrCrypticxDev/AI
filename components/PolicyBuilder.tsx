'use client'

import { useEffect, useState } from 'react'
import type { PolicyRule } from '@/types'
import { deletePolicy, getPolicies, savePolicies } from '@/lib/local-storage'

interface Props {
  initial?: PolicyRule[]
}

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical']
const ACTION_OPTIONS = ['warn', 'redact', 'block']

const SEVERITY_BADGE: Record<string, string> = {
  low:      'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40',
  medium:   'bg-orange-400/20 text-orange-300 border border-orange-400/40',
  high:     'bg-red-400/20 text-red-300 border border-red-400/40',
  critical: 'bg-red-600/20 text-red-400 border border-red-600/40',
}

const ACTION_BADGE: Record<string, string> = {
  warn:   'bg-yellow-400/10 text-yellow-300',
  redact: 'bg-blue-400/10 text-blue-300',
  block:  'bg-red-400/10 text-red-300',
}

export default function PolicyBuilder({ initial = [] }: Props) {
  const [policies, setPolicies] = useState<PolicyRule[]>(initial)
  const [form, setForm] = useState({ name: '', pattern: '', type: 'regex', severity: 'medium', action: 'warn' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = getPolicies()
    if (stored.length > 0) setPolicies(stored)
  }, [])

  async function handleAdd() {
    if (!form.name.trim() || !form.pattern.trim()) {
      setError('Name and pattern are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (form.type === 'regex') {
        try {
          new RegExp(form.pattern)
        } catch {
          throw new Error('Invalid regex pattern')
        }
      }

      const created: PolicyRule = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        pattern: form.pattern.trim(),
        type: form.type as PolicyRule['type'],
        severity: form.severity as PolicyRule['severity'],
        action: form.action as PolicyRule['action'],
        enabled: true,
        createdAt: new Date().toISOString(),
      }
      setPolicies((prev) => {
        const next = [created, ...prev]
        savePolicies(next)
        return next
      })
      setForm({ name: '', pattern: '', type: 'regex', severity: 'medium', action: 'warn' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(policy: PolicyRule) {
    setPolicies((prev) => {
      const next = prev.map((p) => (p.id === policy.id ? { ...p, enabled: !policy.enabled } : p))
      savePolicies(next)
      return next
    })
  }

  async function handleDelete(id: string) {
    deletePolicy(id)
    setPolicies((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Add policy form */}
      <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Add Custom Policy</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Policy name (e.g. Internal Hostname)"
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <input
            value={form.pattern}
            onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
            placeholder="Regex or keyword (e.g. internal\.corp)"
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Type */}
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="regex">Regex</option>
            <option value="keyword">Keyword</option>
          </select>

          {/* Severity */}
          <select
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          {/* Action */}
          <select
            value={form.action}
            onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a} className="capitalize">{a}</option>
            ))}
          </select>

          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : '+ Add Policy'}
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Policy list */}
      <div className="space-y-3">
        {policies.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No custom policies yet.</p>
        )}
        {policies.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-4 bg-gray-800/60 rounded-xl border p-4 transition-opacity
              ${p.enabled ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}
          >
            {/* Toggle */}
            <button
              onClick={() => handleToggle(p)}
              className={`relative h-5 w-9 rounded-full transition-colors ${p.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform
                  ${p.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{p.name}</p>
              <code className="text-xs text-gray-400 font-mono truncate block">{p.pattern}</code>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SEVERITY_BADGE[p.severity]}`}>{p.severity}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ACTION_BADGE[p.action]}`}>{p.action}</span>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-gray-500 hover:text-red-400 transition-colors ml-1 text-lg leading-none"
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
