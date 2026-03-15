'use client'

import PolicyBuilder from '@/components/PolicyBuilder'

export default function PoliciesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Detection Policies</h1>
        <p className="text-gray-400 text-sm mt-1">
          Define custom regex or keyword rules and store them directly in browser local storage.
        </p>
      </div>

      <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 p-5">
        <h3 className="text-sm font-semibold text-amber-300 mb-2">Local-First Mode Enabled</h3>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Policies are stored on this browser only. This removes external database dependency and keeps your security rules private to your machine.
        </p>
      </div>

      <div className="bg-gray-900/60 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-purple-600/20 flex items-center justify-center">🛠️</div>
          <div>
            <h2 className="text-base font-semibold text-white">Custom Policies</h2>
            <p className="text-xs text-gray-500">Build your organization-specific detection logic without a backend database.</p>
          </div>
        </div>
        <PolicyBuilder />
      </div>
    </div>
  )
}
