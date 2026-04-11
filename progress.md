# JurisPurama — Progress

## P1 — TERMINÉ ✅ (2026-04-11)

### Live
- **URL**: https://jurispurama.purama.dev (HTTP 200)
- **API status**: https://jurispurama.purama.dev/api/status → `{"ok":true,"app":"jurispurama","env":"production"}`
- **Vercel**: project `prj_g9rdLUpZDdMLkJNNrBUXWjdSV9yk`, deployment `dpl_7rLC9DKG5NcN8egUHPJ7tLhK52vT` (READY)
- **Git commit**: b4e69df — "P1: scaffold + auth + DB + landing + legal pages"

### Fichiers créés

**Racine**
- package.json (Next 16.2.2, React 19, @supabase/ssr, Tailwind v4, etc.)
- tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs
- .gitignore, .env.local (avec credentials VPS corrects)
- vercel.json (crons configurés pour /api/cron/deadline-alerts + /api/cron/check-ar-status)
- schema.sql (déployé sur VPS)

**src/lib/**
- constants.ts (APP_*, PLANS, LEGAL_DOMAINS, COMPANY_INFO)
- utils.ts (cn, formatPrice, generateReferralCode, isSuperAdmin)
- supabase.ts (createBrowserClient + createServiceClient, schema='jurispurama')
- supabase-server.ts (createServerSupabaseClient pour RSC/API)

**src/types/**
- index.ts (JurisUser, JurisCase, JurisMessage, JurisDocument, types enum)

**src/hooks/**
- useAuth.ts (signIn/signUp/signInWithGoogle/signOut/resetPassword, fetchOrCreateProfile)

**src/middleware.ts** — @supabase/ssr, PUBLIC_PATHS, redirect auth → /dashboard, non-auth → /login?next=

**src/app/**
- layout.tsx (Cormorant Garamond + Inter, metadata FR, Toaster, ErrorBoundary)
- globals.css (palette justice #1E3A5F + or #C9A84C, glass, gradient-text, fade-in-up)
- page.tsx (landing: header, hero, process 3 étapes, 12 domaines, pricing 4 plans, CTA, footer)
- not-found.tsx, error.tsx
- sitemap.ts, robots.ts
- (auth)/layout.tsx + login/signup/forgot-password pages
- auth/callback/route.ts (exchangeCodeForSession)
- (dashboard)/layout.tsx + dashboard/page.tsx (accueil + CTA + empty state + 12 domaines)
- mentions-legales, politique-confidentialite, cgv, cgu, cookies (contenu légal complet SASU PURAMA Frasne, art.293B, RGPD, DPO)
- api/status/route.ts, api/cron/deadline-alerts/route.ts, api/cron/check-ar-status/route.ts (avec CRON_SECRET Bearer auth)

**src/components/**
- ui/Button.tsx (primary/gold/secondary/ghost/danger, loading, fullWidth)
- ui/Input.tsx (label, error, hint, focus ring justice)
- ui/Card.tsx (glass, hover, padding variants)
- layout/Sidebar.tsx (desktop, nav items, admin link si super_admin)
- layout/BottomTabBar.tsx (mobile, safe-area-inset-bottom)
- shared/ErrorBoundary.tsx

**public/**
- manifest.json (PWA basique, theme #1E3A5F)
- icon.svg (balance SVG gradient bleu/or)

### DB VPS (schema `jurispurama`)
Tables créées avec RLS ON :
1. `jurispurama_users` — profil auth (PK, FK auth.users, plan, stripe, referral_code)
2. `jurispurama_legal_profiles` — identité complète pour docs
3. `jurispurama_cases` — dossiers (type, status, strategy JSONB, deadlines, money_saved)
4. `jurispurama_messages` — conversation JurisIA
5. `jurispurama_documents` — PDFs générés, signature, envoi
6. `jurispurama_payments` — Stripe payments
7. `jurispurama_referrals` — parrainage

Trigger : `handle_new_user_jurispurama` sur auth.users → insert jurispurama_users auto.
RLS policies : user voit ses propres rows ; matiss.frasne@gmail.com voit tout.
Index : email, referral_code, stripe_customer_id, user_id, case_id.
PGRST_DB_SCHEMAS mis à jour sur VPS, `docker compose up -d --force-recreate rest` exécuté, schema exposé (vérifié via `curl /rest/v1/jurispurama_users` → `[]`).

### Env vars Vercel production (11 variables pushées)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_SCHEMA, ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY, NEXT_PUBLIC_APP_URL, ADMIN_EMAIL, CRON_SECRET — toutes en production + preview + development.

### Vérifications HTTP
```
/                                   200
/login                              200
/signup                             200
/mentions-legales                   200
/cgv                                200
/cgu                                200
/politique-confidentialite          200
/cookies                            200
/dashboard                          307 (redirect /login — OK)
/api/status                         {"ok":true,"app":"jurispurama"}
```

### Problèmes rencontrés + résolutions
1. **Next 16 ne reconnaît pas `eslint` dans nextConfig** — retiré du config.
2. **`vercel --prod` deploy échouait silencieusement (ERROR état, 0 logs)** — le CLI push sans envs locales fait fail le prerender Supabase. Fix : `vercel pull` puis `vercel build --prod` puis `vercel deploy --prebuilt --prod`.
3. **Vercel SSO deployment protection activée par défaut** — bloquait jurispurama.purama.dev avec 401 SSO. Fix : `PATCH /v9/projects/ID {"ssoProtection":null}` via API REST.
4. **PAT GitHub fine-grained ne peut pas créer de repo** — repo `jurispurama` PAS créé sur github.com/puramapro-oss. Remote local set avec token, il suffit que l'user crée le repo manuellement puis `git push -u origin main`.

### Ce qui est prêt pour P2 (Chat JurisIA)
- Types `JurisMessage`, `JurisCase` déjà définis dans `src/types/index.ts`
- Tables `jurispurama_cases`, `jurispurama_messages` déjà créées avec RLS
- Client Supabase browser/server configuré avec schema=jurispurama
- Middleware protège `/chat` et `/dossiers` → redirect login
- Env `ANTHROPIC_API_KEY` déjà poussé sur Vercel

**Pour P2 il faudra** :
1. Créer `src/lib/claude.ts` (askClaude / streamClaude helpers avec modèle claude-sonnet-4)
2. System prompt JurisIA dans `src/lib/prompts/jurisia.ts` (avocat 30 ans, FR, cite articles)
3. `src/app/api/ai/chat/route.ts` — streaming SSE `ReadableStream + TextEncoder + data: JSON\n\n + [DONE]`, runtime='nodejs', maxDuration=120
4. `src/app/(dashboard)/chat/page.tsx` — création/reprise dossier, UI chat markdown
5. `src/app/(dashboard)/chat/[caseId]/page.tsx` — historique dossier
6. `src/app/(dashboard)/dossiers/page.tsx` — liste filtrable par statut
7. `src/app/(dashboard)/dossiers/[id]/page.tsx` — détail timeline

### Manuel (à faire 1 fois par Tissma)
- Créer repo GitHub `puramapro-oss/jurispurama` (PAT actuel ne peut pas) → puis `git push -u origin main`
- Éventuellement connecter le repo au projet Vercel pour auto-deploy sur push
