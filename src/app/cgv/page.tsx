import Link from 'next/link'
import type { Metadata } from 'next'
import { APP_NAME, COMPANY_INFO, PLANS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title: `CGV — ${APP_NAME}`,
  description: `Conditions générales de vente de ${APP_NAME}.`,
}

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-parchment py-16">
      <div className="container-narrow max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--justice)]"
        >
          ← Retour à l&apos;accueil
        </Link>
        <article className="glass mt-6 rounded-3xl p-8 md:p-12">
          <h1 className="font-serif text-4xl font-semibold text-[var(--justice)] mb-2">
            Conditions Générales de Vente
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                1. Objet
              </h2>
              <p>
                Les présentes conditions générales de vente (« CGV »)
                s&apos;appliquent à toutes les souscriptions aux services
                payants de {APP_NAME}, édité par {COMPANY_INFO.name}, sis{' '}
                {COMPANY_INFO.address}.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                2. Tarifs
              </h2>
              <p>
                Les tarifs sont indiqués en euros TTC sur la page tarifs.{' '}
                {COMPANY_INFO.taxNote}. Les abonnements suivants sont
                disponibles :
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                {Object.values(PLANS).map((p) => (
                  <li key={p.id}>
                    <strong>{p.label}</strong> :{' '}
                    {p.priceMonthly === 0
                      ? 'gratuit'
                      : `${formatPrice(p.priceMonthly)} / mois ou ${formatPrice(p.priceYearly)} / an`}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Services ponctuels hors forfait : recommandé électronique AR
                à 5,99 € par envoi, signature électronique supplémentaire à
                1,99 € par document.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                3. Essai gratuit
              </h2>
              <p>
                Tous les plans payants incluent un essai gratuit de 14 jours
                sans engagement. Aucun moyen de paiement n&apos;est requis à
                l&apos;inscription. À l&apos;issue de cette période, tu peux
                choisir librement de souscrire ou non.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                4. Paiement
              </h2>
              <p>
                Les paiements sont traités de manière sécurisée par Stripe
                Payments Europe Ltd. Nous n&apos;avons jamais accès à tes
                données bancaires. Les abonnements sont prélevés
                automatiquement selon la périodicité choisie (mensuelle ou
                annuelle).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                5. Résiliation et droit de rétractation
              </h2>
              <p>
                Tu peux résilier ton abonnement à tout moment depuis ton
                espace personnel. La résiliation prend effet à la fin de la
                période en cours.
              </p>
              <p>
                Conformément à l&apos;article L.221-28 du Code de la
                consommation, le droit de rétractation de 14 jours ne
                s&apos;applique pas aux services pleinement exécutés avant la
                fin du délai de rétractation lorsque l&apos;exécution a
                commencé avec ton accord préalable exprès et avec
                renoncement exprès à ton droit de rétractation. En
                souscrivant à un abonnement et en commençant à utiliser
                JurisIA, tu acceptes expressément ce renoncement.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                6. Facturation
              </h2>
              <p>
                Une facture électronique est émise automatiquement à chaque
                paiement et mise à disposition dans ton espace personnel.
                Les factures respectent les mentions obligatoires du Code de
                commerce et du Code général des impôts, y compris la mention{' '}
                {COMPANY_INFO.taxNote}.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                7. Garanties
              </h2>
              <p>
                {APP_NAME} fournit un service d&apos;assistance juridique IA
                de haut niveau, mais ne garantit pas le résultat d&apos;une
                procédure judiciaire ou administrative. JurisIA s&apos;appuie
                sur le droit français en vigueur à la date de la
                consultation.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                8. Médiation
              </h2>
              <p>
                En cas de litige, tu peux recourir gratuitement au service de
                médiation CNPM-MÉDIATION DE LA CONSOMMATION —{' '}
                <a
                  href="https://cnpm-mediation-consommation.eu"
                  className="text-[var(--justice)] underline"
                >
                  cnpm-mediation-consommation.eu
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                9. Loi applicable
              </h2>
              <p>
                Les présentes CGV sont régies par le droit français. Tout
                litige relève de la compétence des tribunaux français.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}
