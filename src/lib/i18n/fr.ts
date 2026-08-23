import type { TranslationKeys } from './types'

// French translation (source of truth — app is French-first)
export const fr: TranslationKeys = {
  nav: {
    howItWorks: 'Comment ça marche',
    domains: 'Domaines',
    pricing: 'Tarifs',
    help: 'Aide',
    ecosystem: 'Écosystème',
    login: 'Connexion',
    signup: 'Essayer gratuitement',
    dashboard: 'Mon espace',
  },
  hero: {
    badge: 'Assistant juridique IA · Droit français',
    title: "Ton copilote juridique, disponible 24/7",
    subtitle:
      "Raconte ton problème en français courant. JurisIA identifie les articles applicables, rédige tes courriers et te guide jusqu'au résultat. Un vrai dossier, pas une consultation.",
    ctaPrimary: 'Démarrer mon dossier',
    ctaSecondary: 'Voir une démo',
    trust: "14 jours d'essai · sans carte bancaire · annulation en 1 clic",
    statsDomains: 'Domaines du droit',
    statsTime: 'Réponse moyenne',
    statsTrial: "Essai sans carte",
  },
  trust: {
    title: 'Pensé pour la confiance',
    subtitle:
      "Pas de promesse de chiffres. Des fondations vérifiables, des engagements concrets, conformes au droit français.",
    items: [
      { title: 'Hébergé en France', desc: 'Serveurs Hetzner Falkenstein. Tes données ne quittent jamais l\'Europe.' },
      { title: 'Chiffrement AES-256', desc: 'Profil juridique chiffré au repos. Tu seul peux relire ton dossier.' },
      { title: 'Articles cités', desc: 'Chaque conseil est sourcé : Code civil, Code du travail, Code de la conso.' },
      { title: 'Conformité RGPD', desc: 'Export et suppression de tes données en 1 clic. ePrivacy & DORA.' },
      { title: 'Signature légale', desc: 'Article 1366 du Code civil. Valeur juridique équivalente au manuscrit.' },
      { title: 'Recommandé AR24', desc: 'Recommandé électronique reconnu par l\'État français — art. L100 CPCE.' },
    ],
  },
  demo: {
    title: 'Vois JurisIA en action',
    subtitle:
      "Un vrai dialogue — pas de formulaire. Décris ta situation, reçois un plan d'action juridique structuré.",
    userMessage:
      "J'ai eu une amende de 135€ pour stationnement, mais le panneau était illisible (vandalisé). Je peux contester ?",
    aiReply:
      "Oui, tu as un motif solide : l'article R417-10 du Code de la route impose une signalisation claire et lisible. Voici ta stratégie :\n\n1. Photos du panneau vandalisé (obligatoire)\n2. Requête en exonération sous 45 jours\n3. Joindre les photos à l'ANTAI\n\nJe peux générer ta lettre de contestation maintenant, avec les articles de loi applicables.",
    generateDoc: 'Générer la contestation',
  },
  domains: {
    title: 'Le droit français, en entier',
    subtitle:
      "JurisIA maîtrise les 12 grands domaines du droit français. Amende, logement, travail, succession, RGPD — un seul assistant, toutes tes situations.",
  },
  how: {
    title: 'Comment ça marche',
    subtitle: 'De ton problème à la solution, en 4 étapes simples.',
    step1Title: 'Raconte ton problème',
    step1Desc:
      "Décris ta situation à JurisIA comme tu le ferais à un ami. Pas de jargon, pas de formulaire interminable.",
    step2Title: 'JurisIA analyse',
    step2Desc:
      "En moins de 30 secondes, JurisIA identifie les articles de loi applicables, évalue tes chances et propose un plan d'action chiffré.",
    step3Title: 'Signe le document',
    step3Desc:
      "Le document est généré automatiquement. Tu signes d'un trait de doigt — valeur juridique article 1366 du Code civil.",
    step4Title: 'Envoie en 1 clic',
    step4Desc:
      "Email avec accusé de lecture ou recommandé électronique AR24 — livraison immédiate, suivi en temps réel.",
  },
  compare: {
    title: 'Avocat classique vs JurisPurama',
    lawyer: 'Avocat classique',
    juris: 'JurisPurama',
    rowPrice: 'Prix',
    rowDelay: 'Délai',
    rowAccess: 'Disponibilité',
    rowClarity: 'Explication',
    rowSources: 'Articles de loi',
    lawyerPrice: '500 € à 2 000 € par dossier',
    jurisPrice: 'À partir de 9,99 € par mois',
    lawyerDelay: '2 à 8 semaines',
    jurisDelay: '3 minutes',
    lawyerAccess: 'Sur rendez-vous',
    jurisAccess: '24 / 7 depuis ton téléphone',
    lawyerClarity: 'Jargon juridique',
    jurisClarity: 'Français simple, comme un ami',
    lawyerSources: 'Rarement cités',
    jurisSources: 'Toujours cités et vérifiables',
  },
  pricing: {
    title: 'Un abonnement à hauteur de tes besoins',
    subtitle:
      "14 jours d'essai gratuit sur tous les plans payants. Sans engagement. Annulation en 1 clic.",
    monthly: 'Mensuel',
    yearly: 'Annuel',
    save: "-30 %",
    popular: '⭐ Le plus choisi',
    cta: "Démarrer l'essai",
    ctaFree: 'Commencer gratuitement',
  },
  faq: {
    title: 'Questions qui reviennent',
    q1: 'Est-ce que c\'est légal ?',
    a1: "Oui. JurisPurama est un service d'assistance juridique — tu rédiges et signes tes documents toi-même, avec l'aide d'une IA qui cite les articles de loi. C'est autorisé par le Code de la consommation (art. L222-5) tant que nous ne faisons pas de consultation juridique nominative. Notre IA t'informe, tu décides.",
    q2: "Ai-je quand même besoin d'un avocat ?",
    a2: "Ça dépend de ta situation. JurisPurama te donne de l'information juridique générale et t'aide à préparer ton dossier (amende, litige logement, droit du travail, consommation…) — pour beaucoup de démarches simples, tu n'as besoin de rien d'autre. Mais pour toute situation contentieuse, complexe ou à enjeu important (divorce contentieux, pénal, affaires), JurisIA te recommande de consulter un avocat inscrit au barreau — et prépare ton dossier pour lui faire gagner des heures. Tu arrives préparé, pas seul.",
    q3: 'Mes données sont-elles protégées ?',
    a3: "Absolument. Ton profil juridique est chiffré en AES-256 avant d'être stocké. Nos serveurs sont en France (Hetzner Falkenstein). Nous sommes conformes RGPD, DORA et ePrivacy. Tu peux exporter ou supprimer toutes tes données en 1 clic depuis ton espace.",
    q4: 'Puis-je annuler à tout moment ?',
    a4: "Oui, en 1 clic depuis ton espace personnel, sans justification. L'annulation est immédiate : tu gardes l'accès jusqu'à la fin de ta période payée. Aucun frais de résiliation, aucun engagement caché.",
    q5: 'Et si ma situation est trop complexe ?',
    a5: "JurisIA te le dira honnêtement. Si ton dossier nécessite un avocat, elle te le recommande et peut même préparer un dossier complet (chronologie, pièces, articles applicables) pour que ton avocat gagne du temps — et donc que tu économises sur ses honoraires.",
    q6: 'Combien coûte réellement un envoi recommandé ?',
    a6: "L'envoi par email avec accusé de lecture est gratuit sur tous les plans. Le recommandé électronique AR24 (valeur juridique équivalente au recommandé postal, art. L100 du Code des postes) coûte 5,99 € à l'unité — ou est inclus dans les plans Pro (3/mois) et Premium (illimité).",
  },
  ctaFinal: {
    title: 'Ton problème juridique mérite une solution. Pas un devis.',
    subtitle:
      'Ouvre ton premier dossier maintenant. En 3 minutes, tu sais où tu en es — et tu as un plan.',
    button: 'Créer mon compte gratuit',
  },
  footer: {
    tagline:
      "L'assistant juridique IA qui décrypte le droit français pour toi. 12 domaines couverts. 14 jours d'essai gratuit, sans carte bancaire.",
    product: 'Produit',
    company: 'Société',
    legal: 'Légal',
    resources: 'Ressources',
    allRights: 'Tous droits réservés.',
    france: 'Hébergé en France 🇫🇷',
    gdpr: 'RGPD conforme',
  },
  common: {
    startFree: 'Commencer gratuitement',
    learnMore: 'En savoir plus',
    back: 'Retour',
  },
}
