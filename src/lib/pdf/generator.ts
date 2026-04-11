import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { askClaude } from '@/lib/claude'
import type {
  DocumentTemplate,
  PdfGeneratedContent,
  PdfProfile,
  PdfTemplateProps,
} from './types'
import { DOCUMENT_TEMPLATE_LABELS } from './types'
import ContestationAmendeTemplate from './templates/contestation-amende'
import MiseEnDemeureTemplate from './templates/mise-en-demeure'
import RequetePrudhommesTemplate from './templates/requete-prudhommes'
import ReclamationClientTemplate from './templates/reclamation-client'
import CourrierGeneriqueTemplate from './templates/courrier-generique'
import DeclarationSinistreTemplate from './templates/declaration-sinistre'
import RecoursGracieuxTemplate from './templates/recours-gracieux'
import type { JurisCase } from '@/types'

const TEMPLATE_MAP: Record<
  DocumentTemplate,
  (props: PdfTemplateProps) => ReturnType<typeof createElement>
> = {
  'contestation-amende': (p) => createElement(ContestationAmendeTemplate, p),
  'mise-en-demeure': (p) => createElement(MiseEnDemeureTemplate, p),
  'requete-prudhommes': (p) => createElement(RequetePrudhommesTemplate, p),
  'reclamation-client': (p) => createElement(ReclamationClientTemplate, p),
  'courrier-generique': (p) => createElement(CourrierGeneriqueTemplate, p),
  'declaration-sinistre': (p) => createElement(DeclarationSinistreTemplate, p),
  'recours-gracieux': (p) => createElement(RecoursGracieuxTemplate, p),
}

function buildContentPrompt(
  templateId: DocumentTemplate,
  caseRow: Pick<JurisCase, 'type' | 'sub_type' | 'summary' | 'strategy'>,
  profile: PdfProfile | null,
  conversationExcerpt: string,
  instructions: string | null
): string {
  const profileBits: string[] = []
  if (profile) {
    if (profile.first_name || profile.last_name)
      profileBits.push(
        `Client : ${[profile.first_name, profile.last_name].filter(Boolean).join(' ')}`
      )
    const addr = [
      profile.address_street,
      [profile.address_zip, profile.address_city].filter(Boolean).join(' '),
      profile.address_country ?? 'France',
    ]
      .filter((l) => !!l && l.trim().length > 0)
      .join(', ')
    if (addr) profileBits.push(`Adresse : ${addr}`)
    if (profile.phone) profileBits.push(`Tél : ${profile.phone}`)
    if (profile.email) profileBits.push(`Email : ${profile.email}`)
    if (profile.license_plate)
      profileBits.push(
        `Véhicule : ${[profile.vehicle_brand, profile.vehicle_model].filter(Boolean).join(' ') || 'n.c.'} immatriculé ${profile.license_plate}`
      )
    if (profile.employer_name)
      profileBits.push(`Employeur : ${profile.employer_name}`)
    if (profile.job_title) profileBits.push(`Poste : ${profile.job_title}`)
    if (profile.hire_date)
      profileBits.push(`Embauche le ${profile.hire_date}`)
    if (profile.salary_net)
      profileBits.push(`Salaire net : ${profile.salary_net} €`)
    if (profile.landlord_name)
      profileBits.push(`Bailleur : ${profile.landlord_name}`)
    if (profile.rent_amount)
      profileBits.push(`Loyer : ${profile.rent_amount} €/mois`)
  }

  return `Tu es JurisIA, avocate française expérimentée. Tu dois rédiger le contenu d'un document juridique de type **${DOCUMENT_TEMPLATE_LABELS[templateId]}** (template: ${templateId}).

# CONTEXTE DOSSIER
- Type de dossier : ${caseRow.type}${caseRow.sub_type ? ` / ${caseRow.sub_type}` : ''}
- Résumé : ${caseRow.summary ?? '—'}
- Stratégie du dossier : ${JSON.stringify(caseRow.strategy ?? {})}

# PROFIL CLIENT (pré-remplissage)
${profileBits.length > 0 ? profileBits.map((b) => `- ${b}`).join('\n') : '- (profil incomplet)'}

# HISTORIQUE DE LA CONVERSATION
${conversationExcerpt || '(pas d\'historique)'}

${instructions ? `# PRÉCISIONS SPÉCIFIQUES\n${instructions}\n` : ''}
# TÂCHE
Rédige le contenu du document en JSON STRICT respectant EXACTEMENT ce schéma (sans texte hors JSON) :

{
  "header": {
    "recipient_name": "string — destinataire (ex: 'Officier du Ministère Public', 'Monsieur le Directeur')",
    "recipient_address": "string multi-lignes séparées par \\n (ex: 'CNT — Centre national de traitement\\nCS 41101\\n35911 RENNES CEDEX 9')",
    "reference": "string ou null — ex: 'N° dossier : 123456'",
    "city": "string — ville émission (depuis profil si dispo)",
    "date": "string — date au format 'DD mois YYYY' en français (laisse vide si tu veux la date du jour)"
  },
  "subject": "string — objet concis (ex: 'Contestation d\\'avis de contravention n° 123456789')",
  "salutation": "string — formule d'appel (ex: 'Madame, Monsieur l\\'Officier du Ministère Public,')",
  "facts": "string — rappel des faits précis et chronologique, 3 à 6 paragraphes séparés par deux sauts de ligne (\\n\\n)",
  "legal_grounds": "string — moyens de droit argumentés, cite les articles exacts (ex: 'Art. 429 CPP', 'Art. L.121-3 Code route'). 3 à 6 paragraphes séparés par \\n\\n",
  "requests": "string — demandes précises numérotées ou en liste à tirets, 2 à 5 demandes",
  "conclusion": "string — formule de politesse longue et respectueuse française",
  "footnotes": [
    { "marker": "¹", "text": "Art. L.121-3 du Code de la route : ..." },
    { "marker": "²", "text": "..." }
  ],
  "attachments": ["string — liste des pièces jointes (ex: 'Copie de l\\'avis de contravention')"]
}

# RÈGLES
- Français juridique rigoureux, formules standards des courriers d'avocat.
- Ne PAS utiliser de markdown dans les valeurs (pas de **, pas de #).
- CITE LES ARTICLES DE LOI RÉELS uniquement (tu es experte, tu les connais). JAMAIS d'article inventé.
- Utilise le profil client pour personnaliser (nom, adresse, références, etc.).
- Les footnotes sont les articles de loi cités dans legal_grounds, reprenant brièvement leur contenu.
- Si tu manques d'info cruciale, mets une mention entre crochets type "[à compléter : ...]" dans le texte, mais remplis quand même tout le JSON.
- Date : utilise le format "JJ mois AAAA" en français.
- ${templateId === 'mise-en-demeure' ? 'Rappelle le délai de 8 jours et la menace d\'action judiciaire.' : ''}
- ${templateId === 'contestation-amende' ? 'Rappelle que le délai de contestation est de 45 jours (Art. 529-2 CPP) et la consignation éventuelle.' : ''}
- ${templateId === 'requete-prudhommes' ? 'Cite le barème Macron (Art. L.1235-3 Code travail) si applicable, calcule des indemnités chiffrées.' : ''}
- ${templateId === 'recours-gracieux' ? 'Rappelle délai 2 mois (Art. R.421-1 CJA) et possibilité recours contentieux.' : ''}

Retourne UNIQUEMENT le JSON, sans texte d'introduction ni commentaire.`
}

/**
 * Ask JurisIA for structured content, then render the PDF buffer.
 */
export async function generateDocumentPdf(opts: {
  templateId: DocumentTemplate
  title: string
  caseRow: Pick<
    JurisCase,
    'id' | 'type' | 'sub_type' | 'summary' | 'strategy'
  >
  profile: PdfProfile | null
  conversationExcerpt: string
  instructions?: string | null
}): Promise<{ buffer: Buffer; content: PdfGeneratedContent }> {
  const prompt = buildContentPrompt(
    opts.templateId,
    opts.caseRow,
    opts.profile,
    opts.conversationExcerpt,
    opts.instructions ?? null
  )

  const raw = await askClaude({
    system:
      'Tu es JurisIA, rédactrice juridique française experte. Tu réponds UNIQUEMENT avec un JSON valide, sans aucun texte hors JSON, sans balise markdown, sans commentaire.',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 8192,
    temperature: 0.3,
  })

  const jsonStr = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let content: PdfGeneratedContent
  try {
    content = JSON.parse(jsonStr) as PdfGeneratedContent
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'parsing impossible'
    throw new Error(
      `JurisIA a retourné un format invalide (${msg}). Réessaie dans un instant.`
    )
  }

  // Safety fill for required fields
  content.header = {
    recipient_name: content.header?.recipient_name ?? 'Destinataire',
    recipient_address: content.header?.recipient_address ?? '',
    reference: content.header?.reference ?? undefined,
    city: content.header?.city ?? opts.profile?.address_city ?? undefined,
    date: content.header?.date,
    sender_name: content.header?.sender_name,
    sender_address: content.header?.sender_address,
  }
  content.subject = content.subject ?? opts.title
  content.salutation = content.salutation ?? 'Madame, Monsieur,'
  content.facts = content.facts ?? ''
  content.legal_grounds = content.legal_grounds ?? ''
  content.requests = content.requests ?? ''
  content.conclusion =
    content.conclusion ??
    "Dans cette attente, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
  content.footnotes = content.footnotes ?? []
  content.attachments = content.attachments ?? []

  const element = TEMPLATE_MAP[opts.templateId]({
    profile: opts.profile,
    case: opts.caseRow,
    data: content,
    title: opts.title,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = (await renderToBuffer(element as any)) as Buffer
  return { buffer, content }
}
