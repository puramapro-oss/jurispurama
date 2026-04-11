# JurisPurama — Task Plan

## Phases
- [x] P1 — Scaffold + Auth Supabase + DB schema + Landing + Deploy ✅ 2026-04-11
- [x] P2 — Chat JurisIA SSE + dossiers/messages + actions ✅ 2026-04-11
- [x] P3 — Profil juridique chiffré + Scanner OCR Claude Vision + Génération PDF ✅ 2026-04-11
- [x] P4 — Signature canvas Art.1366 + Envoi Resend/AR24 + Timeline + Crons + Notifications ✅ 2026-04-11
- [x] P5 — Stripe 4 plans + Parrainage + Influenceurs + Admin ✅ 2026-04-11
- [x] P6 — Landing premium + Pricing + SEO + PWA + i18n + Dark ✅ 2026-04-11
- [x] P7 — Tests PW (111/111) + 21 SIM + Lighthouse 100/96/100/100 + README + deploy final ✅ 2026-04-11

## LIVRÉ 🎉
Toutes les phases P1 → P7 ✅. App 100% live.

## Live (P6)
- URL: https://jurispurama.purama.dev — HTTP 200 (toutes pages publiques)
- Deploy: dpl_CKBBGwaFNK1BoT451C5xQWQusYjY (prod)
- Pages: /, /pricing, /how-it-works, /ecosystem, /aide, /contact, /changelog, /status, /blog, /offline
- API: /api/og?title=X (ImageResponse/Satori 1200x630), /api/contact (Resend + DB), /api/cron/email-sequences
- PWA: /manifest.json (shortcuts), /sw.js (offline fallback)
- SEO: /sitemap.xml (16 URLs), /robots.txt, JSON-LD (Organization + SoftwareApplication), hreflang
- i18n lightweight fr/en/es via useLocale hook (localStorage + cookie fallback)
- Dark mode via useTheme hook (localStorage + FOUC-safe ThemeScript)
- Email marketing templates (Welcome J0, Day1 tip, Day7 upgrade WELCOME20, Day30 winback, Referral success)
- Cron daily 10h: /api/cron/email-sequences (anti-duplicate via jurispurama_email_sequences)
- DB tables P6: jurispurama_contact_messages, jurispurama_email_sequences (RLS)

## Live (P5)
- URL: https://jurispurama.purama.dev — HTTP 200
- API status: /api/status → {"ok":true,"app":"jurispurama"}
- Chat SSE: POST /api/ai/chat (auth)
- Cases API: GET/POST /api/cases, GET/PATCH/DELETE /api/cases/[id]
- Profile API: GET/PUT /api/profile (AES-256)
- OCR API: POST /api/ocr
- Documents API: POST /api/documents/generate, GET/DELETE /api/documents/[id]
- **P4** Signature: POST /api/documents/[id]/sign
- **P4** Envoi email: POST /api/documents/[id]/send-email
- **P4** Envoi recommandé: POST /api/documents/[id]/send-recommande
- **P4** Notifs: GET/PATCH /api/notifications
- **P4** Crons: deadline-alerts, check-ar-status (Bearer CRON_SECRET)
- **P4** Verify public: GET /verify/[id]
- **P5** Stripe checkout abo: POST /api/stripe/checkout (401 w/o auth)
- **P5** Stripe checkout unit: POST /api/stripe/checkout-unit
- **P5** Stripe portal: POST /api/stripe/portal
- **P5** Stripe webhook: POST /api/stripe/webhook (constructEvent + raw body)
- **P5** Referral: GET/POST /api/referral (stats, apply_on_signup, withdrawal)
- **P5** Influencer: GET/POST /api/influencer
- **P5** Admin: GET /api/admin/stats, GET/PATCH /api/admin/users, GET /api/admin/payments (csv), GET/PATCH /api/admin/influencers
- **P5** Redirects: GET /go/[slug] → /signup?ref=CODE (302 + cookie)
- **P5** Public profile: GET /p/[slug]
- Pages P5: /abonnement (cards + toggle + portal), /parrainage (QR + stats + tier + withdrawal),
  /influenceur (dashboard), /apply/influenceur (form), /admin, /admin/users, /admin/cases,
  /admin/payments, /admin/influenceurs
- Stripe webhook: we_1TKqgb4Y1unNvKtXo10pXz8L (live) → /api/stripe/webhook
  Events: checkout.session.completed, customer.subscription.*, invoice.payment_*
- Stripe products/prices: 6 recurring (essentiel/pro/avocat × monthly/yearly) + 3 one-time
  (recommande 5.99€, signature 1.99€, document 2.99€) + coupon welcome10_jurispurama
- DB schema: jurispurama (11 tables — +jurispurama_influencers RLS)
- Dernier deploy: dpl_2Ayv89m8XSpqwqvk4TM8tgQnRHZE (prod), alias jurispurama.purama.dev
- Commit: aeadc22 (feat P5)

## Stack
Next.js 16 + React 19 + TS strict + Tailwind v4 + @supabase/ssr +
@anthropic-ai/sdk + @react-pdf/renderer + pdf-lib + @react-email/components +
resend + stripe 22 + recharts + qrcode + react-markdown + remark-gfm + sonner + zod

## Identité
- Slug: jurispurama
- Domaine: jurispurama.purama.dev
- Schéma DB: jurispurama (tables préfixées jurispurama_*)
- Couleurs: #1E3A5F (bleu justice) + #C9A84C (or confiance)
- Font: Cormorant Garamond (serif) + Inter (sans)
- IA: JurisIA (Claude sonnet-4)
- Admin: matiss.frasne@gmail.com
