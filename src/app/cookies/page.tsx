import Link from 'next/link'
import type { Metadata } from 'next'
import { APP_NAME, COMPANY_INFO } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Politique cookies — ${APP_NAME}`,
  description: `Politique de gestion des cookies de ${APP_NAME}.`,
}

export default function CookiesPage() {
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
            Politique de gestion des cookies
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Qu&apos;est-ce qu&apos;un cookie ?
              </h2>
              <p>
                Un cookie est un petit fichier texte déposé sur ton
                terminal (ordinateur, téléphone, tablette) lors de la
                visite d&apos;un site web. Il permet au site de reconnaître
                ton navigateur et de stocker certaines informations.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Quels cookies utilisons-nous ?
              </h2>
              <p>{APP_NAME} utilise uniquement des cookies strictement nécessaires :</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>
                  <strong>Cookies de session :</strong> maintiennent ta
                  connexion à ton compte. Sans eux, tu devrais te
                  reconnecter à chaque page.
                </li>
                <li>
                  <strong>Cookies d&apos;authentification PKCE :</strong>
                  nécessaires pour l&apos;OAuth Google sécurisé.
                </li>
                <li>
                  <strong>Cookies CSRF :</strong> protègent contre les
                  attaques de falsification de requête.
                </li>
              </ul>
              <p className="mt-2">
                Ces cookies sont exemptés de consentement préalable conformément à
                l&apos;article 82 de la loi Informatique et Libertés
                (recommandation CNIL du 17 septembre 2020).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Cookies tiers
              </h2>
              <p>
                Nous n&apos;utilisons pas de cookies publicitaires ni de
                traqueurs tiers (Google Analytics, Facebook Pixel, etc.).
                Seul Stripe dépose des cookies strictement nécessaires au
                traitement sécurisé des paiements lorsque tu souscris à un
                abonnement.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Gérer tes cookies
              </h2>
              <p>
                Tu peux à tout moment paramétrer ton navigateur pour
                refuser ou supprimer les cookies. Attention, désactiver
                les cookies essentiels empêchera {APP_NAME} de fonctionner
                correctement.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Contact
              </h2>
              <p>
                Pour toute question :{' '}
                <a
                  href={`mailto:${COMPANY_INFO.dpo}`}
                  className="text-[var(--justice)] underline"
                >
                  {COMPANY_INFO.dpo}
                </a>
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}
