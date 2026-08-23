// Type definitions for i18n translations

export interface TranslationKeys {
  nav: {
    howItWorks: string
    domains: string
    pricing: string
    help: string
    ecosystem: string
    login: string
    signup: string
    dashboard: string
  }
  hero: {
    badge: string
    title: string
    subtitle: string
    ctaPrimary: string
    ctaSecondary: string
    trust: string
    statsDomains: string
    statsTime: string
    statsTrial: string
  }
  trust: {
    title: string
    subtitle: string
    items: { title: string; desc: string }[]
  }
  demo: {
    title: string
    subtitle: string
    userMessage: string
    aiReply: string
    generateDoc: string
  }
  domains: {
    title: string
    subtitle: string
  }
  how: {
    title: string
    subtitle: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
    step4Title: string
    step4Desc: string
  }
  compare: {
    title: string
    lawyer: string
    juris: string
    rowPrice: string
    rowDelay: string
    rowAccess: string
    rowClarity: string
    rowSources: string
    lawyerPrice: string
    jurisPrice: string
    lawyerDelay: string
    jurisDelay: string
    lawyerAccess: string
    jurisAccess: string
    lawyerClarity: string
    jurisClarity: string
    lawyerSources: string
    jurisSources: string
  }
  pricing: {
    title: string
    subtitle: string
    monthly: string
    yearly: string
    save: string
    popular: string
    cta: string
    ctaFree: string
  }
  faq: {
    title: string
    q1: string
    a1: string
    q2: string
    a2: string
    q3: string
    a3: string
    q4: string
    a4: string
    q5: string
    a5: string
    q6: string
    a6: string
  }
  ctaFinal: {
    title: string
    subtitle: string
    button: string
  }
  footer: {
    tagline: string
    product: string
    company: string
    legal: string
    resources: string
    allRights: string
    france: string
    gdpr: string
  }
  common: {
    startFree: string
    learnMore: string
    back: string
  }
}
