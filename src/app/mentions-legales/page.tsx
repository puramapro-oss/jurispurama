import Link from 'next/link'
import type { Metadata } from 'next'
import { APP_NAME, APP_DOMAIN, COMPANY_INFO } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Mentions légales — ${APP_NAME}`,
  description: `Mentions légales de ${APP_NAME}, édité par ${COMPANY_INFO.name}.`,
}

export default function MentionsLegalesPage() {
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
            Mentions légales
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text-primary)] space-y-6">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Éditeur du site
              </h2>
              <p>
                Le site <strong>{APP_DOMAIN}</strong> est édité par{' '}
                <strong>{COMPANY_INFO.name}</strong>, Société par actions
                simplifiée unipersonnelle au capital social de 1 000 €.
              </p>
              <ul className="mt-2 space-y-1">
                <li>
                  <strong>Siège social :</strong> {COMPANY_INFO.address},{' '}
                  {COMPANY_INFO.country}
                </li>
                <li>
                  <strong>Représentant légal :</strong>{' '}
                  {COMPANY_INFO.legalRep}, Président
                </li>
                <li>
                  <strong>Contact :</strong>{' '}
                  <a
                    href={`mailto:${COMPANY_INFO.contactEmail}`}
                    className="text-[var(--justice)] underline"
                  >
                    {COMPANY_INFO.contactEmail}
                  </a>
                </li>
                <li>
                  <strong>Régime fiscal :</strong> {COMPANY_INFO.taxNote}
                </li>
                <li>
                  <strong>Zone :</strong> Zone France Ruralités
                  Revitalisation (ZFRR)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Directeur de la publication
              </h2>
              <p>{COMPANY_INFO.legalRep}, Président de {COMPANY_INFO.name}.</p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Hébergement
              </h2>
              <p>
                Site hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca
                Ave #4133, Covina, CA 91723, USA.
              </p>
              <p>
                Services de données et d&apos;authentification hébergés sur un
                serveur dédié situé en France (Union européenne), opéré par{' '}
                {COMPANY_INFO.name}.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Propriété intellectuelle
              </h2>
              <p>
                L&apos;ensemble du contenu de ce site (textes, images, logos,
                code source) est protégé par le droit d&apos;auteur et
                appartient à {COMPANY_INFO.name} ou à ses partenaires. Toute
                reproduction, représentation, modification, publication ou
                adaptation sans autorisation écrite préalable est interdite et
                constitue une contrefaçon sanctionnée par les articles L.335-2
                et suivants du Code de la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Avertissement important
              </h2>
              <p>
                <strong>{APP_NAME}</strong> est un assistant juridique basé sur
                une intelligence artificielle. Les analyses fournies par
                JurisIA sont basées sur le droit français en vigueur, mais ne
                constituent pas une consultation juridique personnalisée au
                sens de la loi du 31 décembre 1971. Pour les affaires
                nécessitant une représentation obligatoire (cour d&apos;assises,
                cour d&apos;appel civile), le recours à un avocat inscrit au
                barreau reste nécessaire.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                Médiation de la consommation
              </h2>
              <p>
                Conformément aux articles L.611-1 et suivants du Code de la
                consommation, l&apos;utilisateur peut recourir gratuitement au
                service de médiation CNPM-MÉDIATION DE LA CONSOMMATION, 27
                avenue de la Libération, 42400 Saint-Chamond — site :{' '}
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
                Contact
              </h2>
              <p>
                Pour toute question relative au site ou à ses services :{' '}
                <a
                  href={`mailto:${COMPANY_INFO.contactEmail}`}
                  className="text-[var(--justice)] underline"
                >
                  {COMPANY_INFO.contactEmail}
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}
