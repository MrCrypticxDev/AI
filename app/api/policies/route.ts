import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const policies = await db.policy.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(
    policies.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))
  )
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string
    pattern?: string
    type?: string
    severity?: string
    action?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, pattern, type = 'regex', severity = 'medium', action = 'warn' } = body

  if (!name || !pattern) {
    return NextResponse.json({ error: 'name and pattern are required' }, { status: 400 })
  }

  // Validate regex if type is regex
  if (type === 'regex') {
    try {
      new RegExp(pattern)
    } catch {
      return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 400 })
    }
  }

  const policy = await db.policy.create({
    data: { name, pattern, type, severity, action, enabled: true },
  })

  return NextResponse.json({ ...policy, createdAt: policy.createdAt.toISOString() }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  let body: { id?: string; enabled?: boolean; name?: string; severity?: string; action?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updated = await db.policy.update({ where: { id }, data })
  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await db.policy.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
