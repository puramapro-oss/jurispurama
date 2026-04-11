# JurisPurama — Progress

## P1 — TERMINÉ ✅ (2026-04-11)
Scaffold, Auth, DB, Landing, Legal pages, Deploy. Voir historique git commit b4e69df.

## P2 — TERMINÉ ✅ (2026-04-11)

### Livré
Chat JurisIA en streaming SSE avec dossiers, messages, actions rapides, pages dossiers filtrables et détail timeline.

### Fichiers créés (P2)

**src/lib/**
- `claude.ts` — wrapper Anthropic SDK avec lazy init `getAnthropic()`, `askClaude()`, `streamClaude()` (async generator), `withRetry()`. Modèle par défaut: `claude-sonnet-4-20250514`, fast: `claude-haiku-4-5-20251001`. Support images base64 pour Vision.
- `prompts/jurisia.ts` — `JURISIA_SYSTEM_PROMPT` avec rôles, règles, processus, disclaimer et 12 domaines détaillés (Art. 429 CPP, Art. L.121-3 Code route, Art. L.221-18 Code conso, Art. 1641 CC, Art. 6 loi 6/7/1989, barème Macron Art. L.1235-3, etc.). Contrat de sortie structuré `<juris-meta>{...}</juris-meta>` pour phase/case_type/sub_type/success_probability/strategy/deadlines/estimated_savings/next_actions. Helpers `buildUserContext()`, `composeSystemPrompt()`, `extractJurisMeta()`.
- `case-helpers.ts` — `CASE_TYPE_LABELS`, `CASE_STATUS_LABELS`, `CASE_PHASES`, `formatRelativeDate()`, `daysUntil()`, `formatDeadline()`, `formatEuros()`.

**src/app/api/**
- `ai/chat/route.ts` — POST SSE streaming, runtime nodejs, maxDuration 120. Auth server supabase, quota free (3 dossiers/mois), création auto du case si pas caseId, persist user message, load history (20), inject legal profile, stream Claude, detect `<juris-meta>` dans buffer, flush tail avant meta tag pour éviter leak, persist assistant message sans bloc meta, apply meta to case (status/type/sub_type/probability/strategy/deadlines/money_saved). Event types: `case_created`, `text`, `done`, `error`.
- `cases/route.ts` — GET (list + filtres status/type/q), POST (create manuel avec Zod).
- `cases/[id]/route.ts` — GET (case + messages + documents), PATCH (status/summary/sub_type), DELETE (soft archive).

**src/components/ui/**
- `Badge.tsx` — 9 variants (justice, gold, green, amber, red, blue, purple, gray, default), 2 sizes.
- `Progress.tsx` — barre gradient justice→or avec label optionnel.
- `Tabs.tsx` — onglets scrollables avec count badges.
- `Skeleton.tsx` — loading placeholder animé.

**src/components/chat/**
- `MessageBubble.tsx` — bulles chat avec react-markdown + remark-gfm, rendu dédié pour h1/h2/h3, ul/ol, strong, code (articles loi en or), blockquote, table. Avatar ⚖️ assistant / 👤 user. Streaming cursor.
- `ChatInput.tsx` — textarea auto-grow (max 260px), Entrée envoie, Maj+Entrée nouvelle ligne, bouton send avec loading spinner, compteur caractères.
- `PhaseStepper.tsx` — stepper horizontal 6 phases (Diagnostic→Analyse→Document prêt→Signé→Envoyé→Résolu) avec badge actif gradient.
- `CaseSidebar.tsx` — panneau latéral avec type/statut/probabilité/money_saved/deadlines (critique rouge si ≤3j)/actions rapides (generate_document, sign, send_recommande, view_full, new_case).
- `ActionButtons.tsx` — boutons contextuels sous message assistant (generate_document, sign, send_email, send_recommande, book_appointment, close).

**src/app/(dashboard)/chat/**
- `page.tsx` — "Nouveau dossier" : sélection domaine (12 cards LEGAL_DOMAINS), ChatInput, liste 5 derniers dossiers. Stocke message dans sessionStorage puis navigue vers `/chat/new`.
- `[caseId]/page.tsx` — PIÈCE MAÎTRESSE. Interface chat responsive desktop (chat + sidebar fixed) / mobile (stack). Fetch dossier + messages, gestion fetch+reader ReadableStream du SSE (event SSE → update state), auto-scroll intelligent (stoppe si user scrolle vers le haut), phase stepper, action buttons contextuels, support `new` sentinel avec auto-send du pending_message depuis sessionStorage. History.replaceState vers `/chat/[caseId]` après création.

**src/app/(dashboard)/dossiers/**
- `page.tsx` — liste complète filtrable. Tabs statut (Tous, Diagnostic, Analyse, Document prêt, Envoyé, Résolu) avec count, filtre type, recherche texte, tri (recent/oldest/probability). Cards avec icon/type/status/summary/probability/money_saved/relative date. Empty state + CTA.
- `[id]/page.tsx` — détail complet. Header avec breadcrumb, type, sub_type, summary, badges, dates. Boutons "Reprendre conversation" + "Archiver". PhaseStepper. 3 stats cards (probability, money_saved, next deadline). Tabs: Timeline (messages chronologiques), Échanges (liste messages complète), Documents (vide pour P3), Délais (critique J≤3), Gains (compteur money_saved).

**src/app/(dashboard)/dashboard/**
- `page.tsx` — mis à jour avec vraies stats live : dossiers actifs count, money_saved total, prochaine deadline, alerte critique en rouge pour deadlines ≤3j, liste 3 derniers dossiers avec probability bar.

**src/app/(dashboard)/{profil,abonnement,parrainage}/page.tsx** — stubs propres pour que les liens sidebar ne 404 pas. Abonnement affiche les 4 plans PLANS avec "Bientôt disponible" (Stripe P5). Parrainage affiche code + lien copiable + paliers.

### Validations
- `npx tsc --noEmit` → 0 erreur
- `npm run build` → ✓ Compiled, 20 static + dynamic pages
- `grep TODO|console.log|placeholder|Lorem|any:` → 0 match
- `grep sk_live|password|secret` → seulement auth forms légitimes et CRON_SECRET env var

### Détails techniques importants

**SSE streaming + parsing `<juris-meta>`**
Le pattern: on accumule `fullText` et on maintient un `emittedCount`. Tant qu'on n'a pas vu `<juris-meta>`, on émet seulement `fullText.slice(emittedCount, safeEnd)` où `safeEnd = fullText.length - len('<juris-meta>')` — ça empêche l'émission d'un prefix du tag si la chunk se coupe au milieu. Dès qu'on détecte le tag, on émet le texte jusqu'à l'index du tag puis on stoppe l'émission (`metaBuffering = true`) mais on continue à accumuler `fullText`. À la fin, on parse le bloc meta, on clean le texte, on persist via service client (pour contourner RLS après auth faite), et on update le case avec le patch partiel.

**Lazy init Anthropic**
`getAnthropic()` retourne un singleton créé au premier appel. Sans ça, Vercel Turbopack évalue le module au build et crash car `ANTHROPIC_API_KEY` n'est pas encore injectée.

**Sentinel `new` pour nouveau dossier**
`/chat/new` est un caseId spécial. Le composant détecte et skip le fetch initial, attend un `jurispurama:pending_message` dans sessionStorage, envoie auto, puis à réception du `case_created` du SSE, fait `window.history.replaceState()` vers `/chat/[realId]`. Évite un round-trip pre-chat.

**Quota free 3 dossiers/mois**
Dans `/api/ai/chat`, avant création d'un nouveau case, on `count` les cases du mois pour ce user (`created_at >= startOfMonth`). Si ≥ 3 et `subscription_plan='free'`, on renvoie 402.

**Streaming UI**
`MessageBubble` affiche un cursor pulsant `animate-pulse` tant que `streaming=true`. Le parent garde un ref `autoScrollRef.current` qui track si l'user est "near bottom" (< 120px du bas). Si oui, chaque update scroll auto. Sinon, respect du scroll user.

### Prêt pour P3
- Profil juridique : page stub existe, tables `jurispurama_legal_profiles` créées, CRUD à construire avec sections (identité / véhicule / emploi / logement / banque).
- Scanner OCR : utiliser `@anthropic-ai/sdk` avec `ImageAttachment` déjà supportée dans `ChatMessage.images`. Endpoint `/api/ocr` upload + analyse.
- Génération PDF : jspdf ou @react-pdf/renderer. Templates dynamiques par `type` case (contestation ANTAI, mise en demeure L.1235-3, etc.). Pré-remplissage depuis legal profile.

### Learnings P2
| 2026-04-11 | JURISPURAMA | SSE avec meta block à la fin : maintenir un `safeEnd = fullText.length - len('<juris-meta>')` pour émettre en sécurité sans leaker un prefix du tag si la chunk stream se coupe au milieu du tag. | Stream propre + meta parsing fiable. |
| 2026-04-11 | JURISPURAMA | Sentinel `/chat/new` + sessionStorage pending_message + history.replaceState après `case_created` SSE event | Évite round-trip API avant chat, garde l'URL propre. |
| 2026-04-11 | JURISPURAMA | Next 16 dynamic params sont `Promise<{id:string}>` — `await ctx.params` obligatoire dans les handlers. | Typescript strict. |
