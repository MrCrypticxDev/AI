import type { PolicyRule, ViolationRecord } from '@/types'

const VIOLATIONS_KEY = 'prompt_guard_violations_v1'
const POLICIES_KEY = 'prompt_guard_policies_v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function getViolations(): ViolationRecord[] {
  if (!canUseStorage()) return []
  return parseJson<ViolationRecord[]>(window.localStorage.getItem(VIOLATIONS_KEY), [])
}

export function saveViolations(rows: ViolationRecord[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(VIOLATIONS_KEY, JSON.stringify(rows))
}

export function addViolation(row: ViolationRecord): void {
  const rows = getViolations()
  rows.unshift(row)
  saveViolations(rows.slice(0, 500))
}

export function removeViolation(id: string): void {
  const next = getViolations().filter((v) => v.id !== id)
  saveViolations(next)
}

export function clearViolations(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(VIOLATIONS_KEY)
}

export function getPolicies(): PolicyRule[] {
  if (!canUseStorage()) return []
  return parseJson<PolicyRule[]>(window.localStorage.getItem(POLICIES_KEY), [])
}

export function savePolicies(rows: PolicyRule[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(POLICIES_KEY, JSON.stringify(rows))
}

export function upsertPolicy(row: PolicyRule): void {
  const rows = getPolicies()
  const idx = rows.findIndex((p) => p.id === row.id)
  if (idx >= 0) rows[idx] = row
  else rows.unshift(row)
  savePolicies(rows)
}

export function deletePolicy(id: string): void {
  savePolicies(getPolicies().filter((p) => p.id !== id))
}
