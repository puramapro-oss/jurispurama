import type { TranslationKeys } from './types'

// English translation
export const en: TranslationKeys = {
  nav: {
    howItWorks: 'How it works',
    domains: 'Areas of law',
    pricing: 'Pricing',
    help: 'Help',
    ecosystem: 'Ecosystem',
    login: 'Sign in',
    signup: 'Try for free',
    dashboard: 'My workspace',
  },
  hero: {
    badge: 'AI legal assistant · French law',
    title: 'Your legal copilot, available 24/7',
    subtitle:
      'Describe your problem in plain language. JurisIA identifies the applicable laws, drafts your letters and guides you to the outcome. A real case, not a consultation.',
    ctaPrimary: 'Start my case',
    ctaSecondary: 'Watch a demo',
    trust: '14-day trial · no credit card · cancel in 1 click',
    statsDomains: 'Areas of law',
    statsTime: 'Average response',
    statsTrial: 'Trial without card',
  },
  trust: {
    title: 'Built for trust',
    subtitle: 'No vanity numbers. Verifiable foundations and concrete commitments under French law.',
    items: [
      { title: 'Hosted in France', desc: 'Hetzner Falkenstein servers. Your data never leaves Europe.' },
      { title: 'AES-256 encryption', desc: 'Legal profile encrypted at rest. Only you can read your file.' },
      { title: 'Cited statutes', desc: 'Every answer is sourced — Civil Code, Labor Code, Consumer Code.' },
      { title: 'GDPR compliant', desc: '1-click export and deletion. ePrivacy & DORA aligned.' },
      { title: 'Legal signature', desc: 'Article 1366 of the French Civil Code. Equivalent to handwritten.' },
      { title: 'Registered AR24', desc: 'Electronic registered mail recognized by French law — art. L100 CPCE.' },
    ],
  },
  demo: {
    title: 'See JurisIA in action',
    subtitle: 'A real conversation — no forms. Describe your situation, get a structured legal plan.',
    userMessage:
      "I got a €135 parking ticket, but the sign was illegible (vandalized). Can I contest it?",
    aiReply:
      "Yes, you have a solid case: Article R417-10 of the French Highway Code requires clear and legible signage. Here's your strategy:\n\n1. Photos of the vandalized sign (required)\n2. Exoneration request within 45 days\n3. Attach photos to ANTAI\n\nI can generate your contestation letter right now, with the applicable legal references.",
    generateDoc: 'Generate contestation',
  },
  domains: {
    title: 'French law, in full',
    subtitle:
      'JurisIA masters the 12 main areas of French law. Fines, housing, labor, inheritance, GDPR — one assistant, every situation.',
  },
  how: {
    title: 'How it works',
    subtitle: 'From your problem to the solution, in 4 simple steps.',
    step1Title: 'Tell your problem',
    step1Desc: 'Describe your situation to JurisIA like you would to a friend. No jargon, no endless forms.',
    step2Title: 'JurisIA analyzes',
    step2Desc:
      'In under 30 seconds, JurisIA identifies applicable laws, evaluates your chances and proposes a quantified action plan.',
    step3Title: 'Sign the document',
    step3Desc:
      'The document is generated automatically. Sign with a fingertip — legally valid under Article 1366 of the French Civil Code.',
    step4Title: 'Send in 1 click',
    step4Desc:
      'Email with read receipt or AR24 registered e-mail — instant delivery, real-time tracking.',
  },
  compare: {
    title: 'Traditional lawyer vs JurisPurama',
    lawyer: 'Traditional lawyer',
    juris: 'JurisPurama',
    rowPrice: 'Price',
    rowDelay: 'Delay',
    rowAccess: 'Availability',
    rowClarity: 'Explanation',
    rowSources: 'Legal citations',
    lawyerPrice: '€500 to €2,000 per case',
    jurisPrice: 'From €9.99 / month',
    lawyerDelay: '2 to 8 weeks',
    jurisDelay: '3 minutes',
    lawyerAccess: 'By appointment',
    jurisAccess: '24 / 7 from your phone',
    lawyerClarity: 'Legal jargon',
    jurisClarity: 'Plain French, like a friend',
    lawyerSources: 'Rarely cited',
    jurisSources: 'Always cited and verifiable',
  },
  pricing: {
    title: 'A plan tailored to your needs',
    subtitle: '14-day free trial on all paid plans. No commitment. Cancel in 1 click.',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: '-30 %',
    popular: '⭐ Most popular',
    cta: 'Start trial',
    ctaFree: 'Start for free',
  },
  faq: {
    title: 'Frequently asked questions',
    q1: 'Is this legal?',
    a1: 'Yes. JurisPurama is a legal assistance service — you draft and sign your own documents, with help from an AI that cites the laws. Allowed under Article L222-5 of the French Consumer Code, as long as we don\'t provide nominative legal consultation. Our AI informs you; you decide.',
    q2: 'Do I still need a lawyer?',
    a2: "It depends on your situation. JurisPurama gives you general legal information and helps you prepare your case (fines, housing disputes, labor, consumer...) — for many simple matters, that's all you need. But for any contentious, complex, or high-stakes situation (contested divorce, criminal, business), JurisIA recommends consulting a licensed lawyer — and prepares your file to save them hours. You show up prepared, not alone.",
    q3: 'Is my data protected?',
    a3: 'Absolutely. Your legal profile is encrypted in AES-256 before storage. Our servers are in France (Hetzner Falkenstein). We\'re GDPR, DORA and ePrivacy compliant. You can export or delete all your data in 1 click from your workspace.',
    q4: 'Can I cancel anytime?',
    a4: "Yes, in 1 click from your workspace, no questions asked. Cancellation is immediate: you keep access until the end of your paid period. No termination fees, no hidden commitments.",
    q5: 'What if my situation is too complex?',
    a5: "JurisIA will tell you honestly. If your case requires a lawyer, it recommends one and can even prepare a complete file (timeline, exhibits, applicable articles) so your lawyer saves time — and you save on fees.",
    q6: 'What does registered mail really cost?',
    a6: "Email with read receipt is free on all plans. AR24 registered e-mail (legally equivalent to postal registered mail, Art. L100 of the French Postal Code) costs €5.99 per unit — or is included in Pro (3/month) and Premium (unlimited) plans.",
  },
  ctaFinal: {
    title: 'Your legal problem deserves a solution. Not a quote.',
    subtitle: 'Open your first case now. In 3 minutes, you know where you stand — and you have a plan.',
    button: 'Create my free account',
  },
  footer: {
    tagline:
      'The AI legal assistant that deciphers French law for you. 12 areas of law. 14-day free trial, no credit card.',
    product: 'Product',
    company: 'Company',
    legal: 'Legal',
    resources: 'Resources',
    allRights: 'All rights reserved.',
    france: 'Hosted in France 🇫🇷',
    gdpr: 'GDPR compliant',
  },
  common: {
    startFree: 'Start for free',
    learnMore: 'Learn more',
    back: 'Back',
  },
}
