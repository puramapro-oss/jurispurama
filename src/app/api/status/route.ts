import { NextResponse } from 'next/server'
import { APP_SLUG } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: APP_SLUG,
    timestamp: Date.now(),
    env: process.env.VERCEL_ENV ?? 'local',
  })
}
