import Link from 'next/link'
import type { Metadata } from 'next'
import { APP_NAME, COMPANY_INFO } from '@/lib/constants'

export const metadata: Metadata = {
  title: `CGU — ${APP_NAME}`,
  description: `Conditions générales d'utilisation de ${APP_NAME}.`,
}

export default function CGUPage() {
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
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                1. Acceptation
              </h2>
              <p>
                En créant un compte sur {APP_NAME}, tu reconnais avoir lu,
                compris et accepté sans réserve les présentes conditions
                générales d&apos;utilisation. Si tu refuses ces conditions,
                tu dois renoncer à utiliser le service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                2. Description du service
              </h2>
              <p>
                {APP_NAME} fournit un service d&apos;assistance juridique
                basé sur une intelligence artificielle dénommée « JurisIA ».
                Le service permet notamment :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>L&apos;analyse de situations juridiques personnelles</li>
                <li>La génération de documents (mises en demeure, contestations, requêtes, etc.)</li>
                <li>La signature électronique de ces documents</li>
                <li>L&apos;envoi par courrier ou recommandé électronique</li>
                <li>Le suivi de dossiers et alertes de délais</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                3. Compte utilisateur
              </h2>
              <p>
                Tu es responsable de la confidentialité de ton mot de passe
                et de toutes les actions effectuées sous ton compte. Tu
                t&apos;engages à fournir des informations exactes et à les
                tenir à jour.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                4. Utilisation acceptable
              </h2>
              <p>Tu t&apos;engages à ne pas :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Utiliser le service à des fins illégales ou frauduleuses</li>
                <li>Tenter de contourner les mesures de sécurité</li>
                <li>Automatiser l&apos;utilisation du service (scraping, bots)</li>
                <li>Revendre le service à des tiers sans autorisation</li>
                <li>Utiliser le service pour nuire à autrui</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                5. Limites du service IA
              </h2>
              <p>
                JurisIA est un assistant basé sur une intelligence
                artificielle générative. Ses analyses s&apos;appuient sur le
                droit français en vigueur mais ne constituent pas une
                consultation juridique personnalisée au sens de la loi du 31
                décembre 1971 portant réforme de certaines professions
                judiciaires et juridiques.
              </p>
              <p>
                Pour les affaires nécessitant une représentation obligatoire
                (cour d&apos;assises, cour d&apos;appel civile notamment),
                le recours à un avocat inscrit au barreau reste obligatoire.
                {COMPANY_INFO.name} ne saurait être tenue responsable des
                décisions prises sur la seule base des analyses de JurisIA.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                6. Propriété intellectuelle
              </h2>
              <p>
                Tu conserves la propriété des documents et contenus que tu
                soumets au service. Tu accordes à {COMPANY_INFO.name} une
                licence limitée nécessaire au fonctionnement du service
                (stockage, traitement par l&apos;IA, affichage).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                7. Résiliation
              </h2>
              <p>
                Tu peux résilier ton compte à tout moment depuis tes
                paramètres. {COMPANY_INFO.name} se réserve le droit de
                suspendre ou supprimer tout compte en cas de violation des
                présentes CGU, avec effet immédiat et sans indemnité.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                8. Responsabilité
              </h2>
              <p>
                {COMPANY_INFO.name} met en œuvre les moyens raisonnables
                pour assurer la disponibilité et la qualité du service, sans
                garantie absolue. La responsabilité de {COMPANY_INFO.name}{' '}
                est limitée au montant payé par l&apos;utilisateur au cours
                des 12 derniers mois.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                9. Modification des CGU
              </h2>
              <p>
                Les présentes CGU peuvent être modifiées à tout moment. Les
                utilisateurs seront informés par email au moins 30 jours
                avant l&apos;entrée en vigueur des modifications
                substantielles.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                10. Droit applicable
              </h2>
              <p>
                Les présentes CGU sont régies par le droit français. Tout
                litige sera soumis aux tribunaux français compétents.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}
