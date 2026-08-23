/**
 * Lexique interdit — scan mécanique NIYAMA §0.3 ("aucun texte réglementé n'est
 * improvisé : lexique interdit scanné mécaniquement sur tout le texte de chaque app").
 *
 * Chaque entrée cible une formulation qui inverse ou brouille la frontière NIYAMA §3
 * JURIS ("information juridique générale seulement — la consultation personnalisée
 * est réservée aux avocats ; la frontière est codée") ou promet un résultat garanti.
 *
 * Ce fichier est lu par `src/scripts/scan-forbidden-lexicon.ts` (npm run scan:lexicon).
 * Ajouter une entrée ici = elle est désormais interdite dans tout texte visible
 * utilisateur (copy marketing, i18n, plans, FAQ, composants). Le scanner ignore
 * automatiquement ce fichier lui-même et les fichiers de test.
 */

export interface ForbiddenLexiconEntry {
  /** Identifiant court, stable, pour référencer l'entrée dans les rapports. */
  id: string
  /** Regex (insensible à la casse) appliquée ligne par ligne sur le texte source. */
  pattern: RegExp
  /** Pourquoi c'est interdit — affiché dans le rapport de scan. */
  reason: string
}

export const FORBIDDEN_LEXICON: ForbiddenLexiconEntry[] = [
  {
    id: 'replace-lawyer-fr',
    pattern: /remplace(?:\s+(?:vraiment|r[ée]ellement))?\s+(?:ton|un|votre|son)\s+avocat/i,
    reason:
      "Prétend remplacer un avocat — interdit, la consultation personnalisée est réservée aux avocats (loi du 31/12/1971).",
  },
  {
    id: 'replace-lawyer-en',
    pattern: /replaces?\s+(?:your|a|an)\s+(?:lawyer|attorney)/i,
    reason: 'Claims to replace a lawyer — forbidden, personalized consultation is reserved to licensed lawyers.',
  },
  {
    id: 'replace-lawyer-es',
    pattern: /sustituye\s+(?:realmente\s+)?a\s+(?:tu|un)\s+abogado/i,
    reason: 'Afirma sustituir a un abogado — prohibido, la consulta personalizada está reservada a abogados colegiados.',
  },
  {
    id: 'is-the-lawyer-fr',
    pattern: /l['’]avocat qui ne dort jamais/i,
    reason: "La marque se désigne littéralement comme \"l'avocat\" — brouille la frontière IA/professionnel réglementé.",
  },
  {
    id: 'is-the-lawyer-en',
    pattern: /the lawyer that never sleeps/i,
    reason: 'The brand literally calls itself "the lawyer" — blurs the AI/regulated-professional boundary.',
  },
  {
    id: 'is-the-lawyer-es',
    pattern: /el abogado que nunca duerme/i,
    reason: 'La marca se autodenomina literalmente "el abogado" — confunde la frontera IA/profesional regulado.',
  },
  {
    id: 'self-claims-lawyer',
    pattern: /je suis (?:ton|votre|son) avocat/i,
    reason: "L'IA ne doit jamais s'attribuer le statut d'avocat.",
  },
  {
    id: 'product-named-lawyer',
    pattern: /\bavocat virtuel\b/i,
    reason: "Nom de produit/plan suggérant un statut d'avocat — usage interdit dans un texte visible utilisateur (le nom commercial doit rester neutre, ex. \"Premium\").",
  },
  {
    id: 'guaranteed-outcome-fr',
    pattern: /(?:garanti(?:e|s)?|100\s?%)\s+(?:de\s+)?(?:gagner|réussite|succès|gain)/i,
    reason: 'Promesse de résultat garanti — interdite, une issue judiciaire ne peut jamais être garantie.',
  },
  {
    id: 'guaranteed-outcome-en',
    pattern: /guaranteed\s+(?:to\s+)?(?:win|success|outcome)/i,
    reason: 'Guaranteed-outcome claim — forbidden, a legal outcome can never be guaranteed.',
  },
  {
    id: 'never-recommend-lawyer',
    pattern: /ne\s+(?:dis|recommande)\s+jamais\s+(?:de\s+)?(?:consulter|voir)\s+(?:un\s+)?avocat/i,
    reason: "Instruction qui interdit de recommander un avocat — inverse la frontière NIYAMA JURIS, jamais autorisé, même dans un prompt IA.",
  },
]
