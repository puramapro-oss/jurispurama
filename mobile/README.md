# JurisPurama Mobile

App Expo (iOS + Android + Web) compagnon de [jurispurama.purama.dev](https://jurispurama.purama.dev).

## Stack
Expo SDK 54 · expo-router 6 (typed routes) · React Native 0.81 · NativeWind 4 · Zustand · Supabase JS · expo-secure-store · expo-haptics · lucide-react-native

## Identité
- **Bundle** : `dev.purama.jurispurama`
- **Scheme** : `jurispurama://`
- **Owner Expo** : `puramapro-oss`
- **Backend** : `https://jurispurama.purama.dev` (web prod)
- **Auth** : Supabase self-hosted `https://auth.purama.dev`

## Architecture
```
mobile/
├── app/                  expo-router (file-based)
│   ├── _layout.tsx       Auth gate + theme + safe area + gestures
│   ├── index.tsx         Splash → redirect
│   ├── (auth)/           login, signup, forgot-password
│   └── (tabs)/           dashboard, chat, dossiers, profil, abonnement
├── components/           Button, Card, Input, Screen
├── lib/                  supabase (SecureStore adapter), api, theme
├── store/                auth (zustand)
├── assets/               icon, splash, adaptive, favicon, feature-graphic
├── maestro/              10 flows E2E YAML
├── scripts/gen-icons.mjs Régénération via Pollinations + sharp
├── .eas/workflows/       full-deploy.yaml + ota-update.yaml
├── store.config.json     Métadonnées 16 langues (Apple + Google)
└── GOOGLE_PLAY_SETUP.md  Setup Play Console (3 min)
```

## Auth — pattern critique
Adaptateur Supabase storage : `SecureStore` sur natif, `localStorage` sur web (`Platform.OS === "web"`). Sans ça → crash au boot. Voir `lib/supabase.ts`.

## Dev local
```bash
npm install
npx expo start            # QR Expo Go / press i / press a
npx expo start --ios      # simulateur iOS
npx expo start --android  # émulateur Android
```

## Quality gates
```bash
npx tsc --noEmit                                                              # 0 erreur
grep -rn "window\.\|document\.\|localStorage\." app components hooks lib store \
  --include="*.ts" --include="*.tsx" | grep -v "Platform.OS"                  # 0 leak
```

## EAS
```bash
eas init                                # crée projectId + l'écrit dans app.json/extra/eas
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --profile production --platform all
```

Profils dans `eas.json` :
- `development` : dev client interne, simulator iOS, APK Android
- `preview` : APK Android + IPA iOS interne
- `production` : autoIncrement, app-bundle Android, IPA iOS, submit auto

## Maestro E2E
```bash
brew install maestro
maestro test maestro/             # tous les flows
maestro test maestro/05-chat.yaml # un flow
```

10 flows : onboarding, login, signup, navigation, chat, dossiers, abonnement, profil/signout, forgot-password, error-handling.

## Workflows EAS (cloud)
- `full-deploy.yaml` — push main → build iOS+Android prod → submit App Store + Play Console
- `ota-update.yaml` — push de patch JS → publish channel `production` (sans review store)

## Crédits
SASU PURAMA · 8 Rue Chapelle 25560 Frasne · art. 293B · matiss.frasne@gmail.com
