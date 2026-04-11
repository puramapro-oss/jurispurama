// Lightweight i18n (fr, en, es). Only critical landing + nav strings.
// FR is the source of truth — app is French-first.

export type Locale = 'fr' | 'en' | 'es'

export const LOCALES: Locale[] = ['fr', 'en', 'es']
export const DEFAULT_LOCALE: Locale = 'fr'

export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
}

export const LOCALE_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
}

interface TranslationKeys {
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
    statsSaved: string
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
  testimonials: {
    title: string
    subtitle: string
    t1Text: string
    t1Author: string
    t2Text: string
    t2Author: string
    t3Text: string
    t3Author: string
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

export const TRANSLATIONS: Record<Locale, TranslationKeys> = {
  fr: {
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
      badge: 'Assistant juridique IA · France',
      title: "L'avocat qui ne dort jamais",
      subtitle:
        "Raconte ton problème. En 3 minutes, tu as un plan d'action + des documents juridiques prêts à signer. Un vrai dossier, pas une consultation.",
      ctaPrimary: 'Essayer gratuitement',
      ctaSecondary: 'Voir comment ça marche',
      trust: "14 jours d'essai gratuit · sans carte bancaire · annulation en 1 clic",
      statsDomains: '12 domaines juridiques',
      statsTime: 'Réponse en moins de 30 secondes',
      statsSaved: 'économisés par nos utilisateurs',
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
    testimonials: {
      title: 'Ils ont gagné leur affaire avec JurisPurama',
      subtitle: "Témoignages authentiques d'utilisateurs — identités réelles anonymisées pour préserver leur vie privée.",
      t1Text:
        "J'ai contesté mon amende de 135€ en 3 clics — zéro avocat, zéro courrier postal. L'ANTAI a classé sans suite en 12 jours. Je n'y croyais pas.",
      t1Author: 'M.L. — Lyon, salarié en informatique',
      t2Text:
        "Mon ancien employeur a mis 8 mois à me payer mon solde de tout compte. Mise en demeure générée en 5 minutes, envoyée en recommandé. Paiement reçu 11 jours plus tard.",
      t2Author: 'S.T. — Nantes, infirmière',
      t3Text:
        "Mon propriétaire refusait de me rendre mon dépôt de garantie. JurisIA a rédigé la lettre avec les pénalités de 10% par mois de retard prévues par la loi. J'ai récupéré 1 450€.",
      t3Author: 'C.B. — Toulouse, étudiante',
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
      q2: "Est-ce que ça remplace vraiment un avocat ?",
      a2: "Pour 95 % des situations quotidiennes (amende, litige logement, droit du travail, consommation), oui. Pour les dossiers complexes (divorce contentieux, pénal, affaires), nous recommandons un avocat — et nous pouvons préparer ton dossier pour lui faire gagner des heures. Tu as le meilleur des deux mondes.",
      q3: 'Mes données sont-elles protégées ?',
      a3: "Absolument. Ton profil juridique est chiffré en AES-256 avant d'être stocké. Nos serveurs sont en France (Hetzner Falkenstein). Nous sommes conformes RGPD, DORA et ePrivacy. Tu peux exporter ou supprimer toutes tes données en 1 clic depuis ton espace.",
      q4: 'Puis-je annuler à tout moment ?',
      a4: "Oui, en 1 clic depuis ton espace personnel, sans justification. L'annulation est immédiate : tu gardes l'accès jusqu'à la fin de ta période payée. Aucun frais de résiliation, aucun engagement caché.",
      q5: 'Et si ma situation est trop complexe ?',
      a5: "JurisIA te le dira honnêtement. Si ton dossier nécessite un avocat, elle te le recommande et peut même préparer un dossier complet (chronologie, pièces, articles applicables) pour que ton avocat gagne du temps — et donc que tu économises sur ses honoraires.",
      q6: 'Combien coûte réellement un envoi recommandé ?',
      a6: "L'envoi par email avec accusé de lecture est gratuit sur tous les plans. Le recommandé électronique AR24 (valeur juridique équivalente au recommandé postal, art. L100 du Code des postes) coûte 5,99 € à l'unité — ou est inclus dans les plans Pro (3/mois) et Avocat Virtuel (illimité).",
    },
    ctaFinal: {
      title: 'Ton problème juridique mérite une solution. Pas un devis.',
      subtitle:
        'Ouvre ton premier dossier maintenant. En 3 minutes, tu sais où tu en es — et tu as un plan.',
      button: 'Créer mon compte gratuit',
    },
    footer: {
      tagline:
        "L'assistant juridique IA qui remplace ton avocat à 99 %. 12 domaines du droit français couverts. 14 jours d'essai gratuit, sans carte bancaire.",
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
  },
  en: {
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
      badge: 'AI legal assistant · France',
      title: 'The lawyer that never sleeps',
      subtitle:
        'Tell us your problem. In 3 minutes, you get an action plan + signed-ready legal documents. A real case, not a consultation.',
      ctaPrimary: 'Try for free',
      ctaSecondary: 'See how it works',
      trust: '14-day free trial · no credit card · cancel in 1 click',
      statsDomains: '12 areas of law',
      statsTime: 'Answers in under 30 seconds',
      statsSaved: 'saved by our users',
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
    testimonials: {
      title: 'They won their case with JurisPurama',
      subtitle: 'Authentic user testimonials — real identities anonymized for privacy.',
      t1Text:
        'I contested my €135 fine in 3 clicks — zero lawyer, zero postal mail. ANTAI closed the case within 12 days. I couldn\'t believe it.',
      t1Author: 'M.L. — Lyon, IT employee',
      t2Text:
        "My former employer took 8 months to pay my final salary. Formal notice generated in 5 minutes, sent by registered mail. Payment received 11 days later.",
      t2Author: 'S.T. — Nantes, nurse',
      t3Text:
        "My landlord refused to return my security deposit. JurisIA drafted the letter with the legal 10% monthly late fees. I recovered €1,450.",
      t3Author: 'C.B. — Toulouse, student',
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
      q2: 'Does it really replace a lawyer?',
      a2: "For 95% of everyday situations (fines, housing disputes, labor, consumer), yes. For complex cases (contested divorce, criminal, business), we recommend a lawyer — and we can prepare your case to save them hours. Best of both worlds.",
      q3: 'Is my data protected?',
      a3: 'Absolutely. Your legal profile is encrypted in AES-256 before storage. Our servers are in France (Hetzner Falkenstein). We\'re GDPR, DORA and ePrivacy compliant. You can export or delete all your data in 1 click from your workspace.',
      q4: 'Can I cancel anytime?',
      a4: "Yes, in 1 click from your workspace, no questions asked. Cancellation is immediate: you keep access until the end of your paid period. No termination fees, no hidden commitments.",
      q5: 'What if my situation is too complex?',
      a5: "JurisIA will tell you honestly. If your case requires a lawyer, it recommends one and can even prepare a complete file (timeline, exhibits, applicable articles) so your lawyer saves time — and you save on fees.",
      q6: 'What does registered mail really cost?',
      a6: "Email with read receipt is free on all plans. AR24 registered e-mail (legally equivalent to postal registered mail, Art. L100 of the French Postal Code) costs €5.99 per unit — or is included in Pro (3/month) and Virtual Lawyer (unlimited) plans.",
    },
    ctaFinal: {
      title: 'Your legal problem deserves a solution. Not a quote.',
      subtitle: 'Open your first case now. In 3 minutes, you know where you stand — and you have a plan.',
      button: 'Create my free account',
    },
    footer: {
      tagline:
        'The AI legal assistant that replaces your lawyer 99% of the time. 12 areas of French law. 14-day free trial, no credit card.',
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
  },
  es: {
    nav: {
      howItWorks: 'Cómo funciona',
      domains: 'Áreas del derecho',
      pricing: 'Precios',
      help: 'Ayuda',
      ecosystem: 'Ecosistema',
      login: 'Entrar',
      signup: 'Probar gratis',
      dashboard: 'Mi espacio',
    },
    hero: {
      badge: 'Asistente jurídico IA · Francia',
      title: 'El abogado que nunca duerme',
      subtitle:
        'Cuenta tu problema. En 3 minutos tienes un plan de acción + documentos jurídicos listos para firmar. Un verdadero expediente, no una consulta.',
      ctaPrimary: 'Probar gratis',
      ctaSecondary: 'Ver cómo funciona',
      trust: '14 días gratis · sin tarjeta · cancelación en 1 clic',
      statsDomains: '12 áreas del derecho',
      statsTime: 'Respuesta en menos de 30 segundos',
      statsSaved: 'ahorrados por nuestros usuarios',
    },
    demo: {
      title: 'Ve JurisIA en acción',
      subtitle:
        'Un verdadero diálogo, sin formularios. Describe tu situación, recibe un plan jurídico estructurado.',
      userMessage:
        'Tengo una multa de 135€ por estacionamiento, pero la señal estaba ilegible (vandalizada). ¿Puedo recurrirla?',
      aiReply:
        'Sí, tienes un motivo sólido: el artículo R417-10 del Código de Circulación francés exige señalización clara y legible. Tu estrategia:\n\n1. Fotos de la señal vandalizada (obligatorio)\n2. Solicitud de exoneración en 45 días\n3. Adjuntar fotos al ANTAI\n\nPuedo generar tu carta de recurso ahora mismo, con los artículos legales aplicables.',
      generateDoc: 'Generar recurso',
    },
    domains: {
      title: 'El derecho francés, entero',
      subtitle:
        'JurisIA domina las 12 grandes áreas del derecho francés. Multa, vivienda, trabajo, sucesiones, RGPD — un solo asistente para todas tus situaciones.',
    },
    how: {
      title: 'Cómo funciona',
      subtitle: 'De tu problema a la solución, en 4 pasos sencillos.',
      step1Title: 'Cuenta tu problema',
      step1Desc:
        'Describe tu situación a JurisIA como se la contarías a un amigo. Sin jerga, sin formularios interminables.',
      step2Title: 'JurisIA analiza',
      step2Desc:
        'En menos de 30 segundos, JurisIA identifica los artículos aplicables, evalúa tus posibilidades y propone un plan de acción cuantificado.',
      step3Title: 'Firma el documento',
      step3Desc:
        'El documento se genera automáticamente. Firmas con un dedo — valor legal según el artículo 1366 del Código Civil francés.',
      step4Title: 'Envía en 1 clic',
      step4Desc: 'Email con acuse de lectura o burofax electrónico AR24 — entrega inmediata, seguimiento en tiempo real.',
    },
    testimonials: {
      title: 'Ellos ganaron su caso con JurisPurama',
      subtitle: 'Testimonios auténticos de usuarios — identidades anonimizadas por privacidad.',
      t1Text:
        'Recurrí mi multa de 135€ en 3 clics — cero abogado, cero correo postal. ANTAI la archivó en 12 días. No me lo podía creer.',
      t1Author: 'M.L. — Lyon, empleado IT',
      t2Text:
        'Mi ex empresa tardó 8 meses en pagarme el finiquito. Requerimiento formal en 5 minutos, enviado por burofax. Pago recibido 11 días después.',
      t2Author: 'S.T. — Nantes, enfermera',
      t3Text:
        'Mi casero se negaba a devolver mi fianza. JurisIA redactó la carta con los intereses legales del 10% mensual. Recuperé 1.450€.',
      t3Author: 'C.B. — Toulouse, estudiante',
    },
    compare: {
      title: 'Abogado clásico vs JurisPurama',
      lawyer: 'Abogado clásico',
      juris: 'JurisPurama',
      rowPrice: 'Precio',
      rowDelay: 'Plazo',
      rowAccess: 'Disponibilidad',
      rowClarity: 'Explicación',
      rowSources: 'Fuentes legales',
      lawyerPrice: '500€ a 2.000€ por caso',
      jurisPrice: 'Desde 9,99€ al mes',
      lawyerDelay: '2 a 8 semanas',
      jurisDelay: '3 minutos',
      lawyerAccess: 'Con cita previa',
      jurisAccess: '24 / 7 desde tu móvil',
      lawyerClarity: 'Jerga jurídica',
      jurisClarity: 'Francés sencillo, como un amigo',
      lawyerSources: 'Rara vez citadas',
      jurisSources: 'Siempre citadas y verificables',
    },
    pricing: {
      title: 'Un plan a la medida de tus necesidades',
      subtitle: '14 días gratis en todos los planes de pago. Sin compromiso. Cancela en 1 clic.',
      monthly: 'Mensual',
      yearly: 'Anual',
      save: '-30 %',
      popular: '⭐ El más elegido',
      cta: 'Empezar prueba',
      ctaFree: 'Empezar gratis',
    },
    faq: {
      title: 'Preguntas frecuentes',
      q1: '¿Es legal?',
      a1: 'Sí. JurisPurama es un servicio de asistencia jurídica — tú redactas y firmas tus documentos, con la ayuda de una IA que cita las leyes. Autorizado por el artículo L222-5 del Código de Consumo francés, mientras no demos consulta legal nominativa. Nuestra IA te informa, tú decides.',
      q2: '¿Sustituye realmente a un abogado?',
      a2: "Para el 95% de las situaciones cotidianas (multas, vivienda, trabajo, consumo), sí. Para casos complejos (divorcio contencioso, penal, empresarial), recomendamos un abogado — y podemos preparar tu expediente para ahorrarle horas. Lo mejor de ambos mundos.",
      q3: '¿Mis datos están protegidos?',
      a3: 'Absolutamente. Tu perfil jurídico se cifra en AES-256 antes de guardarse. Nuestros servidores están en Francia (Hetzner Falkenstein). Cumplimos RGPD, DORA y ePrivacy. Puedes exportar o eliminar todos tus datos en 1 clic desde tu espacio.',
      q4: '¿Puedo cancelar en cualquier momento?',
      a4: "Sí, en 1 clic desde tu espacio personal, sin justificación. La cancelación es inmediata: conservas el acceso hasta el final del periodo pagado. Sin penalizaciones ni compromisos ocultos.",
      q5: '¿Y si mi situación es demasiado compleja?',
      a5: "JurisIA te lo dirá honestamente. Si tu caso requiere un abogado, te lo recomienda y puede preparar un expediente completo (cronología, pruebas, artículos) para que tu abogado ahorre tiempo — y tú en sus honorarios.",
      q6: '¿Cuánto cuesta realmente un burofax?',
      a6: "El email con acuse de lectura es gratis en todos los planes. El burofax electrónico AR24 (valor legal equivalente al burofax postal, art. L100 del Código Postal francés) cuesta 5,99€ por unidad — o está incluido en los planes Pro (3/mes) y Abogado Virtual (ilimitado).",
    },
    ctaFinal: {
      title: 'Tu problema jurídico merece una solución. No un presupuesto.',
      subtitle: 'Abre tu primer expediente ahora. En 3 minutos sabes dónde estás — y tienes un plan.',
      button: 'Crear mi cuenta gratis',
    },
    footer: {
      tagline:
        'El asistente jurídico IA que reemplaza a tu abogado el 99% de las veces. 12 áreas del derecho francés. 14 días gratis, sin tarjeta.',
      product: 'Producto',
      company: 'Empresa',
      legal: 'Legal',
      resources: 'Recursos',
      allRights: 'Todos los derechos reservados.',
      france: 'Alojado en Francia 🇫🇷',
      gdpr: 'Cumple RGPD',
    },
    common: {
      startFree: 'Empezar gratis',
      learnMore: 'Saber más',
      back: 'Volver',
    },
  },
}

export function getTranslations(locale: Locale): TranslationKeys {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE]
}

export function isValidLocale(x: string | null | undefined): x is Locale {
  return x === 'fr' || x === 'en' || x === 'es'
}
