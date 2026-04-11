# JURISPURAMA-BRIEF.md — BRIEF ULTIME CLAUDE CODE
# App: jurispurama.purama.dev | Slug: jurispurama
# Mission: L'assistant juridique IA le plus puissant de France — remplace un avocat à 99%

---

## 1. IDENTITÉ

- **Nom**: JurisPurama
- **Domaine**: jurispurama.purama.dev
- **IA Name**: JurisIA (ne JAMAIS dire "Claude" — toujours "JurisIA")
- **Pitch**: "Raconte ton problème. En 3 minutes, tu as un plan d'action + dossier complet. Un avocat valide et lance la procédure à ta place."
- **Admin**: matiss.frasne@gmail.com
- **Stack**: Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (auth.purama.dev), Stripe, API Anthropic Claude (claude-sonnet-4-20250514), Vercel, DocuSeal (signature), AR24 (recommandé)

---

## 2. SUPABASE — TABLES (projet partagé: ylkkmvihffblfhsvabqa sur auth.purama.dev)

```sql
-- Préfixer toutes les tables: jurispurama_

CREATE TABLE jurispurama_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address JSONB, -- {street, city, zip, country}
  birth_date DATE,
  subscription_plan TEXT DEFAULT 'free', -- free|essentiel|pro|avocat_virtuel
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jurispurama_legal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES jurispurama_users NOT NULL,
  civility TEXT, first_name TEXT, last_name TEXT,
  birth_date DATE, birth_city TEXT, nationality TEXT,
  phone TEXT, email TEXT,
  address_street TEXT, address_zip TEXT, address_city TEXT, address_country TEXT DEFAULT 'FR',
  -- Véhicule (amendes)
  license_plate TEXT, vehicle_brand TEXT, vehicle_model TEXT, driver_license_number TEXT,
  -- Emploi (droit travail)
  employer_name TEXT, employer_address TEXT, job_title TEXT, hire_date DATE,
  salary_gross DECIMAL, salary_net DECIMAL, contract_type TEXT,
  -- Logement (immobilier)
  is_tenant BOOLEAN, landlord_name TEXT, landlord_address TEXT,
  rent_amount DECIMAL, lease_start_date DATE,
  -- Officiel
  social_security_number TEXT, tax_number TEXT, iban TEXT, bank_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jurispurama_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES jurispurama_users NOT NULL,
  type TEXT NOT NULL, -- amende|travail|logement|consommation|famille|administratif|fiscal|penal|sante|assurance|numerique|affaires
  sub_type TEXT,
  status TEXT DEFAULT 'diagnostic', -- diagnostic|analyse|document_pret|signe|envoye|en_attente|resolu
  summary TEXT,
  strategy JSONB, -- {recommended, alternatives[], legal_basis[], probability}
  success_probability INTEGER, -- 0-100
  deadlines JSONB, -- [{date, description, critical, notified}]
  money_saved DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jurispurama_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES jurispurama_cases NOT NULL,
  role TEXT NOT NULL, -- user|assistant|system
  content TEXT NOT NULL,
  attachments JSONB, -- [{url, type, name, ocr_text}]
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jurispurama_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES jurispurama_cases NOT NULL,
  type TEXT NOT NULL, -- contestation|mise_en_demeure|requete|reclamation|cerfa|declaration|plainte|assignation|refere|courrier
  title TEXT NOT NULL,
  content TEXT, -- contenu brut markdown/html
  pdf_url TEXT,
  signed_pdf_url TEXT,
  signature_status TEXT DEFAULT 'pending', -- pending|signed|expired
  signature_request_id TEXT, -- DocuSeal ID
  sent_status TEXT DEFAULT 'not_sent', -- not_sent|sent_email|sent_recommande|sent_teleservice
  sent_at TIMESTAMPTZ,
  sent_to TEXT,
  tracking_number TEXT,
  ar_received_at TIMESTAMPTZ,
  cost DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jurispurama_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES jurispurama_users NOT NULL,
  stripe_payment_id TEXT,
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL, -- subscription|recommande|signature|dossier
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jurispurama_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES jurispurama_users NOT NULL,
  referred_id UUID REFERENCES jurispurama_users,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending|converted|expired
  commission_paid DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: chaque user voit SEULEMENT ses données. Admin (matiss.frasne@gmail.com) voit TOUT.
```

---

## 3. PRICING STRIPE

| Plan | Mensuel | Annuel (-30%) | Inclus |
|------|---------|---------------|--------|
| **Gratuit** | 0€ | — | 3 consultations/mois, pas de documents |
| **Essentiel** | 9,99€ | 83,90€ | Illimité consultations, 5 docs/mois, signature |
| **Pro** | 19,99€ | 167,90€ | Tout illimité, 3 recommandés/mois inclus |
| **Avocat Virtuel** | 39,99€ | 335,90€ | Tout illimité, recommandés illimités, alertes deadlines, suivi avancé |

- Premier mois -10% pour nouveaux abonnés
- Essai gratuit 14 jours sur tous les plans payants
- Recommandé AR hors forfait: 5,99€/envoi
- Signature supplémentaire hors forfait: 1,99€

**Parrainage**: Parrain = 50% premier paiement + 10% récurrent à vie. Filleul = -50% premier mois + places jeux concours.

**Influenceurs**: Lien personnalisé 7 jours avec -50% promo. Commission = 50% premier paiement + 10% récurrent tant que l'abonné reste. Espace influenceur dédié avec stats.

---

## 4. FONCTIONNALITÉS CORE

### 4.1 Chat IA Juridique (CŒUR)
- Streaming SSE avec API Claude claude-sonnet-4-20250514
- System prompt JurisIA injecté (voir section 7)
- Upload documents + OCR via Claude Vision
- Historique par dossier (jurispurama_messages)
- Boutons action rapide sous chaque message: "📄 Générer document", "✍️ Signer", "📨 Envoyer", "📋 Mon dossier"
- Phase diagnostic → analyse → exécution automatique
- JAMAIS dire "consultez un avocat" sauf obligation légale (cour d'assises)
- Cite TOUJOURS articles de loi exacts

### 4.2 Génération Documents PDF
- Templates dynamiques par type (contestation, mise en demeure, requête, CERFA, etc.)
- En-tête JurisPurama, mise en page juridique, numérotation, police serif
- Pré-remplissage complet depuis jurispurama_legal_profiles
- Références légales en notes de bas de page
- Espace signature positionné
- Stocker dans Supabase Storage → jurispurama_documents.pdf_url
- Lib: @react-pdf/renderer ou jsPDF

### 4.3 Signature Électronique (DocuSeal)
- API DocuSeal self-hosted ou cloud
- Flux: PDF généré → upload DocuSeal → iframe signature dans l'app → doc signé récupéré → stocké
- Valeur légale eIDAS
- Statut temps réel dans jurispurama_documents.signature_status

### 4.4 Envoi Automatique
- **Email**: Resend API (mail.purama.dev) — documents en PJ, templates pro
- **Recommandé AR**: AR24 API — compte pro avec SIRET Purama. PDF → AR24 → envoi recommandé électronique avec AR. Preuve + AR stockés dans app
- **Téléprocédures**: liens directs ANTAI, impots.gouv.fr, telerecours.fr avec données pré-remplies

### 4.5 Suivi de Dossier
- Timeline visuelle par dossier (statuts colorés)
- 🟡 Diagnostic | 🔵 Document prêt | 🟢 Signé & envoyé | 🟣 En attente | ✅ Résolu
- Alertes deadlines: push J-7, J-3, J-1
- Notifications AR reçu, document signé
- Compteur "argent économisé" par dossier et total

### 4.6 Profil Juridique Intelligent
- Remplissage progressif (JurisIA demande au fil des dossiers)
- Champs remplis ✅ vs manquants ⬜
- Ne JAMAIS redemander une info déjà fournie
- Sections: Identité, Contact, Véhicule, Emploi, Logement, Banque, Officiel
- Chiffrement données sensibles

### 4.7 Scanner OCR Juridique
- Upload photo/scan → Claude Vision OCR
- Détection auto type document (PV, contrat, facture, courrier admin)
- Extraction infos clés (dates, montants, parties, références)
- Détection erreurs/failles exploitables légalement
- Résultat affiché avec actions recommandées

### 4.8 Compteur Argent Sauvé
- Calcul automatique par dossier: amendes annulées, aides obtenues, frais évités
- Compteur personnel + compteur global communauté
- Affiché dashboard + partageable stories

---

## 5. DOMAINES JURIDIQUES (IA doit maîtriser TOUS)

1. **Amendes & Infractions routières**: vice de forme (Art.429 CPP), non-désignation conducteur (Art.L121-3), marge erreur radar, contestation ANTAI 45j, FPS→CCSP 30j, consignation (Art.529-10 CPP)
2. **Droit du travail**: licenciement abusif, harcèlement, heures sup, prud'hommes, barème Macron, rupture conventionnelle
3. **Logement**: dépôt garantie (1-2 mois+10%/mois pénalité), charges abusives, décence (Art.6 loi 6/7/1989), trouble voisinage
4. **Consommation**: rétractation 14j (Art.L221-18), garantie 2 ans, vice caché (Art.1641 CC), pratiques trompeuses
5. **Famille**: divorce, garde, pension alimentaire, succession, PACS, violences conjugales
6. **Administratif**: recours gracieux/hiérarchique/contentieux, référé-suspension, CADA, RSA/AAH contestation
7. **Fiscal**: réclamation contentieuse, contrôle fiscal, remise gracieuse, taxe foncière contestation
8. **Pénal**: garde à vue droits, plainte, partie civile, ordonnance pénale opposition, casier effacement
9. **Santé**: erreur médicale ONIAM/CCI, CPAM contestation, invalidité, accident travail
10. **Assurances**: sinistre auto contestation expertise, résiliation abusive, franchise abusive
11. **Numérique**: RGPD (plainte CNIL), droit oubli, e-commerce litige
12. **Affaires**: factures impayées injonction, contrats commerciaux, INPI marques, micro-entreprise URSSAF

---

## 6. PAGES & NAVIGATION

```
/ → Landing page (pitch + pricing + CTA)
/login → Auth Supabase (Google OAuth + email)
/dashboard → Vue d'ensemble (dossiers actifs, compteur argent sauvé, alertes)
/chat → Chat JurisIA (nouveau dossier ou continuer existant)
/chat/[caseId] → Chat dossier spécifique
/dossiers → Liste tous dossiers avec filtres statut
/dossiers/[id] → Détail dossier (timeline, documents, messages)
/documents/[id] → Aperçu PDF + signer + envoyer
/profil → Profil juridique intelligent
/scanner → Upload + OCR + analyse
/abonnement → Plans Stripe + gestion abo
/parrainage → Code parrain + stats + gains
/admin → (matiss.frasne@gmail.com SEULEMENT) Stats globales, users, revenus, dossiers, influenceurs
/admin/influenceurs → Gestion liens influenceurs, commissions, paiements
```

---

## 7. SYSTEM PROMPT JURIS IA (injecter dans chaque appel API Claude)

```
Tu es JurisIA, l'intelligence artificielle juridique de JurisPurama by Purama. Tu es l'experte juridique française la plus complète. Tu maîtrises PARFAITEMENT l'intégralité du droit français.

RÈGLES ABSOLUES:
1. Tu es TOUJOURS du côté du client. Tu cherches TOUJOURS la meilleure stratégie pour qu'il gagne.
2. Chaque réponse est ultra-personnalisée à la situation exacte du client.
3. Tu cites TOUJOURS les articles de loi exacts (ex: "Art. L1234-5 du Code du travail").
4. Tu connais TOUTES les astuces légales, failles procédurales, techniques de contestation.
5. Tu ne dis JAMAIS "consultez un avocat" sauf obligation légale (cour d'assises, cour d'appel civil).
6. Tu proposes TOUJOURS un plan d'action concret avec étapes numérotées.
7. Tu estimes TOUJOURS la probabilité de succès honnêtement en %.
8. Tu identifies TOUJOURS les délais critiques.
9. Tu ne dis JAMAIS que tu es Claude ou une IA d'Anthropic. Tu es JurisIA de JurisPurama.

PROCESSUS:
1. DIAGNOSTIC: Pose 3-5 questions précises par message. Explique pourquoi tu poses chaque question.
2. ANALYSE: Base légale + stratégie recommandée + alternatives + probabilité succès + plan d'action + délais + coûts.
3. ACTION: Propose génération automatique de TOUS documents nécessaires.
4. DOCUMENTS: Génère documents complets pré-remplis prêts à signer.
5. SIGNATURE: Propose signature électronique dans l'app.
6. ENVOI: Propose envoi automatique (email/recommandé AR/téléprocédure).
7. SUIVI: Rappelle prochaines étapes et délais.

DISCLAIMER (1 seule fois par nouveau dossier):
"JurisIA est un assistant juridique IA. Ses analyses sont basées sur le droit français en vigueur. Pour les affaires nécessitant une représentation obligatoire (cour d'assises, cour d'appel civile), un avocat inscrit au barreau reste nécessaire."

FORMAT: Titres clairs, infos critiques en gras, délais urgents signalés, termine par "Que souhaitez-vous faire?" avec options.
```

---

## 8. APIS & ENV VARS

```env
# Supabase (auth.purama.dev — self-hosted)
NEXT_PUBLIC_SUPABASE_URL=https://auth.purama.dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # depuis CLAUDE.md
SUPABASE_SERVICE_ROLE_KEY=       # depuis CLAUDE.md

# Anthropic
ANTHROPIC_API_KEY=               # depuis CLAUDE.md

# Stripe
STRIPE_SECRET_KEY=               # depuis CLAUDE.md
STRIPE_PUBLISHABLE_KEY=          # depuis CLAUDE.md
STRIPE_WEBHOOK_SECRET=           # généré au déploiement

# Resend (email)
RESEND_API_KEY=                  # depuis CLAUDE.md

# AR24 (recommandé électronique)
AR24_API_KEY=                    # à obtenir après passage compte pro
AR24_API_URL=https://app.ar24.fr/api

# DocuSeal (signature électronique)
DOCUSEAL_API_KEY=                # depuis CLAUDE.md ou setup
DOCUSEAL_API_URL=                # self-hosted ou cloud

# App
NEXT_PUBLIC_APP_URL=https://jurispurama.purama.dev
ADMIN_EMAIL=matiss.frasne@gmail.com
```

---

## 9. DESIGN (suivre CLAUDE-2.md sections 9/9bis/9ter)

- **Couleur primaire**: Bleu justice #1E3A5F + Or confiance #C9A84C
- **Style**: Professionnel, épuré, rassurant. Inspire confiance absolue.
- **Icône IA**: ⚖️ dans le chat
- **Mobile-first**: 80%+ utilisateurs mobile
- **Animations**: subtiles, fluides, jamais agressives
- **Accessibilité**: taille texte adaptable, contrastes WCAG AA, mode handicap (lecteur écran, navigation clavier)
- **Multilingue**: i18n avec toutes langues via next-intl (FR par défaut)
- **Dark mode**: supporté

---

## 10. SÉCURITÉ & CONFORMITÉ

- RLS Supabase sur TOUTES les tables
- Chiffrement données sensibles (SSN, IBAN, tax_number) côté serveur
- RGPD: droit accès, suppression, portabilité, consentement explicite
- Pas de stockage données bancaires (Stripe gère)
- Logs accès par dossier
- Suppression auto dossiers après 5 ans (prescription)
- CGU/CGV/Politique confidentialité pages obligatoires
- Rate limiting API Claude (anti-abus)

---

## 11. DÉPLOIEMENT VERCEL

```
vercel.json:
{
  "framework": "nextjs",
  "regions": ["cdg1"],
  "crons": [
    { "path": "/api/cron/deadline-alerts", "schedule": "0 8 * * *" },
    { "path": "/api/cron/check-ar-status", "schedule": "0 */6 * * *" }
  ]
}
```

Domain: jurispurama.purama.dev → Vercel
Team: team_dGuJ4PqnSU1uaAHa26kkmKKk

---

## 12. PRIORITÉ D'IMPLÉMENTATION (Claude Code doit suivre cet ordre)

1. **Auth Supabase + tables + RLS + profil utilisateur**
2. **Chat IA juridique** (streaming SSE, system prompt, historique par dossier) — LE CŒUR
3. **Génération documents PDF** (templates dynamiques, pré-remplissage)
4. **Scanner OCR** (upload + Claude Vision + analyse)
5. **Signature électronique** (DocuSeal intégration)
6. **Envoi automatique** (Resend email + AR24 recommandé)
7. **Suivi dossier + timeline + alertes deadlines** (crons Vercel)
8. **Compteur argent sauvé** (calcul auto par dossier)
9. **Stripe** (abonnements + paiements unitaires + webhooks)
10. **Parrainage + Influenceurs** (codes, commissions, espace dédié)
11. **Admin dashboard** (stats, users, revenus, influenceurs)
12. **Landing page + pricing + SEO**
13. **PWA + responsive parfait**
14. **i18n multilingue**

---

## 13. TESTS PLAYWRIGHT OBLIGATOIRES

Minimum 100 tests couvrant:
- Auth (inscription, login, logout, Google OAuth)
- Chat IA (envoi message, réception streaming, nouveau dossier)
- Upload document + OCR
- Génération PDF
- Suivi dossier (création, statuts, timeline)
- Profil juridique (remplissage, sauvegarde)
- Stripe (checkout, webhook, gestion abo)
- Parrainage (création code, application)
- Admin (accès restreint, stats)
- Scanner (upload, résultat)
- Responsive (mobile, tablet, desktop)
- Accessibilité (navigation clavier, lecteur écran)

---

## 14. RÈGLES CLAUDE CODE SPÉCIFIQUES

- JAMAIS de placeholder, TODO, ou mock data en production
- TOUTES les APIs connectées et fonctionnelles
- Streaming SSE obligatoire pour le chat (pas de polling)
- Error boundaries sur chaque page
- Loading states sur chaque action async
- Toast notifications pour succès/erreur
- Le chat doit supporter le markdown dans les réponses IA
- Les PDF générés doivent être professionnels (en-tête, numérotation, police serif)
- Mobile-first: tester chaque écran en 375px minimum
- JAMAIS dire "c'est fini" si ce n'est pas 100% testé et fonctionnel
