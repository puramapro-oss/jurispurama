/**
 * Stripe Connect Embedded Components — AccountSession
 * Voir §36.5 CLAUDE.md. Gated sur TREEZOR_ACTIVE=true (Phase 2).
 *
 * Phase 1 (actuel) : endpoint répond 503 "Bientôt disponible".
 * Phase 2 (après signature Treezor) : crée un AccountSession pour onboarding ambassadeur payouts.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: Request) {
  // Phase gating — Phase 1 = désactivé
  if (process.env.TREEZOR_ACTIVE !== 'true') {
    return NextResponse.json(
      {
        error:
          "Les virements ambassadeurs sont bientôt disponibles. Pour l'instant, tes gains s'accumulent sur ton wallet.",
        phase: 1,
      },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Tu dois être connecté.' },
      { status: 401 }
    );
  }

  try {
    const { data: profile } = await supabase
      .from('jurispurama_users')
      .select('stripe_connect_account_id')
      .eq('auth_user_id', user.id)
      .single();

    let accountId = profile?.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: false },
        },
        metadata: { user_id: user.id, app: 'jurispurama' },
      });
      accountId = account.id;
      await supabase
        .from('jurispurama_users')
        .update({ stripe_connect_account_id: accountId })
        .eq('auth_user_id', user.id);
    }

    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
        account_management: { enabled: true },
        notification_banner: { enabled: true },
        payouts: { enabled: true },
        payments: { enabled: true },
        balances: { enabled: true },
        documents: { enabled: true },
      },
    });

    return NextResponse.json({ ok: true, client_secret: session.client_secret });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Impossible de préparer la session Stripe Connect. Réessaie.',
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
