# JurisPurama — Task Plan

## Phases
- [x] P1 — Scaffold + Auth Supabase + DB schema + Landing + Deploy ✅ 2026-04-11
- [x] P2 — Chat JurisIA SSE + dossiers/messages + actions ✅ 2026-04-11
- [x] P3 — Profil juridique chiffré + Scanner OCR Claude Vision + Génération PDF ✅ 2026-04-11
- [x] P4 — Signature canvas Art.1366 + Envoi Resend/AR24 + Timeline + Crons + Notifications ✅ 2026-04-11
- [x] P5 — Stripe 4 plans + Parrainage + Influenceurs + Admin ✅ 2026-04-11
- [x] P6 — Landing premium + Pricing + SEO + PWA + i18n + Dark ✅ 2026-04-11
- [x] P7 — Tests PW (111/111) + 21 SIM + Lighthouse 100/96/100/100 + README + deploy final ✅ 2026-04-11
- [x] P8 — Mobile Expo iOS + Android (scaffold + auth + écrans + icônes + Maestro + EAS) ✅ 2026-04-11

## LIVRÉ 🎉
Web v1.0 100 % live (P1→P7) + Mobile Expo prêt à builder (P8). App = web + iOS + Android.
JurisPurama n'est PAS une app santé/bien-être → P8 Watch (Apple Watch + Wear OS) **non applicable**.

## P8 — Mobile Expo (2026-04-11)

### Stack
- Expo SDK 54 (newArchEnabled) + expo-router 6 + React 19 + RN 0.81
- NativeWind 4 + Tailwind 3.4
- Supabase JS + expo-secure-store (auth chiffré KeyChain/Keystore)
- Zustand (auth state)
- expo-haptics, expo-linear-gradient, lucide-react-native, react-native-safe-area-context, react-native-gesture-handler, react-native-reanimated
- Bundle : `dev.purama.jurispurama` (iOS + Android)
- Scheme : `jurispurama://` + universal links `applinks:jurispurama.purama.dev`

### Livré
- `mobile/lib/supabase.ts` — adapter Platform.OS aware (SecureStore natif / localStorage web)
- `mobile/lib/api.ts` — wrapper fetch authenticated vers `https://jurispurama.purama.dev/api/*`
- `mobile/lib/theme.ts` — palette JurisPurama (#1E3A5F / #C9A84C / #6D28D9)
- `mobile/store/auth.ts` — Zustand store (init, signOut, onAuthStateChange)
- `mobile/components/{Button,Input,Card,Screen}.tsx` — UI primitives dark glass
- `mobile/app/_layout.tsx` — root Stack + auth redirect
- `mobile/app/(auth)/{login,signup,forgot-password}.tsx` — formulaires Zod-like + erreurs FR
- `mobile/app/(tabs)/_layout.tsx` — bottom tabs (Accueil, JurisIA, Dossiers, Abo, Profil)
- `mobile/app/(tabs)/dashboard.tsx` — stats dossiers + 4 cards (chat, doc, upgrade, voir)
- `mobile/app/(tabs)/chat.tsx` — chat JurisIA via /api/ai/chat (auth Bearer)
- `mobile/app/(tabs)/dossiers.tsx` — liste FlatList + RefreshControl + empty state + erreurs
- `mobile/app/(tabs)/abonnement.tsx` — 3 plans (Essentiel/Pro/Cabinet) → Stripe checkout via Linking
- `mobile/app/(tabs)/profil.tsx` — settings + signOut + liens vers web
- `mobile/app.json` — JurisPurama, dark, scheme, bundle dev.purama.jurispurama, plugins, EAS updates, infoPlist FR (Camera/Photo/FaceID), Android intentFilters universal links, permissions
- `mobile/eas.json` — dev / preview / production profiles + submit Apple + Play
- `mobile/assets/{icon,adaptive-icon,splash,splash-icon,favicon,feature-graphic}.png` — générés via Pollinations + sharp (script `scripts/gen-icons.mjs`, prompt scales of justice purple/gold)
- `mobile/maestro/01-onboarding.yaml` → `10-error-handling.yaml` — 10 flows E2E avec testID + screenshots
- `mobile/store.config.json` — fiches App Store en **16 langues** (fr, en, es, de, it, pt, ar, zh, ja, ko, hi, ru, tr, nl, pl, sv)
- `mobile/GOOGLE_PLAY_SETUP.md` — guide 3 minutes (Play Console + service account + invite)
- `mobile/.eas/workflows/full-deploy.yaml` — push main → ios+android build → submit
- `mobile/.eas/workflows/ota-update.yaml` — OTA branch production sans review
- `mobile/.gitignore` — google-service-account.json, .env*.local, *.keystore, ios/Pods/

### Quality gates mobile 7/7 ✅
- `npx tsc --noEmit` → **0 erreur**
- grep `localStorage` → uniquement `lib/supabase.ts` sous garde `Platform.OS === "web"` ✅
- grep `window.|document.` → **0** ✅
- grep TODO/Lorem/placeholder → **0** ✅
- grep `console.log` → **0** (1 `console.warn` justifié pour env var manquante)
- 10 flows Maestro avec `testID` reliés aux composants ✅
- 16 langues store.config.json ✅

### Reste à faire (setup une fois — credentials externes)
1. **Apple Dev** (matiss.frasne@gmail.com — déjà 99 €/an) :
   - Run `eas login` (avec EXPO_TOKEN du CLAUDE.md)
   - Run `eas init` dans `mobile/` → remplace `PLACEHOLDER_EAS_PROJECT_ID` dans app.json
   - Renseigner `APPLE_TEAM_ID` dans `~/purama/CLAUDE.md` (ligne actuelle = `___à_remplir___`)
   - Renseigner `ASC_APP_ID` dans `eas.json` après création de la fiche App Store Connect
2. **Google Play Console** :
   - Suivre `mobile/GOOGLE_PLAY_SETUP.md` (3 minutes — création app + service account)
   - Placer `google-service-account.json` à la racine de `mobile/` (gitignored)
3. **EAS builds** :
   - `cd mobile && eas build --profile development --platform ios` (smoke test)
   - `eas build --profile production --platform all` (release)
   - `eas submit --platform all` (TestFlight + Play draft)
4. **GitHub Action** : EAS Workflows déjà prêts (push main → auto build + submit)

## Stack
Next.js 16 + React 19 + TS strict + Tailwind v4 + @supabase/ssr +
@anthropic-ai/sdk + @react-pdf/renderer + pdf-lib + @react-email/components +
resend + stripe 22 + recharts + qrcode + react-markdown + remark-gfm + sonner + zod
**Mobile** : Expo 54 + expo-router 6 + NativeWind 4 + Zustand + Supabase JS

## Identité
- Slug: jurispurama
- Domaine: jurispurama.purama.dev
- Schéma DB: jurispurama (tables préfixées jurispurama_*)
- Bundle mobile: dev.purama.jurispurama
- Couleurs: #1E3A5F (bleu justice) + #C9A84C (or confiance) + #6D28D9 (violet juriste)
- Font: Cormorant Garamond (serif) + Inter (sans)
- IA: JurisIA (Claude sonnet-4)
- Admin: matiss.frasne@gmail.com
