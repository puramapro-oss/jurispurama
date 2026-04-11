import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorizedCron(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  // Vercel Cron sends the CRON_SECRET in the Authorization header automatically
  // when configured in vercel.json. Manual calls require the same header.
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // P1 placeholder: real deadline scan logic arrives in P4.
  return NextResponse.json({
    ok: true,
    job: 'deadline-alerts',
    processed: 0,
    timestamp: Date.now(),
  })
}
