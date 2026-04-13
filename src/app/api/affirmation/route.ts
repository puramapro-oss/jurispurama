import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  const svc = createServiceClient()
  const { data } = await svc
    .from('jurispurama_affirmations')
    .select('id, category, text_fr, text_en')

  if (!data || data.length === 0) {
    return NextResponse.json({
      affirmation: {
        text_fr: 'Tu as le droit de défendre tes droits.',
        text_en: 'You have the right to stand up for yourself.',
        category: 'courage',
      },
    })
  }

  const random = data[Math.floor(Math.random() * data.length)]
  return NextResponse.json({ affirmation: random })
}
