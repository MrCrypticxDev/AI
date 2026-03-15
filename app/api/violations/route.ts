import { NextResponse } from 'next/server'

function disabled() {
  return NextResponse.json(
    {
      error:
        'Violations are stored in browser localStorage in local-first mode. Use the /dashboard UI instead of this API.',
    },
    { status: 410 }
  )
}

export async function GET() {
  return disabled()
}

export async function DELETE() {
  return disabled()
}
