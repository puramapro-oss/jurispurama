import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import FiscalBanner from '@/components/fiscal/FiscalBanner'
import FiscalSummaryDownload from '@/components/fiscal/FiscalSummaryDownload'

export const dynamic = 'force-dynamic'

async function getFiscalData() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { totalGains: 0, isAuth: false }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile) return { totalGains: 0, isAuth: true }

  // Somme des credits wallet de l'année en cours (primes + parrainage + autres)
  const year = new Date().getFullYear()
  const { data: transactions } = await admin
    .from('jurispurama_wallet_transactions')
    .select('amount, type, created_at')
    .eq('user_id', profile.id)
    .eq('type', 'credit')
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)

  const totalGains = (transactions ?? []).reduce(
    (acc, t) => acc + Number(t.amount ?? 0),
    0
  )
  return { totalGains, isAuth: true, year, profileId: profile.id }
}

export default async function FiscalPage() {
  const { totalGains, isAuth, year, profileId } = await getFiscalData()

  const thresholds = [
    {
      level: 1500,
      title: '1 500€',
      description: 'Première alerte amicale. Aucune obligation pour toi.',
    },
    {
      level: 2500,
      title: '2 500€',
      description: 'Rappel : 500€ avant le seuil déclaratif.',
    },
    {
      level: 3000,
      title: '3 000€',
      description:
        'Seuil déclaratif atteint. Tu dois déclarer. Nous émettons un DAS2 automatiquement.',
      highlight: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--surface-alt)] py-10 px-4">
      <div className="container-narrow">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Fiscal
          </p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl font-semibold text-[var(--justice)]">
            Tes obligations fiscales
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
            Purama t&apos;accompagne à chaque étape. Zéro papier. Zéro stress.
            Tu ne fais rien tant que tu n&apos;as pas atteint 3 000€ de gains
            annuels.
          </p>
        </header>

        {isAuth && totalGains >= 1500 && (
          <FiscalBanner totalGains={totalGains} year={year ?? new Date().getFullYear()} />
        )}

        {/* Tes gains cette année */}
        {isAuth && (
          <section className="mb-8 rounded-2xl bg-white border border-[var(--border)] p-6 shadow-sm">
            <h2 className="font-serif text-xl font-semibold text-[var(--justice)] mb-3">
              Tes gains {year ?? ''}
            </h2>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-4xl font-bold text-[var(--justice)] tabular-nums">
                {totalGains.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                cumulés depuis le 1er janvier
              </span>
            </div>
            {totalGains < 3000 && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Reste <strong>{(3000 - totalGains).toFixed(2)}€</strong> avant
                le seuil déclaratif.
              </p>
            )}
          </section>
        )}

        {/* 3 paliers */}
        <section className="mb-8">
          <h2 className="font-serif text-xl font-semibold text-[var(--justice)] mb-4">
            Les 3 paliers
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {thresholds.map((t) => (
              <div
                key={t.level}
                className={`rounded-2xl border p-5 ${
                  t.highlight
                    ? 'border-[var(--gold)] bg-gradient-to-br from-[var(--gold)]/10 to-white'
                    : 'border-[var(--border)] bg-white'
                }`}
              >
                <div className="font-serif text-3xl font-bold text-[var(--justice)]">
                  {t.title}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 étapes déclaration */}
        <section className="mb-8 rounded-2xl bg-white border border-[var(--border)] p-6 shadow-sm">
          <h2 className="font-serif text-xl font-semibold text-[var(--justice)] mb-4">
            Si tu dépasses 3 000€ : 3 étapes simples
          </h2>
          <ol className="space-y-4">
            {[
              {
                n: 1,
                title: 'Rends-toi sur impots.gouv.fr',
                text: 'Espace particulier, déclaration de revenus annuelle.',
              },
              {
                n: 2,
                title: 'Remplis la case 5NG',
                text: 'Bénéfices non commerciaux (BNC) issus de plateformes numériques.',
              },
              {
                n: 3,
                title: 'Indique le montant',
                text: 'Le total figurant sur ton récapitulatif annuel Purama (téléchargé ci-dessous).',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-[var(--justice)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{step.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            <strong>Abattement 34%</strong> : si tu déclares 5 000€, tu n&apos;es
            imposé que sur 3 300€ (régime micro-BNC).
          </p>
        </section>

        {/* Téléchargement récap */}
        {isAuth && profileId && (
          <section className="mb-8">
            <FiscalSummaryDownload userId={profileId} year={year ?? new Date().getFullYear()} />
          </section>
        )}

        {/* FAQ */}
        <section className="rounded-2xl bg-[var(--justice)]/5 border border-[var(--justice)]/10 p-6">
          <h2 className="font-serif text-lg font-semibold text-[var(--justice)] mb-3">
            Questions fréquentes
          </h2>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <details>
              <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
                Est-ce que Purama déclare pour moi ?
              </summary>
              <p className="mt-2">
                Oui. Pour chaque utilisateur ayant touché plus de 3 000€ dans
                l&apos;année, Purama émet un DAS2 auprès de l&apos;administration
                fiscale au 31 janvier. Mais c&apos;est à toi de reporter le
                montant dans ta déclaration de revenus (case 5NG).
              </p>
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
                Dois-je payer la TVA ?
              </summary>
              <p className="mt-2">
                Non, tant que tu restes en dessous du seuil de franchise en
                base (art. 293B CGI, 34 400€ en 2026). Purama fonctionne en
                franchise de TVA sur les montants qu&apos;il te reverse.
              </p>
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
                Si je suis salarié, ça change quoi ?
              </summary>
              <p className="mt-2">
                Rien. Les revenus Purama sont déclarés en BNC
                (micro-entreprise non nécessaire), en supplément de ton salaire.
                Aucun impact sur ton contrat de travail.
              </p>
            </details>
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Ces informations ne constituent pas un conseil fiscal personnalisé.
            Pour ta situation précise,{' '}
            <Link href="/chat" className="underline">
              pose la question à JurisIA
            </Link>{' '}
            ou consulte un conseiller fiscal.
          </p>
        </section>
      </div>
    </div>
  )
}
