# JurisPurama — Task Plan

## Phases
- [x] P1 — Scaffold + Auth Supabase + DB schema + Landing + Deploy ✅ 2026-04-11
- [x] P2 — Chat JurisIA SSE + dossiers/messages + actions ✅ 2026-04-11
- [x] P3 — Profil juridique chiffré + Scanner OCR Claude Vision + Génération PDF ✅ 2026-04-11
- [x] P4 — Signature canvas Art.1366 + Envoi Resend/AR24 + Timeline + Crons + Notifications ✅ 2026-04-11
- [ ] P5 — Stripe 4 plans + Parrainage + Influenceurs + Admin
- [ ] P6 — Landing premium + SEO + PWA + i18n + Dark
- [ ] P7 — Tests PW + audit + deploy final

## Live (P4)
- URL: https://jurispurama.purama.dev — HTTP 200
- API status: https://jurispurama.purama.dev/api/status — `{"ok":true,"app":"jurispurama"}`
- Chat SSE: POST /api/ai/chat (auth required)
- Cases API: GET/POST /api/cases, GET/PATCH/DELETE /api/cases/[id]
  (PATCH accepte maintenant money_saved)
- Profile API: GET/PUT /api/profile (AES-256 chiffré)
- OCR API: POST /api/ocr (multipart Claude Vision)
- Documents API: POST /api/documents/generate, GET/DELETE /api/documents/[id]
- **P4 Signature**: POST /api/documents/[id]/sign
- **P4 Envoi email**: POST /api/documents/[id]/send-email
- **P4 Envoi recommandé**: POST /api/documents/[id]/send-recommande
- **P4 Notifications**: GET/PATCH /api/notifications
- **P4 Crons**: GET /api/cron/deadline-alerts (8h quotidien),
  GET /api/cron/check-ar-status (toutes 6h) — Bearer CRON_SECRET
- **P4 Verify public**: GET /verify/[id]
- Pages P4: /documents/[id] (sign+send modals), /dossiers/[id]
  (timeline enrichie + savings), landing avec counter community
- Storage bucket: jurispurama-documents (+ sous-dossiers signatures/)
- DB schema: jurispurama (10 tables — +jurispurama_signatures,
  +jurispurama_notifications, RLS ON)
- Dernier deploy: dpl_48AfcJA3qwvr6hKBEDwrLj6trKHz
- Commit: de4109f (feat P4)

## Stack
Next.js 16 + React 19 + TS strict + Tailwind v4 + @supabase/ssr +
@anthropic-ai/sdk + @react-pdf/renderer + pdf-lib + @react-email/components +
resend + react-markdown + remark-gfm + sonner + zod

## Identité
- Slug: jurispurama
- Domaine: jurispurama.purama.dev
- Schéma DB: jurispurama (tables préfixées jurispurama_*)
- Couleurs: #1E3A5F (bleu justice) + #C9A84C (or confiance)
- Font: Cormorant Garamond (serif) + Inter (sans)
- IA: JurisIA (Claude sonnet-4)
- Admin: matiss.frasne@gmail.com
