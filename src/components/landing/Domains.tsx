'use client'

import { useLocale } from '@/hooks/useLocale'
import { LEGAL_DOMAINS } from '@/lib/constants'
import Reveal from './Reveal'

const DOMAIN_EXAMPLES: Record<string, string> = {
  amende: 'Contester un PV en 3 clics',
  travail: 'Licenciement, prud’hommes, solde de tout compte',
  logement: 'Dépôt de garantie, loyer impayé, troubles',
  consommation: 'Remboursement, garantie, rétractation',
  famille: 'Divorce, garde, pension alimentaire',
  administratif: 'CAF, impôts, préfecture',
  fiscal: 'Redressement, taxe foncière, contentieux',
  penal: 'Plainte, audition, partie civile',
  sante: 'Erreur médicale, ALD, mutuelle',
  assurance: 'Sinistre refusé, résiliation',
  numerique: 'Droit à l’oubli, plainte CNIL',
  affaires: 'Impayés, contrats, associés',
}

export default function Domains() {
  const { t } = useLocale()

  return (
    <section id="domaines" className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            12 domaines
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.domains.title}
          </h2>
          <p className="mt-4 text-white/65 md:text-lg">{t.domains.subtitle}</p>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {LEGAL_DOMAINS.map((d, i) => (
            <Reveal key={d.id} delay={i * 0.04}>
              <div className="glass-dark group h-full rounded-2xl p-5 transition hover:-translate-y-1 hover:border-[var(--gold)]/40">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-2xl transition group-hover:scale-110">
                  {d.icon}
                </div>
                <div className="font-serif text-lg font-semibold text-white">
                  {d.label}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {DOMAIN_EXAMPLES[d.id] ?? ''}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
