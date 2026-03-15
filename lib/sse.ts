import { EventEmitter } from 'events'
import type { ViolationRecord } from '@/types'

// Module-level singleton — shared across all API route handlers in the same process.
// Note: This works perfectly for local dev and single-instance deployments.
// For multi-instance production (Vercel serverless), swap this for Redis pub/sub.

class SSEEmitter extends EventEmitter {}

export const sseEmitter = new SSEEmitter()
sseEmitter.setMaxListeners(200) // Support many concurrent admin connections

export function broadcastViolation(violation: ViolationRecord): void {
  sseEmitter.emit('violation', violation)
}
