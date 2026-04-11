# JurisPurama — Progress

## P1 — TERMINÉ ✅ (2026-04-11)
Scaffold, Auth, DB, Landing, Legal pages, Deploy. Voir historique git commit b4e69df.

## P2 — TERMINÉ ✅ (2026-04-11)
Chat JurisIA en streaming SSE avec dossiers, messages, actions rapides,
pages dossiers filtrables et détail timeline. Commit 684d0c3.

## P3 — TERMINÉ ✅ (2026-04-11)

### Livré
Profil juridique intelligent chiffré AES-256, scanner OCR Claude Vision
avec upload et analyse d'images/PDF, génération PDF juridique via 7
templates @react-pdf/renderer pré-remplis depuis le profil, intégration
complète au chat (bouton scanner + modal de génération de document).

### Fichiers créés (P3)

**src/lib/**
- `encryption.ts` — AES-256-GCM, clé dérivée scrypt depuis
  `SUPABASE_SERVICE_ROLE_KEY` + sel fixe. `encryptString()`,
  `decryptString()`, `maskSensitive()`, `isEncrypted()`. Format
  stocké : `v1:base64(iv||tag||ciphertext)`.
- `profile-schema.ts` — Zod schema avec validations FR strictes (IBAN,
  téléphone FR, code postal, n° sécu sociale), `PROFILE_SECTIONS` 6
  sections, helpers `countFilled`, `profileCompletion`, `totalFields`,
  `ENCRYPTED_FIELDS` list pour les champs sensibles.
- `pdf/types.ts` — types PdfProfile, PdfGeneratedContent, PdfTemplateProps,
  DOCUMENT_TEMPLATE_LABELS (7 templates), `templatesForCaseType()` qui
  suggère les templates pertinents par type de dossier.
- `pdf/base.tsx` — BaseLetter réutilisable : en-tête brand ⚖ JurisPurama
  avec ligne or, bloc expéditeur gauche / destinataire droit, lieu+date,
  objet, corps (I. Rappel des faits, II. Moyens de droit, extra sections
  optionnelles, Demandes), formule de politesse, espace signature, PJ,
  footnotes, footer fixe avec SASU PURAMA + art. 293B + valeur probante,
  numérotation "X/Y". Marges 2.5cm, Times-Roman 11pt, justification
  complète.
- `pdf/templates/*.tsx` — 7 templates: contestation-amende,
  mise-en-demeure (avec section "III. Délai de mise en demeure" 8j),
  requete-prudhommes, reclamation-client, courrier-generique,
  declaration-sinistre, recours-gracieux. Chacun un wrapper minimal
  autour de BaseLetter avec `documentHeading` en tête et
  `extraSections` quand pertinent.
- `pdf/generator.ts` — `generateDocumentPdf()` : appelle `askClaude()`
  avec un prompt strict JSON contenant profil/case/historique/template,
  parse le JSON (nettoie ``` fences), remplit defaults safety, passe à
  `renderToBuffer()`. Prompt précise les règles par template
  (délai 45j pour contestation, 2 mois pour recours, barème Macron
  pour prud'hommes, etc).

**src/app/api/**
- `profile/route.ts` — GET et PUT. `createServerSupabaseClient` pour RLS,
  charge `jurispurama_users.id`, decrypt les 4 champs sensibles à la
  lecture, encrypt à l'écriture, upsert via detect existing row. 422
  avec message FR si Zod échoue, 401/404/500 avec message FR.
- `ocr/route.ts` — POST multipart (10 Mo max, mimes restreints),
  upload Supabase Storage (`jurispurama-documents/{auth_user_id}/
  {caseId|scans}/{timestamp}-{safeName}`), appel Claude Sonnet 4
  avec `type:"image"` pour JPEG/PNG/WEBP/GIF ou `type:"document"` pour
  PDF, prompt OCR juridique strict JSON, insert `jurispurama_scans`,
  injection d'un message assistant résumant l'extraction dans le
  dossier si `caseId` fourni, merge des `deadlines` détectées dans
  `jurispurama_cases.deadlines`. GET retourne les 10 derniers scans
  avec signed URLs fraîches.
- `documents/generate/route.ts` — POST Zod strict {caseId, documentType
  (enum 7), title, instructions?}. Quota par plan (free=0,
  essentiel=5/mois, pro/avocat=∞, super_admin bypass). Charge case
  via RLS, décrypte le profil, charge 24 derniers messages pour
  contexte, appelle `generateDocumentPdf()`, upload dans storage
  (signed URL 30j), insert `jurispurama_documents` avec
  `generated_data` JSONB + `storage_path`, passe `status=document_pret`,
  injecte un message assistant "📄 Document généré" avec lien
  `/documents/[id]`. GET liste tous les documents de l'user (via join
  sur ses cases).
- `documents/[id]/route.ts` — GET retourne le document + le case
  parent avec une signed URL fraîche 24h. DELETE soft-delete
  (`deleted_at`) + suppression du fichier storage. Vérif ownership
  via join cases → users.

**src/app/(dashboard)/**
- `profil/page.tsx` — remplace stub. Header avec badge "Enregistré ✓" /
  "Enregistrement…" auto-save debounce 800ms, Card "progression
  circulaire SVG gradient justice→or + % + total filled/total".
  6 cards accordions (Identité, Contact & Adresse, Véhicule, Emploi,
  Logement, Bancaire & Officiel), chacune avec compteur X/Y + mini
  progress bar desktop + chevron rotatif. Form fields : text, email,
  tel, date, number, select (civility, contract_type, is_tenant),
  password (4 champs sensibles) avec toggle 👁/🙈 individuel.
  Auto-save onChange avec debounce + onBlur immédiat.
  `onChange` scheduleSave, `onBlur` flush instantané.
- `scanner/page.tsx` — zone drop (drag&drop+dragover visuel) + boutons
  "📁 Choisir" et "📸 Prendre une photo" (input `capture="environment"`
  mobile), preview image, champ context textarea optionnel, bouton
  "Analyser avec JurisIA". Pendant analyse : loader pulsant + 4 steps
  rotatifs (Lecture… / Identification… / Extraction… / Analyse…).
  Résultat : 2 cols (preview iframe PDF ou img) + (résumé, champs
  extraits dl, insights colorés info/warning/critical). CTA gold
  "📁 Créer un dossier à partir de ce document" → stash pending_message
  dans sessionStorage → `/chat/new`. Historique 10 derniers scans.
- `documents/page.tsx` — liste filtrable : search, filter type, filter
  signature_status (all/pending/signed), sort (recent/oldest/title).
  Cards avec badge type + badge signé/à signer + titre + dossier
  associé + date.
- `documents/[id]/page.tsx` — breadcrumb, titre, badges, boutons
  Télécharger / Retour au dossier. Grid 2 cols: iframe PDF 70vh à
  gauche + panneau droite (dossier associé, prochaines étapes 1-2-3,
  boutons gold Signer + secondary Envoyer toast-info P4, card
  "🔁 Régénérer avec modifications" collapsible avec textarea → repost
  `/api/documents/generate` avec les mêmes params + nouvelles
  instructions → redirect vers nouveau doc, bouton danger Supprimer).
- `chat/[caseId]/page.tsx` — WIRE `generate_document` action : ouvre
  `GenerateDocumentModal`, gère `handleGenerateDocument` (POST
  `/api/documents/generate` puis redirect). Nouveau `handleScanFile` :
  POST multipart `/api/ocr` avec `caseId`, puis refetch messages pour
  afficher la réponse assistant auto-injectée. ChatInput reçoit
  `onScan` et `scanning`. Modal rendu en fin de component.
- `dashboard/page.tsx` — 2 nouvelles cards P3 dans grid 2 cols :
  "Profil juridique XX% complété" avec mini bar gradient + lien
  `/profil`, "Documents générés N" avec lien `/documents`.

**src/components/**
- `chat/GenerateDocumentModal.tsx` — modal responsive (bottom sheet
  mobile, centered desktop) : select template avec ⭐ pour les
  recommandés par type de case, input titre, textarea instructions
  optionnelles, boutons Annuler + gold Générer. Ferme sur backdrop
  click ou ✕.
- `chat/ChatInput.tsx` — ajout props `onScan`, `scanning`. Nouveau
  bouton 📷 à gauche du bouton send, avec `capture="environment"`
  pour accès caméra mobile, spinner pendant upload.
- `layout/Sidebar.tsx` — ajout liens "Scanner 📷" et "Documents 📄".
- `layout/BottomTabBar.tsx` — remplace "Abo" par "Scanner" dans les
  5 tabs mobile.

**schema-p3.sql** — appliqué via SSH+psql :
- Bucket privé `jurispurama-documents` (20 Mo, JPEG/PNG/WEBP/GIF/PDF)
  avec policies storage.objects `SELECT/INSERT/DELETE` scopées
  `(storage.foldername(name))[1] = auth.uid()::text`.
- Table `jurispurama_scans` (user_id, case_id nullable, file_name,
  file_path, mime_type, detected_type, extracted_text, extracted_fields
  JSONB, insights JSONB, recommended_actions JSONB, created_at) + RLS.
- Colonnes ajoutées à `jurispurama_documents` : `storage_path TEXT`,
  `deleted_at TIMESTAMPTZ`, `generated_data JSONB`.
- Function `jurispurama.count_docs_this_month(p_user_id)` pour quota.

### Validations
- `npx tsc --noEmit` → exit 0
- `npm run build` → Compiled successfully, 33 routes (dont 11 dynamic),
  0 warning de code (juste 1 warning pré-existant middleware→proxy
  Next 16).
- `grep TODO|console.log|Lorem|any:` → 0 match
- `grep sk_live|sk-ant-api` → 0 leak
- Live smoke tests :
  - `GET https://jurispurama.purama.dev/` → 200
  - `GET /api/status` → `{"ok":true,...}`
  - `POST /api/ocr` sans auth → 401 ✓
  - `GET /api/profile` sans auth → 401 ✓
  - `POST /api/documents/generate` sans auth → 401 ✓
  - `GET /scanner`, `/profil`, `/documents` → 307 (middleware redirect
    to /login car non auth) ✓
- Alias `jurispurama.purama.dev` réassigné vers le nouveau deployment
  `jurispurama-gmd4ec9vc-puramapro-oss-projects.vercel.app`.

### Détails techniques importants

**Chiffrement AES-256-GCM**
Clé dérivée via `scrypt(SUPABASE_SERVICE_ROLE_KEY, 'jurispurama-legal-
profile:v1', 32)`. Si `ENCRYPTION_KEY` est défini dans l'env, il prend
le dessus (permet rotation future). Format stocké en DB :
`v1:base64(iv[12] || authTag[16] || ciphertext)`. Lecture : si la
valeur ne commence pas par `v1:`, elle est retournée telle quelle
(legacy / non chiffré) — ça permet d'ajouter des champs existants sans
casser.

**Claude Vision pour PDF**
Anthropic SDK accepte `type:"document"` dans un content block avec
`source: { type:"base64", media_type:"application/pdf", data }` —
Claude Sonnet 4 lit directement le PDF multi-pages sans conversion
côté serveur. Pour les images on utilise `type:"image"`. On cast le
tableau content en `as any` côté SDK call à cause d'un strict mapping
TypeScript entre ImageBlockParam/DocumentBlockParam (le SDK supporte
les deux runtime mais le typedef union est étroit dans v0.82).

**react-pdf/renderer en API route**
`renderToBuffer(element)` retourne un Node Buffer directement
utilisable par `supabase.storage.upload()`. Les templates sont des
composants React classiques avec StyleSheet.create. Fonts standards
Times-Roman/Times-Bold/Times-Italic livrées avec react-pdf (pas besoin
d'embedding).

**Quota documents**
Free = 0 (redirige vers upgrade Essentiel), Essentiel = 5/mois, Pro
& Avocat Virtuel = illimité, super_admin bypass total. Le comptage
se fait via join `jurispurama_documents` ← `jurispurama_cases` sur
`user_id`, filtré sur `created_at >= start_of_month` et
`deleted_at IS NULL`.

**OCR → chat auto-inject**
Quand `caseId` est fourni au POST `/api/ocr`, on injecte un message
assistant structuré avec le type détecté, résumé, champs extraits
(12 premiers), analyse insights colorée. Les deadlines détectées
sont mergées dans `cases.deadlines`. Côté client, le chat refetch
`/api/cases/[id]` après retour OCR pour afficher le message frais
sans race condition avec le stream SSE.

**Storage path scoping**
`{auth_user_id}/{caseId|scans}/{timestamp}-{filename}` — la policy
storage RLS vérifie que `foldername(name)[1] == auth.uid()::text`,
donc un user ne peut pas accéder aux fichiers d'un autre même en
devinant le path. Les uploads passent par `createServiceClient()`
pour bypasser RLS côté API (l'auth est déjà validée en amont).

### Prêt pour P4
- Signature DocuSeal : ajouter `/api/signature/request` qui crée un
  template DocuSeal depuis `documents.storage_path`, embed iframe dans
  `/documents/[id]` à la place du toast. `signature_status` passe à
  `signed` via webhook DocuSeal → MAJ `signed_pdf_url`.
- Envoi Resend : `/api/documents/[id]/send-email` qui fetch le PDF,
  l'attache via Resend API vers `sent_to`, update `sent_status=sent_email`.
- Envoi AR24 : `/api/documents/[id]/send-recommande` — AR24 API attend
  un SIRET + upload PDF, MAJ `tracking_number` et `ar_received_at` via
  webhook.
- Timeline visuelle : enrichir `/dossiers/[id]` avec frise chronologique
  documents + statuts + dates envoi/AR/signature.
- Alertes deadlines : activer le cron `/api/cron/deadline-alerts`
  (stub P1) pour envoyer un email Resend à J-7, J-3, J-1.

### Learnings P3
| 2026-04-11 | JURISPURAMA | renderToBuffer de @react-pdf/renderer fonctionne parfaitement en API route Node runtime Next 16, retourne un Buffer directement uploadable. Pas besoin de worker ni de fallback serverless. | PDF juridique 1 requête, 0 service externe. |
| 2026-04-11 | JURISPURAMA | Claude Sonnet 4 lit les PDF multi-pages nativement via `type:"document"` base64 — évite pdf-lib conversion. Le SDK v0.82 a un typedef union strict donc il faut cast `as any` pour le content array. | OCR PDF sans preprocessing. |
| 2026-04-11 | JURISPURAMA | Auto-save debounce 800ms sur onChange + flush immédiat sur onBlur = UX fluide sans spammer l'API. Indicateur live "Enregistrement…/✓ Enregistré" dans le header. | Auto-save non-intrusif. |
| 2026-04-11 | JURISPURAMA | AES-256-GCM dérivé via scrypt(SERVICE_ROLE_KEY) + format `v1:base64` versionné permet rotation future sans casser les valeurs existantes. Fallback plain-text si pas de prefix. | Chiffrement sans config supplémentaire. |
| 2026-04-11 | JURISPURAMA | Storage bucket privé + policy `(foldername(name))[1] = auth.uid()::text` = scoping natif utilisateur sans join DB. Signed URLs courtes pour preview, longues 30j pour docs finaux. | Fichiers privés sans tracking custom. |
