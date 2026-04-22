import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { lookupSiret } from '@/lib/insee';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ siret: z.string().min(14).max(17) });

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Tu dois être connecté pour utiliser cet outil.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'SIRET manquant ou format invalide (14 chiffres).' },
      { status: 400 }
    );
  }

  const result = await lookupSiret(parsed.data.siret);
  if ('error' in result) {
    const status =
      result.code === 'NOT_FOUND'
        ? 404
        : result.code === 'RATE_LIMIT'
          ? 429
          : result.code === 'AUTH'
            ? 503
            : result.code === 'INVALID_FORMAT'
              ? 400
              : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({ ok: true, data: result });
}
