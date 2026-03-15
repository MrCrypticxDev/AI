import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Prompt Guard — AI Prompt Security Scanner',
  description: 'Real-time AI input security layer. Detect and redact API keys, PII, secrets, and sensitive data before they reach an LLM.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <ClerkProvider>
          <Navbar />
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  )
}
