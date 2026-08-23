import type { TranslationKeys } from './types'

// Spanish translation
export const es: TranslationKeys = {
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
    badge: 'Asistente jurídico IA · Derecho francés',
    title: 'Tu copiloto jurídico, disponible 24/7',
    subtitle:
      'Cuenta tu problema en lenguaje sencillo. JurisIA identifica los artículos aplicables, redacta tus cartas y te guía hasta el resultado. Un verdadero expediente, no una consulta.',
    ctaPrimary: 'Iniciar mi caso',
    ctaSecondary: 'Ver demo',
    trust: '14 días de prueba · sin tarjeta · cancela en 1 clic',
    statsDomains: 'Áreas del derecho',
    statsTime: 'Respuesta media',
    statsTrial: 'Prueba sin tarjeta',
  },
  trust: {
    title: 'Diseñado para la confianza',
    subtitle: 'Sin cifras de vanidad. Bases verificables y compromisos concretos según el derecho francés.',
    items: [
      { title: 'Alojado en Francia', desc: 'Servidores Hetzner Falkenstein. Tus datos nunca salen de Europa.' },
      { title: 'Cifrado AES-256', desc: 'Perfil jurídico cifrado en reposo. Solo tú puedes leer tu expediente.' },
      { title: 'Artículos citados', desc: 'Cada respuesta está fundada — Código Civil, Laboral, Consumo.' },
      { title: 'Conforme RGPD', desc: 'Exportación y borrado en 1 clic. ePrivacy y DORA.' },
      { title: 'Firma legal', desc: 'Artículo 1366 del Código Civil francés. Equivale a la firma manuscrita.' },
      { title: 'Burofax AR24', desc: 'Burofax electrónico reconocido por la ley francesa — art. L100 CPCE.' },
    ],
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
    q2: '¿Todavía necesito un abogado?',
    a2: "Depende de tu situación. JurisPurama te da información jurídica general y te ayuda a preparar tu expediente (multas, vivienda, trabajo, consumo...) — para muchos trámites sencillos, no necesitas nada más. Pero para cualquier situación contenciosa, compleja o de alto riesgo (divorcio contencioso, penal, empresarial), JurisIA te recomienda consultar a un abogado colegiado — y prepara tu expediente para ahorrarle horas. Llegas preparado, no solo.",
    q3: '¿Mis datos están protegidos?',
    a3: 'Absolutamente. Tu perfil jurídico se cifra en AES-256 antes de guardarse. Nuestros servidores están en Francia (Hetzner Falkenstein). Cumplimos RGPD, DORA y ePrivacy. Puedes exportar o eliminar todos tus datos en 1 clic desde tu espacio.',
    q4: '¿Puedo cancelar en cualquier momento?',
    a4: "Sí, en 1 clic desde tu espacio personal, sin justificación. La cancelación es inmediata: conservas el acceso hasta el final del periodo pagado. Sin penalizaciones ni compromisos ocultos.",
    q5: '¿Y si mi situación es demasiado compleja?',
    a5: "JurisIA te lo dirá honestamente. Si tu caso requiere un abogado, te lo recomienda y puede preparar un expediente completo (cronología, pruebas, artículos) para que tu abogado ahorre tiempo — y tú en sus honorarios.",
    q6: '¿Cuánto cuesta realmente un burofax?',
    a6: "El email con acuse de lectura es gratis en todos los planes. El burofax electrónico AR24 (valor legal equivalente al burofax postal, art. L100 del Código Postal francés) cuesta 5,99€ por unidad — o está incluido en los planes Pro (3/mes) y Premium (ilimitado).",
  },
  ctaFinal: {
    title: 'Tu problema jurídico merece una solución. No un presupuesto.',
    subtitle: 'Abre tu primer expediente ahora. En 3 minutos sabes dónde estás — y tienes un plan.',
    button: 'Crear mi cuenta gratis',
  },
  footer: {
    tagline:
      'El asistente jurídico IA que descifra el derecho francés para ti. 12 áreas del derecho. 14 días gratis, sin tarjeta.',
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
}
