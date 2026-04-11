# JurisPurama — Task Plan

## Phases
- [x] P1 — Scaffold + Auth Supabase + DB schema + Landing + Deploy ✅ 2026-04-11
- [x] P2 — Chat JurisIA SSE + dossiers/messages + actions ✅ 2026-04-11
- [ ] P3 — Profil juridique + Scanner OCR + Génération PDF
- [ ] P4 — Signature DocuSeal + Envoi Resend/AR24 + Timeline + Alerts
- [ ] P5 — Stripe 4 plans + Parrainage + Influenceurs + Admin
- [ ] P6 — Landing premium + SEO + PWA + i18n + Dark
- [ ] P7 — Tests PW + audit + deploy final

## Live (P2)
- URL: https://jurispurama.purama.dev — HTTP 200
- API status: https://jurispurama.purama.dev/api/status — `{"ok":true,"app":"jurispurama"}`
- Chat SSE: POST https://jurispurama.purama.dev/api/ai/chat (auth required)
- Cases API: GET/POST https://jurispurama.purama.dev/api/cases, GET/PATCH/DELETE /api/cases/[id]
- DB schema: jurispurama (7 tables, RLS ON)

## Stack
Next.js 16 + React 19 + TS strict + Tailwind v4 + @supabase/ssr + @anthropic-ai/sdk + react-markdown + remark-gfm + sonner + zod

## Identité
- Slug: jurispurama
- Domaine: jurispurama.purama.dev
- Schéma DB: jurispurama (tables préfixées jurispurama_*)
- Couleurs: #1E3A5F (bleu justice) + #C9A84C (or confiance)
- Font: Cormorant Garamond (serif) + Inter (sans)
- IA: JurisIA (Claude sonnet-4)
- Admin: matiss.frasne@gmail.com
