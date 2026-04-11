export interface FaqArticle {
  id: string
  category: FaqCategory
  question: string
  answer: string
  keywords: string[]
}

export type FaqCategory =
  | 'compte'
  | 'dossiers'
  | 'documents'
  | 'paiement'
  | 'parrainage'
  | 'securite'

export const FAQ_CATEGORIES: Array<{ id: FaqCategory; label: string; icon: string }> = [
  { id: 'compte', label: 'Compte', icon: '👤' },
  { id: 'dossiers', label: 'Dossiers', icon: '📁' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'paiement', label: 'Paiement', icon: '💳' },
  { id: 'parrainage', label: 'Parrainage', icon: '🎁' },
  { id: 'securite', label: 'Sécurité', icon: '🔒' },
]

export const FAQ_ARTICLES: FaqArticle[] = [
  // COMPTE
  {
    id: 'compte-creation',
    category: 'compte',
    question: 'Comment créer mon compte JurisPurama ?',
    answer:
      "Clique sur « Essayer gratuitement » en haut de la page. Tu peux t'inscrire en 30 secondes avec ton email, ou via Google. Aucune carte bancaire n'est demandée. Tu accèdes immédiatement à ton espace avec 3 consultations gratuites.",
    keywords: ['inscription', 'creer', 'compte', 'signup', 'email', 'google'],
  },
  {
    id: 'compte-oubli-mdp',
    category: 'compte',
    question: 'J\'ai oublié mon mot de passe, comment le réinitialiser ?',
    answer:
      "Sur la page de connexion, clique sur « Mot de passe oublié ». Saisis ton email — nous t'envoyons un lien de réinitialisation valable 1 heure. Clique dessus et choisis un nouveau mot de passe. Si tu n'as rien reçu, vérifie tes spams ou écris-nous à contact@purama.dev.",
    keywords: ['mot de passe', 'oublie', 'reinitialiser', 'password', 'reset'],
  },
  {
    id: 'compte-suppression',
    category: 'compte',
    question: 'Comment supprimer définitivement mon compte ?',
    answer:
      "Depuis ton espace, rends-toi dans Paramètres → Sécurité → Supprimer mon compte. La suppression est immédiate et irréversible : toutes tes données (dossiers, documents, profil) sont effacées sous 30 jours conformément au RGPD. Tu peux aussi nous écrire à contact@purama.dev pour une demande manuelle.",
    keywords: ['supprimer', 'rgpd', 'effacer', 'compte', 'delete'],
  },

  // DOSSIERS
  {
    id: 'dossiers-creation',
    category: 'dossiers',
    question: 'Comment créer un nouveau dossier ?',
    answer:
      "Depuis ton tableau de bord, clique sur « Nouveau dossier » ou ouvre le chat JurisIA. Raconte ta situation en langage naturel — pas besoin de jargon. JurisIA crée automatiquement le dossier, identifie le domaine juridique et te propose un plan d'action en moins de 30 secondes.",
    keywords: ['dossier', 'nouveau', 'creer', 'case', 'jurisia'],
  },
  {
    id: 'dossiers-partage',
    category: 'dossiers',
    question: 'Puis-je partager un dossier avec mon avocat ?',
    answer:
      "Oui. Dans la vue dossier, clique sur « Exporter » pour télécharger une archive PDF complète avec la chronologie, les documents générés, les articles de loi applicables et le profil juridique. Tu peux envoyer cette archive à ton avocat pour lui faire gagner des heures de préparation.",
    keywords: ['partager', 'avocat', 'export', 'pdf', 'archive'],
  },
  {
    id: 'dossiers-suppression',
    category: 'dossiers',
    question: 'Comment archiver ou supprimer un dossier ?',
    answer:
      "Dans la liste de tes dossiers, clique sur les 3 points du dossier concerné. Tu peux l'archiver (il reste accessible mais ne s'affiche plus par défaut) ou le supprimer définitivement. La suppression efface aussi les documents et messages associés, sans possibilité de récupération.",
    keywords: ['archiver', 'supprimer', 'dossier'],
  },

  // DOCUMENTS
  {
    id: 'docs-types',
    category: 'documents',
    question: 'Quels types de documents JurisIA peut-elle générer ?',
    answer:
      "JurisIA génère 7 types de documents : contestation d'amende, mise en demeure, lettre de réclamation, demande de remboursement, lettre de résiliation, déclaration de sinistre et plainte RGPD. Chaque document cite les articles de loi applicables et est conforme aux exigences formelles (en-tête, date, formules d'usage).",
    keywords: ['document', 'template', 'contestation', 'mise en demeure', 'lettre'],
  },
  {
    id: 'docs-signature',
    category: 'documents',
    question: 'La signature électronique a-t-elle une valeur juridique ?',
    answer:
      "Oui, totalement. Notre signature électronique est conforme à l'article 1366 du Code civil français et au règlement eIDAS européen. Chaque signature est horodatée, hachée en SHA-256 et vérifiable publiquement via un lien unique. Elle a la même valeur qu'une signature manuscrite devant un juge.",
    keywords: ['signature', 'electronique', '1366', 'eidas', 'legal'],
  },
  {
    id: 'docs-envoi',
    category: 'documents',
    question: 'Comment envoyer un document à sa destination ?',
    answer:
      "Depuis la vue document, tu as deux options : (1) Email avec accusé de lecture — gratuit sur tous les plans, livraison immédiate. (2) Recommandé électronique AR24 — 5,99 € à l'unité ou inclus dans les plans Pro/Avocat Virtuel, valeur juridique équivalente au recommandé postal (article L100 du Code des postes).",
    keywords: ['envoi', 'email', 'recommande', 'ar24', 'courrier'],
  },

  // PAIEMENT
  {
    id: 'paiement-essai',
    category: 'paiement',
    question: 'L\'essai gratuit est-il vraiment gratuit ?',
    answer:
      "Oui, totalement. 14 jours d'essai sans carte bancaire demandée. Tu accèdes à toutes les fonctionnalités du plan Pro pendant 14 jours. À la fin de l'essai, tu peux choisir de t'abonner ou continuer en version gratuite (3 consultations/mois). Aucun prélèvement surprise.",
    keywords: ['essai', 'gratuit', '14 jours', 'trial', 'carte bancaire'],
  },
  {
    id: 'paiement-annulation',
    category: 'paiement',
    question: 'Comment annuler mon abonnement ?',
    answer:
      "Dans ton espace, va dans Paramètres → Abonnement → Gérer mon abonnement. Tu arrives sur le portail Stripe : clique sur « Annuler l'abonnement ». L'annulation est immédiate — tu gardes l'accès payant jusqu'à la fin de ta période déjà payée. Aucun frais de résiliation.",
    keywords: ['annuler', 'abonnement', 'cancel', 'stripe', 'portal'],
  },
  {
    id: 'paiement-remboursement',
    category: 'paiement',
    question: 'Puis-je être remboursé ?',
    answer:
      "Oui, nous offrons une garantie de remboursement de 14 jours après le premier paiement (hors essai gratuit). Si tu n'es pas satisfait, écris-nous à contact@purama.dev avec ton email d'inscription — nous procédons au remboursement intégral sous 5 jours ouvrés.",
    keywords: ['remboursement', 'refund', 'garantie'],
  },
  {
    id: 'paiement-facture',
    category: 'paiement',
    question: 'Où puis-je télécharger mes factures ?',
    answer:
      "Depuis ton espace, va dans Paramètres → Facturation → Historique. Tu peux télécharger toutes tes factures au format PDF (FA-2026-XXXXXX). Conformément à l'article 293 B du CGI, la TVA n'est pas applicable à nos prestations (franchise en base).",
    keywords: ['facture', 'pdf', 'telecharger', 'tva', '293b'],
  },

  // PARRAINAGE
  {
    id: 'parrainage-fonctionnement',
    category: 'parrainage',
    question: 'Comment fonctionne le programme de parrainage ?',
    answer:
      "Chaque compte a un code de parrainage unique et un lien personnalisé. Quand un filleul s'abonne via ton lien, tu touches 50 % de son premier paiement + 10 % de ses paiements récurrents à vie. Les gains sont versés sur ton wallet et retirables par virement IBAN dès 5 €.",
    keywords: ['parrainage', 'referral', 'commission', 'lien', 'wallet'],
  },
  {
    id: 'parrainage-paliers',
    category: 'parrainage',
    question: 'Quels sont les paliers et avantages ?',
    answer:
      "Bronze (5 filleuls) → Argent (10) → Or (25) → Platine (50) → Diamant (75) → Légende (100). Chaque palier débloque des avantages : plans gratuits à vie, commissions majorées, features prioritaires, accès beta. Les filleuls sont comptés à partir de leur premier paiement (pas juste l'inscription).",
    keywords: ['palier', 'bronze', 'or', 'legende', 'avantage'],
  },
  {
    id: 'parrainage-retrait',
    category: 'parrainage',
    question: 'Comment retirer mes gains de parrainage ?',
    answer:
      "Dans ton espace Parrainage, clique sur « Retirer ». Renseigne ton IBAN — le virement part sous 5 jours ouvrés. Minimum de retrait : 5 €. Pas de plafond maximum. Aucun frais de retrait. Les retraits sont traités automatiquement les lundi et jeudi.",
    keywords: ['retrait', 'iban', 'virement', 'wallet'],
  },

  // SECURITE
  {
    id: 'securite-chiffrement',
    category: 'securite',
    question: 'Comment mes données sont-elles protégées ?',
    answer:
      "Ton profil juridique est chiffré en AES-256 avant d'être stocké en base. Les mots de passe sont hachés en bcrypt (coût 12). Les communications sont en TLS 1.3. Nos serveurs sont en France (Hetzner Falkenstein), conformes RGPD et DORA. Nous ne vendons jamais tes données et ne les utilisons pas pour entraîner des IA tierces.",
    keywords: ['chiffrement', 'aes', 'securite', 'rgpd', 'france'],
  },
  {
    id: 'securite-hebergement',
    category: 'securite',
    question: 'Où sont hébergées mes données ?',
    answer:
      "Exclusivement en France. Nos serveurs sont chez Hetzner (datacenter Falkenstein, Allemagne pour l'infra, avec frontale France). Aucune donnée ne transite ni ne résidente hors Union Européenne. Nous utilisons Claude (Anthropic) pour l'IA, avec un traitement sans rétention des conversations utilisateur.",
    keywords: ['hebergement', 'serveur', 'france', 'ue', 'rgpd'],
  },
  {
    id: 'securite-2fa',
    category: 'securite',
    question: 'Puis-je activer la double authentification (2FA) ?',
    answer:
      "Oui. Depuis Paramètres → Sécurité → 2FA, active la double authentification avec une application comme Google Authenticator ou Authy. À chaque connexion, tu devras saisir un code à 6 chiffres généré sur ton téléphone. Fortement recommandé pour les comptes Pro et Avocat Virtuel.",
    keywords: ['2fa', 'authentification', 'double', 'authenticator', 'securite'],
  },
]

// Simple fuzzy matching — no library needed.
export function searchFaq(query: string, articles: FaqArticle[] = FAQ_ARTICLES): FaqArticle[] {
  const q = query.trim().toLowerCase()
  if (!q) return articles
  const tokens = q.split(/\s+/).filter(Boolean)
  return articles
    .map((a) => {
      const haystack = `${a.question} ${a.answer} ${a.keywords.join(' ')}`.toLowerCase()
      let score = 0
      for (const t of tokens) {
        if (haystack.includes(t)) score += t.length
        if (a.keywords.some((k) => k.toLowerCase().includes(t))) score += 5
        if (a.question.toLowerCase().includes(t)) score += 3
      }
      return { article: a, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.article)
}
