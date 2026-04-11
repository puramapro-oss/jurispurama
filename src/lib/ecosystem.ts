export interface PuramaApp {
  slug: string
  name: string
  tagline: string
  description: string
  url: string
  color: string
  icon: string
  live: boolean
}

export const PURAMA_APPS: PuramaApp[] = [
  {
    slug: 'jurispurama',
    name: 'JurisPurama',
    tagline: "L'avocat qui ne dort jamais",
    description:
      "L'assistant juridique IA qui remplace ton avocat à 99 %. Contestation d'amende, mise en demeure, litige en 3 clics.",
    url: 'https://jurispurama.purama.dev',
    color: '#1E3A5F',
    icon: '⚖️',
    live: true,
  },
  {
    slug: 'midas',
    name: 'MIDAS',
    tagline: 'Ton trader IA personnel',
    description:
      "Analyse technique automatique, signaux en temps réel, backtesting. L'IA qui trade avec toi, pas à ta place.",
    url: 'https://midas.purama.dev',
    color: '#F59E0B',
    icon: '📈',
    live: true,
  },
  {
    slug: 'kash',
    name: 'KASH',
    tagline: "Ton coach financier qui ne juge pas",
    description:
      "Budget, dettes, épargne automatique. KASH analyse tes comptes et te fait économiser sans effort.",
    url: 'https://kash.purama.dev',
    color: '#10B981',
    icon: '💰',
    live: true,
  },
  {
    slug: 'kaia',
    name: 'KAÏA',
    tagline: 'Ton médecin de poche',
    description:
      "KAÏA t'écoute, identifie tes symptômes et te guide vers la bonne prise en charge. 24/7, confidentiel.",
    url: 'https://kaia.purama.dev',
    color: '#06B6D4',
    icon: '🩺',
    live: true,
  },
  {
    slug: 'lingora',
    name: 'Lingora',
    tagline: 'Apprends une langue comme en immersion',
    description:
      "Conversations libres avec une IA polyglotte. Finis les exercices scolaires — parle vraiment.",
    url: 'https://lingora.purama.dev',
    color: '#3B82F6',
    icon: '🗣️',
    live: true,
  },
  {
    slug: 'sutra',
    name: 'SUTRA',
    tagline: "L'atelier du cinéaste",
    description:
      "Storyboard IA, script doctor, casting, planification. Tout ce qu'il faut pour tourner ton film.",
    url: 'https://sutra.purama.dev',
    color: '#8B5CF6',
    icon: '🎬',
    live: true,
  },
  {
    slug: 'prana',
    name: 'PRANA',
    tagline: 'Ton coach sport IA',
    description:
      "Programmes adaptatifs, suivi nutrition, progression mesurée. PRANA s'ajuste à ton niveau en temps réel.",
    url: 'https://prana.purama.dev',
    color: '#F472B6',
    icon: '🧘',
    live: true,
  },
  {
    slug: 'purama_compta',
    name: 'Compta Purama',
    tagline: "L'expert-comptable de poche",
    description:
      "Factures, TVA, déclarations. L'IA comptable pour les entrepreneurs et micro-entreprises françaises.",
    url: 'https://compta.purama.dev',
    color: '#0EA5E9',
    icon: '📊',
    live: true,
  },
]
