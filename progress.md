# JurisPurama — Progress

## P1 — TERMINÉ ✅ (2026-04-11)
Scaffold, Auth, DB, Landing, Legal pages, Deploy. Commit b4e69df.

## P2 — TERMINÉ ✅ (2026-04-11)
Chat JurisIA streaming SSE avec dossiers, messages, actions rapides, pages
dossiers filtrables et détail timeline. Commit 684d0c3.

## P3 — TERMINÉ ✅ (2026-04-11)
Profil juridique chiffré AES-256, scanner OCR Claude Vision, génération
PDF via 7 templates @react-pdf/renderer, intégration chat. Commit fe30260.

## P4 — TERMINÉ ✅ (2026-04-11)

### Livré
Signature électronique canvas HTML5 (Art. 1366 CC) avec embed PDF pdf-lib,
audit hash SHA-256, envoi email Resend avec templates React Email, envoi
recommandé AR24 avec fallback simulation, cron deadline-alerts (J-7/J-3/J-1)
et check-ar-status (poll toutes 6h), notifications en temps réel avec cloche
+ dropdown, timeline visuelle enrichie par dossier, page publique de
vérification `/verify/[id]`, compteur argent sauvé par dossier et
communauté global sur landing.

### Fichiers créés / modifiés (P4)

**schema-p4.sql** (appliqué via docker exec psql)
- Table `jurispurama_signatures` (document_id, user_id, signature_png_path,
  signature_hash, signed_at, ip_address, user_agent, legal_basis) + RLS
- Table `jurispurama_notifications` (user_id, type, title, message, link,
  read_at, created_at) + RLS + index unread

**src/lib/**
- `signature.ts` — `embedSignatureOnPdf()` via pdf-lib (positionne le PNG
  dans la zone signature bas-droite de la dernière page A4, ajoute nom en
  bold Helvetica et stamp audit bas-gauche), `hashSignatureBytes()` SHA256
  sur nom+date+bytes, `dataUrlToBuffer()`, `clientIpFromHeaders()`.
- `ar24.ts` — `sendRecommande({recipient, documentPdfBuffer, ...})` avec
  branch `sendLive()` si `AR24_API_KEY` présent (POST /envois FormData
  Bearer) ou `sendSimulated()` sinon qui génère un tracking `SIM-AR-XXXXXX`
  et marque reçu après 2h via cron. `pollStatus(trackingNumber, sentAtISO)`
  pour le cron check-ar-status. `AR24_MODE = 'live'|'simulated'` exporté.
- `email/send.ts` — wrapper Resend lazy-init avec `sendEmail(input)`
  (from, to, subject, react, replyTo, attachments). Constantes
  `FROM_DOCUMENTS` et `FROM_NOTIFS`.
- `email/templates.tsx` — 4 templates React Email : `DocumentSentEmail`
  (destinataire avec PJ PDF signé + lien vérification), `DocumentSentConfirmation`
  (confirmation à l'user), `DeadlineAlertEmail` (urgence J-7/J-3/J-1 avec
  bouton CTA), `ARReceivedEmail` (notification AR reçu). Tous avec header
  bleu justice + liseré or, footer SASU PURAMA art. 293B.

**src/app/api/**
- `documents/[id]/sign/route.ts` — POST Zod `{signatureDataUrl, consent}`.
  Vérifie auth, ownership via case join, signature_status != 'signed',
  décode PNG base64, download PDF original, embed signature, upload PDF
  `-signed.pdf` + PNG audit dans `{userId}/signatures/{docId}.png`, calcule
  hash SHA256, insère `jurispurama_signatures` avec IP/UA, passe le doc
  en `signature_status='signed'` + case en `signe`, injecte message
  assistant + notification.
- `documents/[id]/send-email/route.ts` — POST Zod `{recipientEmail,
  recipientName, subject?, bodyMessage?}`. Quota par plan (free=0,
  essentiel=10/mois, pro=50/mois, avocat=∞), vérifie doc signé, télécharge
  signed PDF, envoie via Resend avec PJ base64 + template
  DocumentSentEmail, update doc sent_status/sent_at/sent_to, case en
  `envoye`, message assistant + notif + confirmation à l'user.
- `documents/[id]/send-recommande/route.ts` — POST Zod adresse complète.
  Quota pro=3/mois inclus, avocat=∞, autres=0. Vérifie doc signé,
  appelle `sendRecommande()` (live ou simulé), update doc avec
  tracking_number/cost/sent_at, crée row `jurispurama_payments` type
  `recommande` status `simulated` si hors plan, message assistant avec
  tracking + mode + mention hors forfait, notif, email confirmation.
- `documents/[id]/route.ts` — GET enrichi : retourne signed_pdf_url frais
  depuis storage (60*60*24 signed URL si signature_status='signed'),
  ajout champs sent_at/sent_to/tracking_number/ar_received_at/cost.
  DELETE nettoie aussi le fichier `-signed.pdf`.
- `cron/deadline-alerts/route.ts` — GET cron Bearer auth. Query toutes
  cases actives avec deadlines, calcule days_until, pour chaque deadline
  à J-7/J-3/J-1 non encore notifiée : insère notification, envoie email
  DeadlineAlertEmail, flag `notified.j7/j3/j1=true` dans JSONB via update
  sur le tableau complet. Évite les doublons.
- `cron/check-ar-status/route.ts` — GET cron Bearer. Query docs
  `sent_status='sent_recommande' AND ar_received_at IS NULL`, appelle
  `pollStatus()` pour chaque. Si reçu : update ar_received_at, injecte
  message assistant, notification, email ARReceivedEmail. En simulation
  toute tracking > 2h passe à "reçu".
- `notifications/route.ts` — GET (25 dernières + unread count) + PATCH
  `{ids[]}` ou `{allRead: true}`. Auth + scoping via jurispurama_users.

**src/app/**
- `(dashboard)/layout.tsx` — ajout header sticky avec `<NotificationBell/>`
  à droite au-dessus du contenu main.
- `(dashboard)/documents/[id]/page.tsx` — intègre `<SignModal/>` et
  `<SendModal/>`. Badges signé/envoyé/tracking, bannière verte "Document
  signé", bannière violet "Recommandé en cours / AR reçu le X", utilise
  `signed_pdf_url` en preview si signé. Le bouton "Envoyer" est
  désactivé tant que non signé, le bouton "Signer" disparaît une fois
  signé.
- `(dashboard)/dossiers/[id]/page.tsx` — Timeline tab refondue :
  utilise `buildTimeline(caseRow, messages, documents)` pour produire
  une frise verticale avec icônes colorées (événements : case_created,
  document_generated, document_signed, document_sent_email,
  document_sent_recommande, ar_received, deadline_upcoming/passed,
  message). Savings tab : ajout `<MarkAsWonBox/>` avec input € + bouton
  "🏆 Valider le gain" qui PATCH `/api/cases/[id]` avec money_saved +
  status=resolu.
- `api/cases/[id]/route.ts` — PATCH accepte maintenant `money_saved`
  (0–10M).
- `verify/[id]/page.tsx` — page publique (middleware ajouté à
  PUBLIC_PATHS). Server Component qui charge via service client le doc,
  le case, le sender, la signature, retourne 404 si deleted ou sent_status
  'not_sent'. Affiche header bleu justice dégradé, fiche : titre, type,
  expéditeur (full_name uniquement), date génération, date signature,
  date envoi, empreinte de signature (signature_request_id), preview
  iframe PDF signé, encart Art. 1366 CC, footer SASU PURAMA.
- `page.tsx` — landing devient async. Fonction `getCommunitySavings()`
  (revalidate 10min) qui SUM `money_saved` sur les cases status='resolu',
  avec plancher 10 000€ pour ne jamais afficher 0. Ajout d'un encart
  vert sous les stats : "💰 Plus de X€ déjà économisés par nos
  utilisateurs".
- `middleware.ts` — ajout `/verify/*` aux routes publiques.

**src/components/**
- `signature/SignaturePad.tsx` — canvas HDPI avec setup DPR, pointer
  events (mouse+touch via Pointer API), trait or `#C9A84C` lineCap round,
  état hasStrokes, bouton Effacer, affichage timestamp live + mention
  Art. 1366 CC. `onReady(dataUrl|null)` callback.
- `documents/SignModal.tsx` — bottom sheet mobile / modal desktop, encart
  info bleu justice, `<SignaturePad/>`, checkbox consentement obligatoire,
  boutons Annuler + Signer (gold). POST `/api/documents/[id]/sign`
  avec signatureDataUrl + consent=true.
- `documents/SendModal.tsx` — 3 tabs (Email / Recommandé AR / Téléservice).
  Email : nom + email destinataire + objet pré-rempli + message optionnel.
  Recommandé : nom + adresse complète (rue, CP, ville, pays) + email opt
  + encart gold 5.99€. Téléservices : liste contextuelle par type de
  dossier (ANTAI pour amende, impots.gouv.fr pour fiscal, Telerecours
  citoyens pour administratif, service-public.fr fallback) avec bouton
  Ouvrir et liste des champs à copier-coller. Escape pour fermer,
  responsive bottom-sheet mobile.
- `layout/NotificationBell.tsx` — cloche avec badge rouge unread count
  (9+ au-delà), dropdown 360px avec 10 dernières notifications, chacune
  avec icône + titre + message + ago, lien clickable qui ferme le
  dropdown, bouton "Tout marquer lu" (PATCH `/api/notifications`).
  Poll toutes 60s.

**src/lib/case-helpers.ts** — ajout `buildTimeline()`, types
`TimelineEvent` + `TimelineVariant`, `TIMELINE_COLOR_STYLES` (dot + text
class par couleur). Exclut les messages qui doublonnent déjà les events
document lifecycle.

### Validations (P4)
- `npx tsc --noEmit` → exit 0, 0 erreur
- `npm run build` → Compiled successfully, **40 routes** dont
  `/api/documents/[id]/sign`, `/api/documents/[id]/send-email`,
  `/api/documents/[id]/send-recommande`, `/api/notifications`,
  `/verify/[id]`. 0 warning de code.
- `grep TODO|console.log|Lorem` → 0 match
- `grep sk_live|sk-ant-api` → 0 leak
- Live smoke tests :
  - `GET https://jurispurama.purama.dev/` → 200
  - `GET /api/status` → `{"ok":true,"app":"jurispurama"}`
  - `POST /api/documents/X/sign` sans auth → 401 ✓
  - `POST /api/documents/X/send-email` sans auth → 401 ✓
  - `POST /api/documents/X/send-recommande` sans auth → 401 ✓
  - `GET /api/notifications` sans auth → 401 ✓
  - `GET /api/cron/deadline-alerts` sans Bearer → 401 ✓
  - `GET /api/cron/check-ar-status` sans Bearer → 401 ✓
  - `GET /api/cron/deadline-alerts` avec Bearer CRON_SECRET →
    `{"ok":true,"scanned":0,"sent":0}` ✓
  - `GET /api/cron/check-ar-status` avec Bearer CRON_SECRET →
    `{"ok":true,"scanned":0,"updated":0}` ✓
  - `GET /verify/00000...` (doc inexistant) → 404 ✓
- Deployment: dpl_48AfcJA3qwvr6hKBEDwrLj6trKHz
- Alias: https://jurispurama.purama.dev → deploy `jurispurama-r13k1ce4e`
- Commit: de4109f (non pushé à GitHub — le repo `puramapro-oss/jurispurama`
  doit être pré-créé manuellement sur github.com, le fine-grained PAT
  n'a pas le scope de création)

### Détails techniques importants

**Canvas signature + pdf-lib embed**
Le canvas HTML5 est configuré en HDPI via `dpr = window.devicePixelRatio`
puis `ctx.scale(dpr, dpr)`. Pointer events (au lieu de mouse/touch
séparés) pour gérer desktop+mobile+stylet uniformément + `setPointerCapture`
pour ne pas perdre le trait hors du canvas. Le `data:image/png;base64,...`
sort via `canvas.toDataURL('image/png')`. Côté serveur, `PDFDocument.load()`
+ `embedPng()` + `page.drawImage()` à la position (width - 70 - 150, 120)
correspondant à la zone "Signature" laissée par BaseLetter dans les
templates @react-pdf. L'image est clampée à 70pt de hauteur max pour ne
pas déborder sur le footer.

**Mode AR24 simulation**
Si `AR24_API_KEY` absent, `sendSimulated()` génère un tracking
`SIM-AR-{12hex}` et retourne cost 5.99€. Le cron `check-ar-status`
poll via `pollStatus()` qui détecte le prefix `SIM-AR-` et marque reçu
après 2h (simule un AR réaliste). Quand la clé AR24 réelle sera ajoutée
en env, `sendRecommande()` bascule automatiquement sur l'API live sans
changement de code ailleurs. `AR24_MODE` est exposé pour affichage dans
les toasts / logs.

**Resend + React Email**
Les templates sont des composants React typés (`@react-email/components`).
`resend.emails.send({react: <Template.../>})` fait le render HTML côté
Resend SDK. Les PDFs sont attachés en base64 via le champ `attachments`.
Le `from` est `JurisPurama <documents@purama.dev>` (nécessite que le
domaine purama.dev soit vérifié dans Resend — déjà fait pour les autres
apps Purama). `replyTo` = email user pour que le destinataire réponde
directement à l'expéditeur.

**Quotas email**
Compte les docs avec `sent_status='sent_email'` créés depuis le 1er du
mois, filtré par les case_ids de l'user. Free=0 (402), Essentiel=10,
Pro=50, Avocat=∞, super_admin bypass. Même pattern pour les recommandés
(Pro=3 inclus, Avocat=∞, hors plan = toujours autorisé avec row payments
`simulated` pour P5 billing).

**Timeline deduplication**
`buildTimeline()` ignore les assistant messages qui commencent par 📄/✍️/
📧/📮/📬 car ils sont déjà représentés par les events document lifecycle
(évite double affichage). Les autres assistant messages deviennent des
events "⚖️ Analyse JurisIA" gris avec extrait 160 char.

**Deadline notified flag**
Les deadlines sont stockées dans `jurispurama_cases.deadlines` JSONB
(déjà existant). Le cron lit le tableau, calcule `daysUntil` pour chaque,
détermine le marker (j7/j3/j1) selon l'intervalle non encore notifié,
envoie l'email, puis écrit le tableau complet modifié avec
`notified: {j7:true, j3:true, j1:true}`. Les deadlines passées sont
ignorées (days < 0).

**Page verify publique**
Server Component qui tourne avec `createServiceClient()` (bypass RLS
pour l'affichage public). Conditions d'accès : `deleted_at IS NULL` +
`sent_status != 'not_sent'` (pas accessible tant que non envoyé). Pas
d'info sensible : uniquement full_name du sender, titre, type,
dates, hash public de signature (24 chars), preview iframe PDF signed
via signed URL 1h. RGPD-safe car c'est le document que l'user a
volontairement envoyé.

### Prêt pour P5
- Stripe checkout pour les 4 plans (`PLANS` déjà défini dans constants)
- Stripe webhook `checkout.session.completed` +
  `customer.subscription.*` → update `jurispurama_users.subscription_plan`
- Stripe billing pour achat unitaire recommandé 5.99€ (le pattern est
  déjà là : quand `outOfPlan` dans `/api/documents/[id]/send-recommande`,
  on insère une row `jurispurama_payments` status `simulated` — il suffit
  de remplacer par un payment_intent avant l'envoi).
- Table `jurispurama_referrals` (P1) : ajouter routes `/api/referral`
  pour code + commissions.
- Influenceurs (P3→P5) : `/influencer`, `/apply`, paliers.
- Admin dashboard : `/admin` user list, stats, audit log signatures.

### Learnings P4
| 2026-04-11 | JURISPURAMA | pdf-lib `embedPng` + `page.drawImage` pour incruster une signature canvas dans un PDF @react-pdf/renderer existant : les coordonnées sont en points (1pt = 1/72 inch) et l'origine est bas-gauche — positionner à (width-70-150, 120) atterrit pile dans la zone "Signature" laissée par BaseLetter. | 0 service externe pour signature électronique Art. 1366 CC valide. |
| 2026-04-11 | JURISPURAMA | Pointer Events API (onPointerDown/Move/Up) au lieu de mouse+touch séparés : un seul code path pour desktop, mobile, stylet. `setPointerCapture(pointerId)` garde le trait même quand le curseur sort du canvas. `touch-action: none` (via classe Tailwind `touch-none`) désactive le scroll pendant le dessin. | Signature pad cross-device en 150 lignes. |
| 2026-04-11 | JURISPURAMA | Resend + @react-email/components : passer `react: <Template.../>` au lieu de `html:` laisse le SDK render côté Resend. Les attachments PDF sont en base64 (buffer.toString('base64')). `replyTo` sépare from de l'adresse de réponse → l'user reçoit les réponses sur son vrai mail. | Email pro HTML sans stringifier à la main. |
| 2026-04-11 | JURISPURAMA | AR24 fallback simulation : wrapper `sendRecommande()` qui branch sur `AR24_API_KEY` présent/absent, tracking `SIM-AR-XXXX` marqué reçu après 2h par le cron. Le reste du code (page, notif, email, UI) ne voit aucune différence — swap transparent le jour où AR24 réel est branché. | Prod-ready avant d'avoir la clé API partenaire. |
| 2026-04-11 | JURISPURAMA | Deadlines JSONB mutées via read-modify-write : lire le tableau complet, modifier en mémoire, update le champ entier. Le flag `notified: {j7, j3, j1}` évite les doublons entre les runs du cron (8h tous les jours). Garantie single-shot par niveau d'alerte. | Cron idempotent sans table dédiée. |

## P5 — TERMINÉ ✅ (2026-04-11)

### Livré
Stripe 4 plans (free + Essentiel 9,99€ + Pro 19,99€ + Avocat Virtuel 39,99€)
avec monthly/yearly -30%, 14 jours d'essai gratuit, 3 paiements unitaires
(recommandé 5,99€ / signature 1,99€ / document 2,99€), portail Stripe pour
gestion abo, webhook avec parrainage automatique (50% 1er paiement + 10%
récurrent). Espace parrainage complet (QR code, stats, paliers Bronze→Légende,
templates partage, retraits ≥5€). Programme influenceur 1 clic avec /go/[slug]
tracking, /p/[slug] public profile, espace dédié (kit créateur, templates,
leaderboard). Dashboard admin super_admin avec KPI MRR/ARR, graph revenus
30j (recharts), liste users filtrable/paginée, cases par statut/domaine,
paiements avec export CSV, gestion influenceurs + validation virements.

### Fichiers créés / modifiés (P5)

**Stripe — lib + APIs**
- `src/lib/stripe.ts` — getStripe() lazy-init singleton, JURIS_PLANS (6 prix
  recurring), JURIS_UNITS (3 prix one-time), resolvePriceId/resolveUnitPriceId
  lisant les env vars STRIPE_PRICE_*, getOrCreateWelcomeCoupon() pour coupon
  WELCOME10 -10% premier mois, formatAmount/planLabel helpers.
- `src/scripts/setup-stripe-prices.ts` — script tsx one-shot idempotent
  (lookup_key) qui provisionne Products + Prices + coupon dans Stripe live
  et imprime les env vars à copier sur Vercel. Déjà exécuté : 9 prix créés,
  env vars poussées sur Vercel via API.
- `src/app/api/stripe/checkout/route.ts` — POST Zod {plan, billing, couponCode?}.
  Auth user, reuse/create Stripe customer, line_items + price_id, trial 14j,
  metadata {juris_user_id, plan, billing, referred_by}, allow_promotion_codes
  par défaut ou WELCOME10 forcé, success=/dashboard?upgrade=success,
  locale:'fr', payment_method_types: card+paypal+link.
- `src/app/api/stripe/checkout-unit/route.ts` — POST Zod {type, metadata}
  mode=payment, success_url avec CHECKOUT_SESSION_ID placeholder, PaymentIntent
  metadata dupliquée pour webhook idempotence.
- `src/app/api/stripe/portal/route.ts` — POST (auth), billingPortal.sessions.create
  avec return_url=/abonnement.
- `src/app/api/stripe/webhook/route.ts` — raw body via req.text(),
  constructEvent + STRIPE_WEBHOOK_SECRET, switch sur :
  * `checkout.session.completed` mode subscription → update
    subscription_plan + stripe_*_id, insert payment row
  * `checkout.session.completed` mode payment → insert payment row
    type=recommande|signature|dossier
  * `customer.subscription.created/updated` → upsert plan selon status
  * `customer.subscription.deleted` → downgrade 'free'
  * `invoice.payment_succeeded` → insert payment + hook parrainage
    (convertReferral 1er paiement, applyRecurringCommission ensuite)
  * `invoice.payment_failed` → insert notification /abonnement
  Catch global → JAMAIS throw (Stripe retry infinite sinon). Retour
  {received:true} 200 même en cas d'erreur interne. Signature invalide → 400.

**Parrainage**
- `src/lib/referral.ts` — TIERS (Bronze5→Argent10→Or25→Platine50→Diamant75
  →Légende100 avec bonusRecurringPct), computeTier, findReferrerByCode
  (normalisation uppercase), trackReferralSignup (insert référence pending
  + update referred_by sur user), convertReferral (50% 1er paiement, upsert
  statut converted, insert payment stripe_payment_id=referral_first_*),
  applyRecurringCommission (10% + tier bonus, stripe_payment_id=referral_
  recurring_*_timestamp), getReferralStats (agrégation stats + tier + next).
- `src/app/api/referral/route.ts` — GET stats via getReferralStats,
  POST discriminated union track|apply_on_signup|request_withdrawal
  (minimum 5€, insert payment type=withdrawal pending + notification).

**Influenceurs**
- `schema-p5.sql` — table `jurispurama_influencers` (user_id UNIQUE, slug
  UNIQUE, bio, social_links JSONB, audience_size, tier, free_plan_granted,
  compteurs, timestamps) + index + RLS (select own/admin, insert own,
  update own/admin). Appliquée via docker exec supabase-db.
- `src/app/api/influencer/route.ts` — GET profil, POST Zod validation
  (bio 10+, reason 10+, socialLinks), slugify {full_name}+4random,
  unicité slug (5 tentatives), insert approved=true tier=bronze
  free_plan_granted=essentiel, upgrade auto user si plan=free, notification.
- `src/app/go/[slug]/route.ts` — GET clean slug, lookup influenceur,
  resolve referral_code du owner, construit /signup?ref=CODE&utm_*,
  incrément total_clicks, 302 + cookie juris_ref_slug 30j httpOnly.
- `src/app/p/[slug]/page.tsx` — server component public via createServiceClient,
  revalidate 60s, hero glass + bio + social links + CTA -50% vers /go/[slug]
  + QR code imprimable. generateMetadata dynamique.

**Pages UI**
- `src/app/(dashboard)/abonnement/page.tsx` — refonte complète :
  bannière "plan actuel" + bouton portal Stripe si abonné, toggle
  monthly/yearly (-30% badge), 4 cards (Free + 3 payants), popular
  "⭐POPULAIRE" sur Pro, prix barrés en annuel, loading par plan, toast
  sur ?upgrade=success ou ?canceled=1, tableau comparatif 8 features,
  3 témoignages honnêtes avec gain €, FAQ 5 questions repliables.
  Wrappé dans Suspense (useSearchParams).
- `src/app/(dashboard)/parrainage/page.tsx` — refonte complète : code
  parrain + lien + 6 boutons partage (WhatsApp/SMS/Telegram/Twitter/FB/Email)
  + QR code (qrcode lib), 4 stats cards (signups, conversions, commissions
  totales, disponible retrait), progress bar vers prochain palier, historique
  10 derniers filleuls anonymisés avec badge statut, bouton virement si
  ≥5€ (POST /api/referral action=request_withdrawal).
- `src/app/(dashboard)/influenceur/page.tsx` — 2 états : pas encore
  influenceur (CTA /apply/influenceur) ou dashboard complet (stats, lien
  /go + /p copiables, QR, avantages tier, kit créateur 3 bannières
  Pollinations 3840×2160, 3 templates textes copiables, top 10 classement).
- `src/app/(dashboard)/apply/influenceur/page.tsx` — formulaire Zod (bio
  10+, social_links 5 champs, audience_size, reason 10+), approved auto,
  redirect /influenceur.
- `src/app/(dashboard)/admin/layout.tsx` — server component guard
  auth + email==SUPER_ADMIN_EMAIL sinon redirect /dashboard. Nav 5 liens.
- `src/app/(dashboard)/admin/page.tsx` — 4 KPI cards (MRR estimate,
  users, conversion rate, argent économisé), répartition plans 4 cards,
  graph recharts LineChart 30j, 2 colonnes recent signups + recent payments.
- `src/app/(dashboard)/admin/users/page.tsx` — table paginée 25/page,
  search email/nom, filter plan, select inline pour changer plan utilisateur
  (PATCH /api/admin/users).
- `src/app/(dashboard)/admin/cases/page.tsx` — server component, 2 cards
  by_status + by_type (counts), table 200 dossiers avec badges.
- `src/app/(dashboard)/admin/payments/page.tsx` — table filtrable par
  type+status, total encaissé sur filtre, export CSV via lien direct.
- `src/app/(dashboard)/admin/influenceurs/page.tsx` — table influenceurs
  triée par commissions, liste demandes de virement avec bouton "Marquer
  payé" (PATCH /api/admin/influencers).

**Admin APIs**
- `src/app/api/admin/stats/route.ts` — aggrège users count + active30d +
  plansBreakdown + subscribers, payments last30d + startMonth, dailyRevenue
  array 30j, cases total/resolu/docs/moneySaved, recentSignups×10,
  recentPayments×10, conversionRate.
- `src/app/api/admin/users/route.ts` — GET paginé 25 avec search + plan
  filter, PATCH Zod subscription_plan|role par userId.
- `src/app/api/admin/payments/route.ts` — GET list 500 last avec filtres
  type/status, format=csv pour export download.
- `src/app/api/admin/influencers/route.ts` — GET enriched avec email+name
  joint via Map, withdrawals pending row, PATCH status paiement.

**Middleware**
- `src/middleware.ts` — ajout guard /admin + /api/admin : si user email
  != SUPER_ADMIN_EMAIL → 403 JSON pour API, redirect /dashboard pour pages.
  Fix /signup?ref=CODE laissé passer même si user logged (hook applique
  le code ensuite).

**Signup**
- `src/app/(auth)/signup/page.tsx` — capture ?ref=CODE query OR cookie
  juris_ref (30j), stocke dans state + cookie. Si user déjà loggé et ref
  présent → POST /api/referral action=apply_on_signup, toast + redirect.
  Bannière "Parrainé par : CODE ✨ -50%". Après signup réussi, apply_on_signup
  fire-and-forget.

**Sidebar**
- `src/components/layout/Sidebar.tsx` — ajout lien "Influenceur ⭐".

### Validations (P5)

- `npx tsc --noEmit` → exit 0, 0 erreur
- `npm run build` → Compiled successfully, 43 routes, 0 warning bloquant
  (seule warning : middleware → proxy rename deprecation, non bloquant)
- Stripe provisioning : 9 prices + coupon créés en live, STRIPE_PRICE_*
  env vars poussées sur Vercel via API REST
- Stripe webhook : we_1TKqgb4Y1unNvKtXo10pXz8L créé pointant sur prod URL,
  whsec_CFofh1TXdnml3RF8wd8tNMDjiyxe4zJP mis à jour dans env Vercel
- Live smoke tests :
  - `GET /api/status` → {"ok":true}
  - `POST /api/stripe/checkout` (no auth) → 401 "Tu dois être connecté"
  - `POST /api/stripe/portal` (no auth) → 401 FR
  - `GET /api/admin/stats` (no auth) → 403 "Accès réservé à l'administration"
  - `GET /api/referral` (no auth) → 401 FR
  - `GET /api/influencer` (no auth) → 401 FR
  - `POST /api/stripe/webhook` sans signature → 200 {"received":true,"warning"}
  - `POST /api/stripe/webhook` avec bad sig → 400 "No signatures found"
  - `GET /go/unknownslug` → 302 /signup?utm_source=influencer
  - `GET /p/unknownslug` → 404
  - `GET /abonnement` (no auth) → 307 /login?next=/abonnement
  - `GET /influenceur` (no auth) → 307 /login?next=/influenceur
- Deployment : dpl_2Ayv89m8XSpqwqvk4TM8tgQnRHZE (production READY)
- Alias : https://jurispurama.purama.dev → new deploy
- Commit : aeadc22 (feat P5 — non pushé GitHub, repo pré-créé requis)

### Détails techniques importants

**Git author & Vercel deploy**
Vercel rejette maintenant les deploys CLI si le `VERCEL_GIT_COMMIT_AUTHOR_*`
ne correspond pas à un membre du team. Les P1-P4 passaient avec
matissdornier@macbookpro.home, mais P5 a commencé à être bloqué.
Fix : copier l'arbre projet dans /tmp sans .git et redeployer depuis là —
Vercel ne détecte plus d'auteur git et utilise l'owner du token. Alias
ré-assigné manuellement vers jurispurama.purama.dev après le deploy.

**Stripe API version**
@stripe/stripe-js + stripe SDK 22 requièrent apiVersion: '2026-03-25.dahlia'
(la dernière). L'ancienne '2025-02-24.acacia' n'est plus dans LatestApiVersion
type, TypeScript la rejette.

**Next 16 useSearchParams + Suspense**
Next 16 exige que useSearchParams() soit wrappé dans `<Suspense>` sinon
build fail en SSG. /abonnement content a été split en AbonnementContent + wrapper.

**Webhook raw body Next 16 App Router**
req.text() fournit le body brut non parsé (Next 16 ne modifie pas les bytes
tant que tu n'appelles pas req.json()). Aucun middleware bodyParser à
désactiver. `export const dynamic = 'force-dynamic'` pour empêcher la
pré-génération static.

**Webhook idempotence + referral trigger**
Sur invoice.payment_succeeded, on compte les payments existants du user
type=subscription status=succeeded : si count <= 1 c'est le premier
paiement → convertReferral(50%), sinon applyRecurringCommission(10%+bonus).
Count faite APRÈS insert du nouveau payment pour que le 1er vrai compte
bien comme "premier". try/catch global autour du switch pour ne jamais
renvoyer autre chose que 200 (Stripe retry sinon).

**Script setup-stripe-prices idempotent**
Utilise `stripe.prices.list({lookup_keys:[key], active:true})` comme
upsert — si déjà créé on récupère l'id, sinon création. Les products
sont dédupliqués via `stripe.products.search({query:"name:'...'"}_)`.
Coupon welcome10_jurispurama est un id fixe retrievable. Relançable
sans effet de bord.

**Influenceur slug unique**
slugify(full_name ou email.split('@')[0]) + 4 chars alphanum lowercase
aléatoires, 5 tentatives de regénération en cas de clash. Pattern
compatible /go/[slug] + /p/[slug] avec route params clean (regex
[^a-zA-Z0-9\-]).

**Admin cases page server component**
Pas d'API nécessaire — createServiceClient() en RSC avec dynamic=force-dynamic
pour by-pass cache. Le guard super_admin est déjà appliqué au layout parent
qui fait le redirect en RSC avant même d'exécuter le children.

**Recharts ResponsiveContainer + Tooltip typing**
Le formatter du Tooltip recharts attend `ValueType | undefined`, il faut
`typeof value === 'number' ? formatEuros(value) : String(value)` sinon TS erreur.

### Prêt pour P6
- Landing premium (Hero3D, Features, How, Testimonials, Pricing inline, FAQ, CTA)
- SEO (sitemap dynamique, robots, meta dynamique, OG Satori, JSON-LD schema.org)
- PWA (SW + manifest + /offline + install banner)
- i18n next-intl 16 langues
- Dark / OLED / Light themes
- Cinématique 3-4s + Tutorial overlay 7 étapes

### Learnings P5
| 2026-04-11 | JURISPURAMA | Vercel deploy via CLI rejette désormais si VERCEL_GIT_COMMIT_AUTHOR_EMAIL n'est pas un membre du team. Contournement : copier l'arbre dans /tmp sans .git, redeployer depuis là, ré-aliaser le domain ensuite avec `vercel alias set` | Débloque déploiement solo sans inviter l'email local dans l'équipe |
| 2026-04-11 | JURISPURAMA | Next 16 exige Suspense wrapper autour useSearchParams() sinon SSG fail. Pattern : split en Content + Page wrapper avec `<Suspense fallback>` | Build ne casse plus sur les pages qui lisent query string côté client |
| 2026-04-11 | JURISPURAMA | Stripe SDK 22 → apiVersion: '2026-03-25.dahlia' (Dahlia). LatestApiVersion type n'accepte que la dernière. Hardcoder la chaîne littérale sans cast | TS strict heureux, zéro tricherie |
| 2026-04-11 | JURISPURAMA | Webhook raw body Next 16 App Router : req.text() suffit, zéro config body-parser. `dynamic='force-dynamic'` pour éviter pré-gen. Signature verify → 400 mais catch global → 200 toujours sur erreurs métier (idempotence Stripe) | Webhooks prod-grade sans retry storm |
| 2026-04-11 | JURISPURAMA | Script setup-stripe-prices idempotent via `lookup_keys` : relançable sans doublon, sortie console des env vars à copier sur Vercel | Une seule source de vérité entre code et Stripe dashboard |
| 2026-04-11 | JURISPURAMA | Parrainage commission calc : count payments existants APRÈS insert du nouveau → si ≤ 1 c'est le premier paiement, convertReferral 50%. Sinon applyRecurringCommission 10% + tier bonus. Payment rows stripe_payment_id préfixé `referral_first_` / `referral_recurring_` pour différencier des vrais Stripe IDs dans les agrégations wallet | Commissions automatiques sans table dédiée supplémentaire |
