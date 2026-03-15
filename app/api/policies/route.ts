import { NextResponse } from 'next/server'

function disabled() {
  return NextResponse.json(
    {
      error:
        'Policies are stored in browser localStorage in local-first mode. Use the /policies UI instead of this API.',
    },
    { status: 410 }
  )
}

export async function GET() {
  return disabled()
}

export async function POST() {
  return disabled()
}

export async function PATCH() {
  return disabled()
}

export async function DELETE() {
  return disabled()
}
