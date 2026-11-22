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
│   ├── (auth)/           login, signup, forgot-password, update-password
│   ├── auth/callback     Retour PKCE natif de récupération
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

### Récupération du mot de passe

Le parcours iOS/Android demande le retour `jurispurama://auth/callback?flow=recovery`.
Le lien doit être ouvert sur l’appareil et dans l’application qui ont demandé la
réinitialisation : le vérificateur PKCE est conservé dans leur SecureStore, sous
un espace dédié à la récupération. Le callback vérifie le scheme, le chemin et
les paramètres avant tout échange. Il refuse les redirections et jetons ajoutés
au lien.

La session obtenue reste en mémoire et ne remplace jamais le compte connecté.
Le formulaire vérifie la session et son utilisateur auprès de Supabase avant de
modifier le mot de passe, avec un client isolé. Un changement de compte, une
fermeture ou une annulation invalident la tentative. Une réponse ancienne ne
peut pas effacer le vérificateur d’une nouvelle demande. Après un redémarrage
pendant le formulaire, il faut demander un nouveau lien ; aucun jeton de session
de récupération n’est enregistré sur disque. L’utilisateur initialement
déconnecté revient à la connexion après avoir enregistré son mot de passe.

La version Expo Web ouvre le parcours `/forgot-password` du site JurisPurama :
elle ne crée pas de lien natif dont le vérificateur serait stocké dans un autre
navigateur.

**Configuration externe NON TESTÉE :** l’allowlist de redirection Supabase doit
autoriser l’URL native ci-dessus. Aucun réglage de fournisseur ni envoi d’email
réel n’a été effectué dans cette correction. La réception d’un email, le retour
OS dans un binaire iOS/Android et les règles du fournisseur restent à qualifier
avec un compte de test autorisé. La configuration du scheme existe déjà dans
`app.json`. Un lien issu de l’ancien parcours web doit être remplacé par une
nouvelle demande depuis l’application mise à jour.

Références : [Supabase, liens natifs](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
et [Expo, liens entrants](https://docs.expo.dev/linking/into-your-app/).

Tests ciblés hors réseau, depuis la racine du dépôt :

```bash
node --test tests/mobile-contracts.test.mjs
node --test tests/mobile-password-recovery.test.mjs tests/mobile-recovery-isolation.test.mjs
```

Les tests de récupération exécutent le SDK Supabase réel avec HTTP et stockage
natif simulés. `JURIS_RECOVERY_TEST_SDK_ROOT` permet de sélectionner un dossier
contenant la version du SDK à qualifier ; sans cette option ils utilisent les
dépendances de la racine. Ils ne constituent pas une preuve de livraison native
ou de disponibilité du fournisseur.

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
