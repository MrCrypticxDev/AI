'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const links = [
    { href: '/',          label: 'Scanner' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/policies',  label: 'Policies' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-700/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white tracking-tight">
          <span className="text-cyan-300 text-xl">🛡️</span>
          <span className="text-lg">Prompt <span className="text-cyan-300">Guard</span></span>
        </Link>

        <div className="flex items-center gap-1 rounded-full bg-slate-900/80 border border-slate-700 p-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${pathname === href
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
