import type { PlanId } from './constants'

export type Cycle = 'monthly' | 'yearly'

export const PLAN_ORDER: PlanId[] = ['free', 'essentiel', 'pro', 'avocat_virtuel']

export interface FeatureRow {
  label: string
  values: Record<PlanId, string | boolean>
}

export const FEATURE_ROWS: FeatureRow[] = [
  {
    label: 'Échanges avec JurisIA',
    values: {
      free: '3 / mois',
      essentiel: 'Illimitées',
      pro: 'Illimitées',
      avocat_virtuel: 'Illimitées',
    },
  },
  {
    label: 'Documents générés',
    values: {
      free: '1 / mois',
      essentiel: '5 / mois',
      pro: 'Illimités',
      avocat_virtuel: 'Illimités',
    },
  },
  {
    label: 'Signature électronique',
    values: {
      free: false,
      essentiel: true,
      pro: true,
      avocat_virtuel: true,
    },
  },
  {
    label: 'Envoi par email (accusé de lecture)',
    values: {
      free: true,
      essentiel: true,
      pro: true,
      avocat_virtuel: true,
    },
  },
  {
    label: 'Recommandé électronique AR24',
    values: {
      free: false,
      essentiel: '5,99 € / envoi',
      pro: '3 / mois inclus',
      avocat_virtuel: 'Illimités',
    },
  },
  {
    label: 'Profil juridique (chiffré AES-256)',
    values: {
      free: 'Basique',
      essentiel: 'Complet',
      pro: 'Complet',
      avocat_virtuel: 'Complet + historique',
    },
  },
  {
    label: 'Scanner OCR (amende, contrat, lettre)',
    values: {
      free: false,
      essentiel: '5 / mois',
      pro: 'Illimité',
      avocat_virtuel: 'Illimité',
    },
  },
  {
    label: 'Alertes deadline (J-7, J-3, J-1)',
    values: {
      free: false,
      essentiel: false,
      pro: true,
      avocat_virtuel: true,
    },
  },
  {
    label: 'Multi-dossiers avancé',
    values: {
      free: false,
      essentiel: false,
      pro: true,
      avocat_virtuel: true,
    },
  },
  {
    label: 'Support',
    values: {
      free: 'FAQ uniquement',
      essentiel: 'Email 48h',
      pro: 'Email prioritaire 24h',
      avocat_virtuel: 'Email + Tchat prioritaire',
    },
  },
  {
    label: 'Nouveautés en avant-première',
    values: {
      free: false,
      essentiel: false,
      pro: false,
      avocat_virtuel: true,
    },
  },
]

export const FAQ = [
  {
    q: "Comment fonctionne l'essai gratuit de 14 jours ?",
    a: "Tu t'abonnes à un plan payant sans carte bancaire et tu accèdes à 100 % des fonctionnalités pendant 14 jours. Aucun prélèvement automatique à la fin : tu choisis consciemment de continuer ou de revenir au plan Gratuit.",
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: "Oui, à tout moment depuis ton espace. En cas de passage à un plan supérieur, la différence est facturée au prorata. En cas de passage à un plan inférieur, le changement prend effet à la fin de la période en cours.",
  },
  {
    q: "Qu'arrive-t-il si je dépasse les quotas ?",
    a: "On ne te coupe jamais en pleine action. Tu reçois simplement une notification t'invitant à passer au plan supérieur — ou à acheter à l'unité (5,99 € pour un recommandé, 2,99 € pour un document, 1,99 € pour une signature).",
  },
  {
    q: 'Y a-t-il des frais cachés ?',
    a: "Aucun. Pas de frais de mise en route, pas de frais de résiliation, pas de facturation surprise. Le prix affiché = le prix payé. TVA non applicable art. 293 B du CGI (franchise en base).",
  },
  {
    q: 'Puis-je obtenir une facture ?',
    a: "Oui, automatiquement. Chaque paiement génère une facture PDF conforme (FA-2026-XXXXXX) disponible dans ton espace Facturation. Tu peux l'exporter à tout moment.",
  },
]
