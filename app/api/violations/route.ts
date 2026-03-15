import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const level = searchParams.get('level') // optional filter

  const where = level ? { riskLevel: level } : {}

  const [violations, total] = await Promise.all([
    db.violation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.violation.count({ where }),
  ])

  // Summary stats
  const stats = await db.violation.groupBy({
    by: ['riskLevel'],
    _count: { id: true },
  })

  return NextResponse.json({
    violations: violations.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    })),
    total,
    stats: stats.reduce(
      (acc, s) => {
        acc[s.riskLevel] = s._count.id
        return acc
      },
      {} as Record<string, number>
    ),
  })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await db.violation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
