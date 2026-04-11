# JurisPurama

L'assistant juridique IA français : pose ton problème, reçois un plan d'action et des documents prêts à signer en 3 minutes.

## Live

https://jurispurama.purama.dev

## Stack

- **Framework** : Next.js 16 (App Router) · React 19 · TypeScript strict
- **Styling** : Tailwind v4 · palette dark (#1E3A5F justice / #C9A84C gold) · Cormorant Garamond
- **Base de données** : Supabase self-hosted (PostgreSQL) via `auth.purama.dev`
- **Auth** : `@supabase/ssr` (cookies httpOnly) + OAuth Google + middleware
- **IA** : Anthropic Claude (`@anthropic-ai/sdk`) en SSE streaming — persona `JurisIA` (avocat FR 30 ans d'expérience)
- **Paiements** : Stripe 22 (live) — 4 abonnements (Free / Essentiel / Pro / Avocat) + 3 achats unitaires
- **PDF** : `@react-pdf/renderer` (génération) + `pdf-lib` (signature canvas → PDF signé)
- **Email** : Resend + `@react-email/components` (templates marketing + transactionnels)
- **OCR** : Claude Vision (scanner PV, contrats, baux)
- **PWA** : service worker offline-first · manifest · banner install
- **SEO** : sitemap 16 URLs · robots · JSON-LD Organization + SoftwareApplication · OG Satori 1200×630
- **Analytics** : Vercel Analytics + Speed Insights

## Features (phases P1 → P7)

- **P1** — Scaffold Next.js + Auth Supabase email/OAuth + schéma DB `jurispurama` (11 tables RLS) + landing minimaliste
- **P2** — Chat JurisIA SSE streaming + dossiers + messages + actions (générer doc, poser question, citer articles)
- **P3** — Profil juridique chiffré AES-256 + scanner OCR Claude Vision + génération PDF contestations
- **P4** — Signature canvas (Art. 1366 Code civil) + envoi email / recommandé (mode sim AR24) + timeline dossier + crons deadline-alerts
- **P5** — Stripe 4 plans + webhooks + parrainage (QR, tiers Bronze→Légende, withdrawals wallet) + programme influenceurs + admin (stats, users, payments, influenceurs)
- **P6** — Landing cinématique dark (Hero, Demo, Domains, HowItWorks, Testimonials, Compare, Pricing, FAQ, CTA, Footer) + pages statiques (pricing, how-it-works, ecosystem, aide, contact, changelog, status, blog, offline, légales) + SEO complet + PWA + i18n fr/en/es + dark mode + email marketing séquences
- **P7** — Playwright E2E (111 tests · 3 viewports) + 21 SIM utilisateur + Lighthouse audit (100/96/100/100 desktop)

## Architecture

```
src/
├── app/
│   ├── (auth)/              — login, signup, forgot-password, callback
│   ├── (dashboard)/         — dashboard, chat, dossiers, documents, scanner,
│   │                          profil, parrainage, abonnement, influenceur,
│   │                          apply, admin/*, settings
│   ├── api/
│   │   ├── admin/*          — stats, users, payments (csv), influencers
│   │   ├── ai/chat          — SSE streaming Claude
│   │   ├── cases            — CRUD dossiers
│   │   ├── contact          — form public → Resend + DB
│   │   ├── cron/*           — deadline-alerts, email-sequences, check-ar-status
│   │   ├── documents/*      — generate, sign, send-email, send-recommande
│   │   ├── influencer       — apply, stats
│   │   ├── notifications    — list, mark-read
│   │   ├── ocr              — Claude Vision upload
│   │   ├── og               — image OG Satori 1200×630
│   │   ├── profile          — GET/PUT (AES-256)
│   │   ├── referral         — stats, apply_on_signup, withdrawal
│   │   ├── status           — health
│   │   └── stripe/*         — checkout, checkout-unit, portal, webhook
│   ├── go/[slug]            — redirect parrainage + cookie 30j
│   ├── p/[slug]             — page publique influenceur
│   ├── verify/[id]          — vérification publique document signé
│   ├── pricing, how-it-works, ecosystem, aide, contact
│   ├── changelog, status, blog, offline
│   ├── mentions-legales, cgv, cgu, politique-confidentialite, cookies
│   ├── sitemap.ts, robots.ts, layout.tsx, page.tsx, globals.css
├── components/
│   ├── landing/             — Hero, Demo, Domains, HowItWorks, Testimonials,
│   │                          Compare, PricingPreview, LandingFAQ, CTAFinal,
│   │                          LandingHeader, LandingFooter, CursorGlow, Reveal
│   ├── ui/                  — Button, Input, Card, Modal, Badge…
│   ├── chat/                — ChatStream, ChatInput, MessageBubble, GenerateDocumentModal
│   ├── documents/           — DocumentCanvas, SignatureCanvas, SendModal
│   └── shared/              — ThemeScript, ThemeToggle, LocaleSwitcher,
│                              InstallBanner, ServiceWorkerRegister
├── hooks/                   — useAuth, useTheme, useLocale
├── lib/                     — supabase, claude, stripe, crypto, email, pdf,
│                              i18n, faq, ecosystem, utils, constants
├── types/                   — database, app
├── middleware.ts            — @supabase/ssr + routes publiques
└── scripts/                 — setup-stripe-prices.ts
```

## Dev local

```bash
git clone https://github.com/puramapro-oss/jurispurama.git
cd jurispurama
npm install
cp .env.example .env.local  # renseigner les clés (voir CLAUDE.md racine)
npm run dev                 # → http://localhost:3000
```

Variables d'env critiques : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRYPTO_SECRET_KEY`, `CRON_SECRET`.

## Tests

```bash
npm run build          # next build (0 err / 0 warn)
npx tsc --noEmit       # 0 err
npx playwright test    # 111 tests · 3 viewports (desktop-1920, tablet-768, mobile-375)
npx lighthouse https://jurispurama.purama.dev --preset=desktop
```

Dernier audit Lighthouse (desktop) :
- Landing : Perf **100** · A11y **96** · Best **100** · SEO **100**
- /pricing : Perf **100** · A11y **96** · Best **100** · SEO **100**
- /aide    : Perf **100** · A11y **95** · Best **100** · SEO **100**

## Deploy

Production : Vercel (team `puramapro-oss`, projet `jurispurama`, alias `jurispurama.purama.dev`).

```bash
vercel --prod --token $VERCEL_TOKEN --scope puramapro-oss --yes
```

Webhook Stripe live : `we_1TKqgb4Y1unNvKtXo10pXz8L` → `POST /api/stripe/webhook`.
Cron daily 10h → `POST /api/cron/email-sequences` (Bearer `CRON_SECRET`).

## Licence

Propriétaire — SASU PURAMA (8 Rue de la Chapelle, 25560 Frasne, France — art. 293B).

## Contact

- Support : contact@purama.dev
- DPO / RGPD : matiss.frasne@gmail.com
- Légal : voir `/mentions-legales`, `/politique-confidentialite`, `/cgv`, `/cgu`
