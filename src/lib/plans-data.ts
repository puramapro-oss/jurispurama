import type { PlanCard } from '@/types/plans'

// Subscription plan definitions
export const PLAN_CARDS: PlanCard[] = [
  {
    slug: 'free',
    label: 'Gratuit',
    monthly: 0,
    yearly: 0,
    yearlyMonthlyBarred: 0,
    features: [
      '3 consultations JurisIA / mois',
      'Analyse juridique de base',
      'Pas de génération de documents',
      'Idéal pour découvrir JurisPurama',
    ],
    cta: 'Ton plan actuel',
  },
  {
    slug: 'essentiel',
    label: 'Essentiel',
    monthly: 999,
    yearly: 8390,
    yearlyMonthlyBarred: 1420,
    features: [
      'Consultations JurisIA illimitées',
      '5 documents juridiques / mois',
      'Signature électronique (Art. 1366 CC)',
      '10 envois email / mois',
      'Scanner OCR et profil juridique',
    ],
    cta: 'Choisir Essentiel',
  },
  {
    slug: 'pro',
    label: 'Pro',
    monthly: 1999,
    yearly: 16790,
    yearlyMonthlyBarred: 2840,
    features: [
      'Tout Essentiel, en illimité',
      '3 recommandés AR / mois inclus',
      '50 envois email / mois',
      'Alertes deadlines J-7 / J-3 / J-1',
      'Support prioritaire',
    ],
    popular: true,
    cta: 'Choisir Pro',
  },
  {
    slug: 'avocat_virtuel',
    label: 'Premium',
    monthly: 3999,
    yearly: 33590,
    yearlyMonthlyBarred: 5680,
    features: [
      'Tout Pro, sans aucune limite',
      'Recommandés AR illimités',
      'Envois email illimités',
      'Suivi multi-dossiers avancé',
      'Accès prioritaire aux nouveautés',
    ],
    cta: 'Choisir Premium',
  },
]

export const FAQ = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: 'Oui. Tu peux annuler depuis le portail Stripe en 2 clics. Aucune pénalité, aucune question.',
  },
  {
    q: 'Comment fonctionne l\'essai de 14 jours ?',
    a: '14 jours gratuits pour tester toutes les fonctions du plan. Tu n\'es débité qu\'à la fin de l\'essai, et tu peux annuler avant sans payer un centime.',
  },
  {
    q: 'Puis-je changer de plan en cours de route ?',
    a: 'Bien sûr. Tu passes à un plan supérieur ou inférieur quand tu veux depuis le portail Stripe. L\'ajustement est au prorata.',
  },
  {
    q: 'Les paiements sont-ils sécurisés ?',
    a: 'Oui. JurisPurama ne stocke aucune donnée bancaire. Tout passe par Stripe (PCI-DSS niveau 1).',
  },
  {
    q: 'Puis-je obtenir un remboursement ?',
    a: 'Oui, sous 14 jours après ton premier paiement hors essai, si tu n\'as généré aucun document. Contacte contact@purama.dev.',
  },
]

export const GUARANTEES = [
  {
    title: 'Articles de loi cités',
    text: 'Chaque réponse de JurisIA s\'appuie sur des articles précis du droit français — Code civil, Code du travail, Code de la consommation. Tu peux toujours vérifier la source.',
  },
  {
    title: 'Documents à valeur juridique',
    text: 'Tes courriers et signatures électroniques respectent l\'article 1366 du Code civil : valeur probante équivalente au manuscrit. Recommandé AR24 sur les plans payants.',
  },
  {
    title: 'Annulation en 1 clic',
    text: '14 jours d\'essai sans carte bancaire. Tu peux résilier ton abonnement à tout moment depuis ton espace, sans justification ni frais cachés.',
  },
]
