'use client'

import { useState, useRef } from 'react'
import type { ScanResult } from '@/types'
import RiskScore from './RiskScore'
import ViolationCard from './ViolationCard'
import { addViolation } from '@/lib/local-storage'

const DEMO_PROMPTS = [
  `Help me debug this AWS Lambda. Here's my config:
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Region: us-east-1`,

  `Summarize this customer complaint from john.smith@company.com (SSN: 512-34-5678).
He says his Visa card 4532-1234-5678-9010 was charged incorrectly.`,

  `I'm building a chat app. Here's my AI provider key: sk-proj-aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdef
Can you help me write the system prompt?`,
]

export default function PromptScanner() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleScan() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Scan failed')
      }

      const data: ScanResult = await res.json()
      setResult(data)

      if (data.riskScore > 0) {
        const issueTypes = [...new Set(data.issues.map((i) => i.type))].join(',')
        addViolation({
          id: data.id,
          userId: null,
          promptSnippet: data.redactedPrompt.slice(0, 120),
          redactedPrompt: data.redactedPrompt,
          riskScore: data.riskScore,
          riskLevel: data.riskLevel,
          issueTypes,
          issueCount: data.issues.length,
          createdAt: data.timestamp,
        })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function handleDemo(p: string) {
    setPrompt(p)
    setResult(null)
    textareaRef.current?.focus()
  }

  async function handleCopyRedacted() {
    if (!result) return
    await navigator.clipboard.writeText(result.redactedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charCount = prompt.length
  const overLimit = charCount > 8000

  return (
    <div className="space-y-6">
      {/* Demo prompt buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center mr-1">Try a demo:</span>
        {['AWS Keys', 'SSN + Card', 'AI Provider Key'].map((label, i) => (
          <button
            key={label}
            onClick={() => handleDemo(DEMO_PROMPTS[i])}
            className="text-xs px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste your AI prompt here to scan for sensitive data..."
          rows={8}
          className={`w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl p-4 pr-4 pb-8
            border ${overLimit ? 'border-red-500' : 'border-gray-600'} focus:border-blue-500
            focus:outline-none resize-none font-mono text-sm leading-relaxed transition-colors`}
        />
        <span className={`absolute bottom-3 right-4 text-xs ${overLimit ? 'text-red-400' : 'text-gray-500'}`}>
          {charCount.toLocaleString()} / 8,000
        </span>
      </div>

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={loading || !prompt.trim() || overLimit}
        className={`w-full py-3 rounded-xl font-semibold text-sm tracking-wide transition-all
          ${loading || !prompt.trim() || overLimit
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Scanning…
          </span>
        ) : (
          '🔍 Scan Prompt'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="animate-slide-up space-y-5 pt-2">
          {/* Score + summary row */}
          <div className="flex items-center gap-6 bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <RiskScore score={result.riskScore} level={result.riskLevel} size="lg" />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-4 text-sm">
                <Stat label="Issues" value={result.issues.length} />
                <Stat label="Pattern hits" value={result.patternMatches} />
                <Stat label="AI hits" value={result.aiMatches} />
                <Stat label="Scan time" value={`${result.scanDuration}ms`} />
              </div>
              {result.recommendation && (
                <p className="text-xs text-gray-400 leading-relaxed mt-1">
                  💬 {result.recommendation}
                </p>
              )}
            </div>
          </div>

          {/* Detected issues */}
          {result.issues.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Detected Issues</h3>
              {result.issues.map((issue, i) => (
                <ViolationCard key={i} issue={issue} />
              ))}
            </div>
          )}

          {/* Redacted prompt */}
          {result.riskScore > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">Safe Version (copy this)</h3>
                <button
                  onClick={handleCopyRedacted}
                  className="text-xs px-3 py-1 rounded-full bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-green-300 whitespace-pre-wrap break-words leading-relaxed border border-gray-700 max-h-64 overflow-y-auto">
                {result.redactedPrompt}
              </pre>
            </div>
          )}

          {result.riskScore === 0 && (
            <div className="flex items-center gap-3 bg-green-900/20 border border-green-700/40 rounded-xl p-4">
              <span className="text-2xl">✅</span>
              <p className="text-sm text-green-300">No sensitive data detected. Safe to send.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  )
}
