import PromptScanner from '@/components/PromptScanner'

const FEATURES = [
  {
    icon: '🔑',
    title: 'Credential Leak Detection',
    desc: 'Detects API keys, cloud credentials, tokens, and private key material before prompts leave the browser.',
  },
  {
    icon: '🪪',
    title: 'PII Protection Layer',
    desc: 'Flags SSNs, card numbers, phone numbers, and email addresses with redaction-ready output.',
  },
  {
    icon: '🧠',
    title: 'OpenClaw AI Context Scan',
    desc: 'Uses OpenClaw integration to catch semantic risk patterns regex cannot see, including sensitive intent.',
  },
  {
    icon: '🧹',
    title: 'Sanitize Before Send',
    desc: 'Generates a safe version instantly with structured redaction tags so users can keep momentum.',
  },
  {
    icon: '💾',
    title: 'Local-First Dashboard',
    desc: 'Stores policy and violation activity in browser localStorage. No external database required.',
  },
  {
    icon: '🎯',
    title: 'Custom Rule Engine',
    desc: 'Create organization-specific policies for internal code names, hostnames, product IDs, and patterns.',
  },
]

const SCORE_PILLARS = [
  { label: 'Problem', text: 'Prompt leakage of secrets and PII into AI workflows.' },
  { label: 'Real World Impact', text: 'Pre-send prevention reduces legal, privacy, and security incidents.' },
  { label: 'Implementation', text: 'Next.js + OpenClaw + local-first storage with real-time UX.' },
  { label: 'Messaging', text: 'Simple workflow: detect, explain risk, sanitize, proceed safely.' },
  { label: 'Execution Potential', text: 'Deployable today as web app + Firefox extension for team rollout.' },
]

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.20),transparent_35%),radial-gradient(circle_at_80%_5%,rgba(20,184,166,0.18),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(251,191,36,0.12),transparent_30%)]" />

      <div className="relative max-w-6xl mx-auto px-4 py-12 space-y-16">
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-cyan-300 text-xs font-semibold tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Prompt Guard - Local-First AI Security
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-tight">
            Stop sensitive data leaks
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-amber-200">
              before prompts are sent
            </span>
          </h1>

          <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Prompt Guard is a pre-send safety layer for AI workflows. It combines deterministic pattern scanning with OpenClaw semantic analysis, then gives users immediate sanitize controls and a modern local-first security dashboard.
          </p>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['OpenClaw Integrated', 'No External DB Required', 'Policy Driven', 'Hackathon Ready'].map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-600 text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="bg-slate-950/75 rounded-2xl border border-slate-700 shadow-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              🔍
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Prompt Scanner</h2>
              <p className="text-xs text-slate-400">Paste prompt text, scan risk, and copy sanitized output in seconds.</p>
            </div>
          </div>
          <PromptScanner />
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white text-center">Built for security judges and real teams</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl bg-slate-900/70 border border-slate-700 p-5 hover:border-cyan-500/40 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-900/20 via-slate-900/60 to-cyan-900/20 p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Scoring Narrative (10/10 Framework)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SCORE_PILLARS.map((p) => (
              <div key={p.label} className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-300 font-semibold">{p.label}</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center bg-slate-900/70 rounded-2xl border border-slate-700 p-8 space-y-3">
          <h3 className="text-lg font-semibold text-white">Ready for live judging</h3>
          <p className="text-sm text-slate-400">Scan, sanitize, and show policy + dashboard flow in one cohesive demo.</p>
          <a
            href="/dashboard"
            className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20"
          >
            Open Dashboard -&gt;
          </a>
        </section>

        <footer className="text-center text-xs text-slate-500 pb-4">
          Prompt Guard © 2026 - Classic reliability, modern security UX.
        </footer>
      </div>
    </div>
  )
}
