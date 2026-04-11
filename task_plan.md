# JurisPurama — Task Plan

## Phases
- [x] P1 — Scaffold + Auth Supabase + DB schema + Landing + Deploy ✅ 2026-04-11
- [ ] P2 — Chat JurisIA SSE + dossiers/messages + actions
- [ ] P3 — Profil juridique + Scanner OCR + Génération PDF
- [ ] P4 — Signature DocuSeal + Envoi Resend/AR24 + Timeline + Alerts
- [ ] P5 — Stripe 4 plans + Parrainage + Influenceurs + Admin
- [ ] P6 — Landing premium + SEO + PWA + i18n + Dark
- [ ] P7 — Tests PW + audit + deploy final

## Live (P1)
- URL: https://jurispurama.purama.dev — HTTP 200
- API status: https://jurispurama.purama.dev/api/status — `{"ok":true,"app":"jurispurama"}`
- Vercel project: prj_g9rdLUpZDdMLkJNNrBUXWjdSV9yk (puramapro-oss-projects)
- Deployment: dpl_7rLC9DKG5NcN8egUHPJ7tLhK52vT (READY)
- DB schema: jurispurama (7 tables, RLS ON, exposed via PGRST)

## Stack
Next.js 16 + React 19 + TS strict + Tailwind v4 + @supabase/ssr + stripe + @anthropic-ai/sdk + resend + zod + framer-motion + next-intl + lucide-react + sonner + next-pdf/jspdf
Template de base: ~/purama/akasha-ai (structure, lib, ui, middleware, i18n)

## Identité
- Slug: jurispurama
- Domaine: jurispurama.purama.dev
- Schéma DB: jurispurama (tables préfixées jurispurama_*)
- Couleurs: #1E3A5F (bleu justice) + #C9A84C (or confiance)
- Font: Cormorant Garamond (serif) + Inter (sans)
- IA: JurisIA (Claude sonnet-4)
- Admin: matiss.frasne@gmail.com
