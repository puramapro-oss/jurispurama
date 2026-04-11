# Google Play Store — JurisPurama (3 minutes)

> Une fois ces 3 étapes faites, **chaque `git push origin main`** déclenchera automatiquement
> `eas build` (Android App Bundle) + `eas submit` → release **draft** sur Google Play Console.

## 1 · Créer la fiche app (90 secondes — une seule fois)

1. Va sur https://play.google.com/console
2. **Créer une application**
   - Nom : `JurisPurama`
   - Langue par défaut : `Français (France)`
   - Type : `Application`
   - Gratuite ou payante : `Gratuite`
   - Coche les 2 déclarations
   - **Créer une application**
3. Dans `Configuration de l'application` → **Détails du store** :
   - Nom court : `JurisPurama`
   - Description courte : `Ton avocat IA personnel, 24/7 dans ta poche.`
   - Description complète : copier depuis `store.config.json` (clé `apple.info.fr.description`)
   - Icône : `assets/icon.png` (1024×1024)
   - Image principale : `assets/feature-graphic.png` (1024×500)
   - Catégorie : `Business`
4. **Confidentialité** :
   - URL : `https://jurispurama.purama.dev/politique-confidentialite`
5. **Public et contenu** : remplir le questionnaire (12 ans et plus, pas de pub)

## 2 · Récupérer le `package name` (déjà fixé)

Le `package` Android est `dev.purama.jurispurama` (déjà dans `app.json`).
Aucune action requise — il sera créé automatiquement au premier upload.

## 3 · Activer l'API + service account (90 secondes — une seule fois)

1. https://console.cloud.google.com → ton projet (ou nouveau projet)
2. **APIs & Services** → activer **Google Play Android Developer API**
3. **Identifiants** → **Créer un compte de service**
   - Nom : `eas-submit-purama`
   - Rôle : `Service Account User`
   - **Créer**
4. Sur le compte créé → onglet **Clés** → **Ajouter une clé** → JSON
   → télécharge le fichier `google-service-account.json`
5. Renomme et place-le ici : `~/purama/jurispurama/mobile/google-service-account.json`
   (déjà gitignored par eas.json)
6. Retourne sur Play Console → **Utilisateurs et autorisations** → **Inviter** :
   - Email : `eas-submit-purama@<TON_PROJET>.iam.gserviceaccount.com`
   - Rôle : `Administrateur de version` (ou `Admin` pour démarrer)
   - Cocher l'app `JurisPurama`
7. **Inviter** — l'invitation est instantanée pour les service accounts.

## 4 · C'est tout

```bash
git add .
git commit -m "feat(mobile): JurisPurama Android v1.0"
git push origin main
```

→ GitHub Action lance `eas build --platform android --profile production`
→ Au build done, `eas submit --platform android --profile production`
→ release **draft** sur Play Console (track : `production`, status : `draft`)
→ tu reçois un email Expo + un email Google Play
→ valide manuellement la première soumission (review Google : 1-7 jours)
→ après la 1ʳᵉ release validée, tout est 100 % auto.

## OTA updates (sans review)

Pour push une mise à jour JS sans repasser la review Google :
```bash
git commit -m "fix: cta button color [ota]"
git push origin main
```
Le tag `[ota]` déclenche `eas update --branch production` au lieu d'un build.
Live en moins de 5 minutes sur tous les téléphones installés.

---

**Crédentiels stockés dans EAS (chiffrés)** : `EXPO_TOKEN` (déjà dans `~/purama/CLAUDE.md`).
**Apple côté iOS** : voir ` eas submit --platform ios` dans `eas.json` (auto via Apple ID + Team ID).
