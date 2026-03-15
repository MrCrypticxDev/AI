import { NextRequest } from 'next/server'
import { sseEmitter } from '@/lib/sse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Confirm connection
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const sendViolation = (data: object) => {
        try {
          const payload = JSON.stringify({ type: 'violation', data })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        } catch {
          // Client disconnected mid-write — remove listener
          sseEmitter.off('violation', sendViolation)
        }
      }

      // Heartbeat every 25 seconds to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 25_000)

      sseEmitter.on('violation', sendViolation)

      req.signal.addEventListener('abort', () => {
        sseEmitter.off('violation', sendViolation)
        clearInterval(heartbeat)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
