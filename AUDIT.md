# JurisPurama — AUDIT 2026-05-02

État live : https://jurispurama.purama.dev (200 ✅), 61 routes.

## ✅ Ce qui marche
- Auth Supabase (email + Google OAuth via auth.purama.dev) — routes 307 vers /login OK
- Stripe live : 4 plans (Essentiel/Pro/Avocat/Cabinet) + webhook + price IDs en env
- Chat SSE streaming Anthropic claude-sonnet-4 — `/api/ai/chat` fonctionnel
- MessageBubble : markdown polish + avatars + cursor stream + code styling
- ChatInput : auto-grow + scan OCR + raccourcis clavier
- Signature Art.1366 (canvas + OpenTimestamps blockchain) — mieux que DocuSeal
- AR24 lib avec fallback `simulated` mode quand `AR24_API_KEY` absent
- Tokens design : `--justice / --gold / --bg-void / --border` + glass cards
- 12 domaines juridiques en constants
- Mobile Expo prêt (P8)

## 🔴 Bugs critiques (à fixer Phase C/E)
1. **Actions chat débranchées** — `src/app/(dashboard)/chat/[caseId]/page.tsx:303-313` → `sign`, `send_email`, `send_recommande`, `book_appointment` retournent un `toast.info("sera active dans la prochaine mise à jour")` alors que les endpoints `/api/documents/[id]/sign`, `/send-email`, `/send-recommande` EXISTENT et fonctionnent. → **Brancher les actions sur les routes existantes via redirect vers `/documents/[id]`**
2. **`book_appointment` action** — BRIEF §7 dit JurisIA ne dit JAMAIS "consultez un avocat" → l'action ne devrait pas être proposée → retirer du système prompt et de `ActionButtons`
3. **Sidebar wellness hors-domaine** — `Sidebar.tsx:14-20` contient `breathe` (🌬️ Respiration) + `gratitude` (🙏 Gratitude) → cabinet d'avocat ≠ wellness → retirer
4. **Sidebar 15 items** — trop dense pour un cabinet premium → réduire à 7 essentiels
5. **`DOCUSEAL_API_KEY` / `AR24_API_KEY` absents** de `.env.local` → mode simulé en prod (pas de vraie envoi recommandé) → vérifier si voulu, sinon obtenir clés AR24 pro (compte SIRET Purama)

## 🟠 Design instable (cause "ça bouge")
6. **`h-13` invalide Tailwind v4** + override `style={{ height: '56px' }}` inline — `Hero.tsx:69, 82` → conflit silencieux, hauteur potentiellement incohérente
7. **Layout chat mobile cassé** — `chat/[caseId]/page.tsx:439` `h-[calc(100vh-6rem)]` → ne soustrait pas BottomTabBar (~64px) + safe-area-inset-bottom + sticky NotificationBell header (~40px) → chat coupé en bas, input caché derrière les tabs
8. **Sticky header dashboard inutile** — `(dashboard)/layout.tsx:13-15` un header sticky 40px avec UNIQUEMENT NotificationBell à droite → 40px gâchés sur mobile
9. **Hero padding-top excessif** — `pt-28 sm:pt-36 md:pt-44` (112/144/176px) → trop d'air avant le H1
10. **Layout chat 2 colonnes seulement** — pas la sidebar dossiers gauche promise ; juste chat + CaseSidebar à droite. Manque la colonne dossiers récents permanente
11. **Dashboard 10 sections empilées** — `Affirmation + 3 blocs (parrainage/ambassadeur/cross-promo) + alerte critique + 3 stats + 2 cards profil/docs + CTA + dossiers + 12 domaines + ImpactDashboard + SocialFeed + Flywheel` → scroll infini, pas focused cabinet d'avocat
12. **Pas de système d'élévation strict** — `glass` + `glass-hover` partout sans hiérarchie subtle/raised/floating/modal
13. **Pas de `tabular-nums`** sur montants Euro → décalage visuel dans `formatEuros`

## 🟡 Responsive (priorité user)
14. **Chat tablet 768-1023px** — `chat/[caseId]/page.tsx:439` `lg:flex-row` → en dessous de 1024px CaseSidebar passe en pleine largeur SOUS le chat, layout cassé
15. **Touch targets** — sidebar items `py-2.5 text-sm` → ~36px de hauteur, sous les 44px Apple HIG
16. **Aucun `clamp()` sur titres** → débordement potentiel sur iPhone SE 375px avec `text-4xl`

## 🟢 Note
- DocuSeal mentionné dans BRIEF mais **remplacé par signature canvas Art.1366 CC + OpenTimestamps** → décision validée (zéro dépendance externe, conforme légalement, blockchain proof). On garde ce stack et on ne ré-intègre pas DocuSeal.
- Stripe webhook prod live (vérifié par smoke test précédent — `dpl_24mXRMnLMBXweExS7Cvv6axCUpKY READY`)

## Plan correctif (rappel des phases)
- **B** Design system premium (typo, espacement, élévations, composants atomiques)
- **C** Refonte chat 3 col + branchement actions sign/send_email/send_recommande
- **D** Refonte landing/dashboard/dossiers/documents (focus cabinet avocat, retirer breathe/gratitude/wealth-engine fluff)
- **E** Vérifier OAuth Google live + AR24 mode + Stripe webhook
- **F** Responsive 375→1920 Playwright snapshots
- **G** Tests + deploy

## Phase E — Verdict APIs prod (audit live 2026-05-02)

| Service | Statut prod | Détail |
|---|---|---|
| Google OAuth | ✅ ENABLED | VPS `auth.purama.dev/auth/v1/settings` retourne `"google": true`. Flow `/authorize?provider=google` → `Allow: GET` (200 attendu sur GET, 405 sur HEAD = normal). |
| Email signup | ✅ ENABLED | `"email": true`, `mailer_autoconfirm: true` (pas de double opt-in requis). |
| Stripe Secret Key | ✅ encrypted Vercel | Production OK. ⚠️ La copie dans `.env.local` est invalide/rotated → dev local cassé pour Stripe (à mettre à jour). |
| Stripe Webhook Secret | ✅ encrypted Vercel | Production + preview + development. |
| Anthropic API | ✅ encrypted Vercel | Production. |
| Resend (email) | ✅ encrypted Vercel | Production. |
| AR24 (recommandé) | ⚠️ ABSENT prod | `AR24_API_KEY` non poussée. Lib `src/lib/ar24.ts` fallback automatique en mode `simulated` (tracking number `SIM-...`, AR auto-confirmé J+2). Flow utilisateur OK, **mais aucun vrai courrier physique envoyé**. Action externe : ouvrir compte AR24 pro avec SIRET PURAMA, ajouter `AR24_API_KEY` + `AR24_MODE=live` via `vercel env add`. |
| DocuSeal | N/A — REMPLACÉ | Signature canvas Art.1366 CC + OpenTimestamps blockchain. Zéro dépendance externe, conforme légalement. Pas besoin de DocuSeal. |
| Supabase RLS | À auditer manuellement | Tables `jurispurama_*` ont RLS policies depuis P1. Prochain audit : `gsd-secure-phase`. |

### Smoke tests live
- `GET /api/status` → 200 `{"ok":true,"app":"jurispurama","env":"production"}`
- `POST /api/stripe/webhook` (no signature) → 200 (catch global, anti-retry-storm)
- `POST /api/ai/chat` (no auth) → 401 (attendu)
- 12/12 routes publiques 200 ✅
- 11/11 routes auth-protected 307 → /login ✅

### Action externe (hors codebase)
**AR24 pro account** : pour passer du mode simulated au mode live, créer un compte pro AR24 (https://ar24.fr/inscription) avec SIRET PURAMA, récupérer la clé API, puis :
```bash
vercel env add AR24_API_KEY production --token $VERCEL_TOKEN --scope puramapro-oss
vercel env add AR24_MODE production --token $VERCEL_TOKEN  # = "live"
vercel --prod  # redeploy
```
