import PromptScanner from '@/components/PromptScanner'

const FEATURES = [
  {
    icon: '🔑',
    title: 'API Key Detection',
    desc: 'Catches AWS, OpenClaw/OpenAI-style keys, GitHub tokens, JWTs, private keys, and generic secrets using pattern matching.',
  },
  {
    icon: '🪪',
    title: 'PII Scanning',
    desc: 'Flags Social Security numbers, credit card numbers, email addresses, and phone numbers before they leave your org.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Context',
    desc: 'Deep semantic analysis finds sensitive context that regex can\'t: trade secrets, internal architecture, and implicit credentials.',
  },
  {
    icon: '⚡',
    title: 'Instant Redaction',
    desc: 'Get a safe version of your prompt in milliseconds with sensitive values replaced by clear, typed placeholders.',
  },
  {
    icon: '📊',
    title: 'Live Admin Dashboard',
    desc: 'Real-time feed of all flagged prompts across your org. Filter by severity, track trends, spot repeat offenders.',
  },
  {
    icon: '🛠️',
    title: 'Custom Policies',
    desc: 'Define your own regex or keyword rules: internal hostnames, project codenames, proprietary identifiers.',
  },
]

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Real-time AI Security Layer
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Stop leaking secrets into<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            AI prompts
          </span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-base leading-relaxed">
          PromptGuard scans every prompt for API keys, PII, passwords, and sensitive context
          before it reaches an LLM — in under 300ms.
        </p>
      </div>

      {/* Scanner */}
      <div className="bg-gray-900/60 rounded-2xl border border-gray-700 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
            🔍
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Prompt Scanner</h2>
            <p className="text-xs text-gray-500">Paste any prompt. Results in seconds.</p>
          </div>
        </div>
        <PromptScanner />
      </div>

      {/* Features */}
      <div>
        <h2 className="text-xl font-bold text-center mb-8 text-white">Everything you need to stay secure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl bg-gray-800/40 border border-gray-700 p-5 space-y-2 hover:border-gray-600 transition-colors">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold text-white text-sm">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-2xl border border-blue-700/30 p-8 space-y-3">
        <h3 className="text-lg font-bold text-white">Monitor your whole team in real time</h3>
        <p className="text-sm text-gray-400">See every flagged prompt as it happens. Filter by severity. Export reports.</p>
        <a
          href="/dashboard"
          className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20"
        >
          Open Dashboard →
        </a>
      </div>

      <footer className="text-center text-xs text-gray-600 pb-4">
        Built at a hackathon · PromptGuard © 2026
      </footer>
    </div>
  )
}
