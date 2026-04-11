import Link from 'next/link'
import type { Metadata } from 'next'
import { APP_NAME, COMPANY_INFO } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Politique de confidentialité — ${APP_NAME}`,
  description: `Politique de confidentialité et RGPD de ${APP_NAME}.`,
}

export default function ConfidentialitePage() {
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
            Politique de confidentialité
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                1. Responsable du traitement
              </h2>
              <p>
                {COMPANY_INFO.name}, sise {COMPANY_INFO.address}, est le
                responsable du traitement des données personnelles collectées
                via {APP_NAME}.
              </p>
              <p>
                <strong>Délégué à la protection des données (DPO) :</strong>{' '}
                <a
                  href={`mailto:${COMPANY_INFO.dpo}`}
                  className="text-[var(--justice)] underline"
                >
                  {COMPANY_INFO.dpo}
                </a>
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                2. Données collectées
              </h2>
              <p>Nous collectons uniquement les données strictement nécessaires :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Données de compte :</strong> adresse email, nom, mot
                  de passe chiffré
                </li>
                <li>
                  <strong>Données de profil juridique :</strong> informations
                  civiles, professionnelles, logement, bancaires (IBAN),
                  nécessaires à la génération de documents — remplies
                  volontairement par l&apos;utilisateur
                </li>
                <li>
                  <strong>Données de dossier :</strong> conversations avec
                  JurisIA, documents générés, justificatifs uploadés
                </li>
                <li>
                  <strong>Données de paiement :</strong> traitées uniquement
                  par Stripe — nous ne stockons aucune donnée bancaire
                </li>
                <li>
                  <strong>Données techniques :</strong> journaux
                  d&apos;accès, adresse IP, type de navigateur, à des fins de
                  sécurité et de mesure d&apos;audience
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                3. Finalités
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Création et gestion de ton compte utilisateur</li>
                <li>Fourniture du service d&apos;assistance juridique IA</li>
                <li>Génération et envoi de documents juridiques</li>
                <li>Facturation et gestion des abonnements</li>
                <li>Amélioration du service et support client</li>
                <li>Respect de nos obligations légales et comptables</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                4. Base légale
              </h2>
              <p>Les traitements sont fondés sur :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>L&apos;exécution du contrat</strong> entre toi et{' '}
                  {COMPANY_INFO.name}
                </li>
                <li>
                  <strong>Ton consentement</strong> pour les données
                  sensibles et la communication marketing (retractable à tout
                  moment)
                </li>
                <li>
                  <strong>Nos obligations légales</strong> (comptabilité,
                  facturation)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                5. Durée de conservation
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Compte actif :</strong> durée de la relation
                  contractuelle
                </li>
                <li>
                  <strong>Dossiers juridiques :</strong> 5 ans après le
                  dernier accès (délai de prescription de droit commun)
                </li>
                <li>
                  <strong>Données de facturation :</strong> 10 ans
                  (obligation comptable)
                </li>
                <li>
                  <strong>Logs techniques :</strong> 12 mois
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                6. Tes droits RGPD
              </h2>
              <p>
                Conformément au Règlement général sur la protection des
                données (RGPD) et à la loi Informatique et Libertés, tu
                disposes des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Droit d&apos;accès à tes données</li>
                <li>Droit de rectification</li>
                <li>Droit à l&apos;effacement («&nbsp;droit à l&apos;oubli&nbsp;»)</li>
                <li>Droit à la portabilité</li>
                <li>Droit d&apos;opposition et de limitation</li>
                <li>
                  Droit de définir des directives post-mortem sur tes données
                </li>
              </ul>
              <p>
                Pour exercer ces droits, contacte notre DPO :{' '}
                <a
                  href={`mailto:${COMPANY_INFO.dpo}`}
                  className="text-[var(--justice)] underline"
                >
                  {COMPANY_INFO.dpo}
                </a>
                . Nous répondons sous un délai maximal de 30 jours.
              </p>
              <p>
                En cas de litige, tu peux introduire une réclamation auprès
                de la CNIL — 3 Place de Fontenoy, 75007 Paris —{' '}
                <a
                  href="https://www.cnil.fr"
                  className="text-[var(--justice)] underline"
                >
                  cnil.fr
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                7. Sécurité
              </h2>
              <p>
                Tes données sensibles (IBAN, numéro de sécurité sociale,
                numéro fiscal) sont chiffrées au repos. Les connexions sont
                sécurisées par TLS 1.3. L&apos;authentification utilise un
                hash bcrypt et des jetons JWT. L&apos;accès interne est
                strictement limité et journalisé.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                8. Sous-traitants
              </h2>
              <p>
                Nous faisons appel aux sous-traitants suivants, tous conformes
                RGPD :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Vercel Inc.</strong> — hébergement du site (USA,
                  Data Processing Agreement signé, clauses contractuelles
                  types)
                </li>
                <li>
                  <strong>Anthropic PBC</strong> — moteur IA JurisIA (USA,
                  DPA signé)
                </li>
                <li>
                  <strong>Stripe Payments Europe Ltd.</strong> — paiements
                  (UE)
                </li>
                <li>
                  <strong>Resend Inc.</strong> — envois d&apos;emails
                  transactionnels
                </li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}
