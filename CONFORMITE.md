# CONFORMITE.md — Audit NIYAMA jurispurama

Date : 2026-08-23
Référentiel : `/Users/matissdornier/purama/NIYAMA-BRIEF.md` (§7 checklist) + famille 5 "Contenu & IA" + piège spécifique §3 JURIS.
Méthode : lecture directe des fichiers sources (`src/`), preuves fichier:ligne, lecture seule côté code applicatif — ce rapport n'a modifié aucun fichier applicatif.

## VERDICT : ROUGE — 11 gaps

Le socle RGPD/CGU/cookies est solide et réellement fonctionnel (pas de stub). Mais le point central de cet audit — la frontière NIYAMA §3 JURIS ("information juridique générale seulement, la consultation personnalisée est réservée aux avocats, la frontière est codée") — n'est **pas codée**. Le system prompt fait explicitement l'inverse (interdiction de recommander un avocat + production systématique d'une stratégie personnalisée chiffrée), et plusieurs textes produit ("l'avocat qui ne dort jamais", "remplace ton avocat à 99%", plan "Avocat Virtuel") renforcent cette confusion plutôt que de la contenir. Il n'existe par ailleurs aucune infrastructure de scan lexical mécanique (NIYAMA §0.3), le disclaimer IA n'est pas affiché sur l'écran de conversation réel, et le médiateur de la consommation n'est pas désigné.

---

## 1. Pages légales

**VERT** — les 4 pages existent et ont un contenu substantiel réel (pas de placeholder) :
- `src/app/mentions-legales/page.tsx` (153 lignes) — éditeur, hébergement, PI, avertissement IA, médiation
- `src/app/cgu/page.tsx` (170 lignes) — 10 sections dont "5. Limites du service IA"
- `src/app/cgv/page.tsx` (195 lignes) — justifiée : paiement Stripe réel présent (`STRIPE_SECRET_KEY` utilisé, plans payants `src/lib/constants.ts:24-70`). Contient la clause rétractation Art L221-28 3° (§9.5 CLAUDE.md).
- `src/app/politique-confidentialite/page.tsx` (229 lignes) — responsable traitement, DPO, sous-traitants (Vercel, Anthropic, Stripe, Resend), droits RGPD, durées de conservation.

**Gap G9 (mineur)** : `src/app/mentions-legales/page.tsx:119-130` et `src/app/cgv/page.tsx:167-178` déclarent toutes les deux "en cours de désignation" pour le médiateur de la consommation — cohérent entre les 2 pages mais le socle NIYAMA §1 exige un médiateur effectivement désigné. Non bloquant isolément mais listé comme gap.

## 2. Bandeau consentement cookies

**VERT — réellement fonctionnel.**
- Monté globalement : `src/app/layout.tsx:8,171` (`<CookieBanner />`).
- `src/components/shared/CookieBanner.tsx` → délègue à `src/lib/legal/components/CookieConsentBanner` avec sync serveur `onConsent`.
- `src/lib/legal/hooks/useCookieConsent.ts` : implémentation réelle via `useSyncExternalStore` + `localStorage` (clé `purama_cookie_consent_v1`), fonctionne pour visiteur anonyme, écoute les changements cross-tab (`storage` event). Pas un composant décoratif.
- Sync DB pour utilisateur connecté : `src/app/api/legal/cookie-consent/route.ts` — upsert réel dans `cookie_consents` (necessaire/mesure/marketing/updated_at).

## 3. Preuve d'acceptation CGU horodatée

**VERT — écrit réellement en base.**
`src/app/api/legal/accept/route.ts:43-53` : upsert dans `legal_acceptances` avec `user_id`, `doc_type`, `version` (calculée **côté serveur** depuis `CURRENT_LEGAL_VERSIONS`, jamais envoyée par le client — anti-falsification explicitement commenté ligne 7-9), `ip`, `user_agent`, `accepted_at`. Preuve d'exécution réelle en base : `ERRORS.md:6` (2026-08-23) — migration appliquée via pooler Supavisor après blocage SSH, "vérifiée end-to-end (tables créées, GRANTs corrects, `curl` REST 200 sur `/rest/v1/legal_acceptances`)".

**Gap G11 (mineur)** : aucun fichier de migration SQL versionné dans le repo ne définit `legal_acceptances` / `cookie_consents` / `account_deletion_requests` (recherché dans `schema*.sql` — absent). Le schéma a été appliqué en ad hoc via psql/pooler d'après `ERRORS.md`, non tracé dans le repo. Traçabilité affaiblie même si le résultat en base est prouvé.

## 4. Page "Ma mémoire" — export RGPD + suppression de compte

**VERT — réel, pas un stub.**
- `src/app/(dashboard)/settings/ma-memoire/page.tsx` — lit `legal_acceptances` + `account_deletion_requests`, redirige si non connecté.
- `src/app/api/legal/my-data/route.ts` — export JSON complet, lit réellement toutes les tables métier (`jurispurama_users`, `jurispurama_legal_profiles`, `jurispurama_cases`, `jurispurama_messages`, `jurispurama_documents`, `jurispurama_payments`, `jurispurama_referrals`, `legal_acceptances`, `cookie_consents`), commentaire explicite ligne 3-4 référençant "PIEGES.md export/RGPD absent malgré CLAUDE.md" comme piège évité.
- `src/app/api/account/delete/route.ts` — POST programme suppression à J+30 (grâce RGPD art.17), DELETE annule ; rate-limité (`rateLimit`), confirmation stricte `'DELETE_MY_ACCOUNT'` via Zod literal.

## 5. Déclaration IA sur chaque UI de chat IA réelle

**ORANGE — partielle.** 3 interfaces de chat IA réelles identifiées :

| UI chat | Fichier | AIDisclosure affiché ? |
|---|---|---|
| Démarrage nouveau dossier | `src/app/(dashboard)/chat/page.tsx:78` | **Oui** — `<AIDisclosure appName={APP_NAME} .../>` rendu |
| Conversation dossier existant (écran réel de discussion) | `src/app/(dashboard)/chat/[caseId]/page.tsx:15` | **Non** — `AIDisclosure` est **importé mais jamais rendu** dans les 626 lignes du fichier (`grep -n "AIDisclosure"` ne matche que la ligne d'import). Import mort. **C'est l'écran où se déroule réellement la conversation avec JurisIA.** |
| Chatbot SAV / aide (`/aide`) | `src/app/aide/AideClient.tsx` | **Non explicitement** — aucun import `AIDisclosure`. Le widget affiche "JurisIA — Support" (ligne 344) et "Pour un conseil juridique, connecte-toi au chat JurisIA" (ligne 364), mais pas la phrase standard "Vous échangez avec l'assistant IA de {appName}, pas avec un humain" définie par le composant partagé `src/lib/legal/components/AIDisclosure.tsx:16`. |

Le composant `AIDisclosure.tsx` documente lui-même (ligne 9-11) qu'il doit être "placé visiblement en haut de toute interface de chat/assistant IA" — cette règle n'est pas respectée sur l'écran de conversation réel ni sur le SAV.

## 6. Lexique interdit

**ROUGE — 0 infrastructure mécanique + 4 occurrences trouvées en scan manuel.**

Aucun fichier de lexique interdit ni de scanner automatisé n'existe dans le repo (`find . -iname "*lexique*" -o -iname "*forbidden*" -o -iname "*lexicon*"` → 0 résultat, y compris au niveau écosystème `~/purama`). NIYAMA-BRIEF §0.3 exige "lexique interdit scanné mécaniquement sur tout le texte de chaque app" — absent. Scan manuel effectué à la place, occurrences trouvées :

- `src/lib/ecosystem.ts:18` — `"L'assistant juridique IA qui remplace ton avocat à 99 %. Contestation d'amende, mise en demeure, litige en 3 clics."` — rendu publiquement sur `/ecosystem` (`src/app/ecosystem/page.tsx:3,51`). Revendique explicitement le **remplacement** de l'avocat.
- `src/lib/i18n.ts:159` — `hero.title: "L'avocat qui ne dort jamais"` — affiché en H1 sur la page d'accueil (`src/components/landing/Hero.tsx:48`). La marque se désigne littéralement comme "l'avocat".
- `src/lib/constants.ts:61-64` — plan payant le plus cher nommé `label: 'Avocat Virtuel'` (39,99€/mois). Le produit est vendu sous le nom d'"avocat".
- Contradiction interne : `src/lib/i18n.ts:161` (hero.subtitle) affirme *"Un vrai dossier, pas une consultation"* pour tenter de contourner la loi du 31/12/1971, alors que `src/lib/constants.ts:31` (feature du plan gratuit) dit littéralement *"3 consultations IA par mois"*. Le produit se nomme lui-même "consultation" dans un texte et le nie dans un autre.

Ces éléments s'ajoutent au system prompt (point ci-dessous) pour montrer que la frontière métier n'est pas seulement mal affichée mais activement contredite par le copy produit.

## 7. Chiffres affichés vs FACTS.md

**ORANGE.**
- `COMPANY_INFO` (`src/lib/constants.ts:1-9`) : "SASU PURAMA", "8 Rue de la Chapelle, 25560 Frasne" — cohérent avec CLAUDE.md §10.
- Tarification (`src/lib/constants.ts:24-70`) : Gratuit 0€ / Essentiel 9,99€ / Pro 19,99€ / Avocat Virtuel 39,99€ (mensuel). **Ne correspond pas** à la ligne FACTS.md "Prix abonnement standard | 9,99€ / 49,99€ / 99,99€" (FACTS.md lui-même note cette ligne comme "référencée, non recopiée" depuis CLAUDE-2.md — autorité molle). À trancher : soit jurispurama a une grille dérogatoire légitime (justifiée par des paliers usage différents), soit c'est un écart Pilier 19 à corriger. Pas assez d'autorité dans FACTS.md pour trancher seul → signalé, non auto-corrigé (lecture seule).
- Prime de bienvenue CGV §7bis (`src/app/cgv/page.tsx:152-157`) : 100€ (25€ J+1, 25€ J+30, 50€ J+60), retrait bloqué 30j — cohérent avec CLAUDE.md §9.5 "Prime wallet only+retrait bloqué 30j+annulation<30j=prime déduite".

## 8. Migration SQL légale

**VERT avec réserve (voir gap G11 ci-dessus).**
`ERRORS.md:6` documente un blocage réel (SSH VPS port 22 refuse la connexion pendant la migration légale, alors que 443/5432 répondent) et sa résolution (pooler Supavisor externe, vérifié `curl` REST 200 sur `/rest/v1/legal_acceptances`, tables créées, GRANTs corrects). Le blocage est documenté le jour même comme exigé, avec cause + fix. Réserve : pas de fichier de migration versionné dans le repo pour ces 3 tables légales (`legal_acceptances`, `cookie_consents`, `account_deletion_requests`).

---

## Zoom obligatoire — frontière JURIS (NIYAMA-BRIEF §3)

> "information juridique générale seulement — la consultation personnalisée est réservée aux avocats ; la frontière est codée."

**Verdict : la frontière n'est pas codée. Le code fait l'inverse.**

Preuve : `src/lib/prompts/jurisia.ts`, system prompt `JURISIA_SYSTEM_PROMPT` (ligne 36-198) :
- Ligne 45 : *"Tu es TOUJOURS du côté du client. Tu cherches la meilleure stratégie pour qu'il gagne..."*
- Ligne 47 : **"Tu ne dis JAMAIS 'consultez un avocat' sauf obligation légale stricte (cour d'assises, cour d'appel en matière civile où l'avocat est obligatoire). Dans les autres cas, tu assumes le rôle."** — instruction explicite et documentée d'éviter la seule échappatoire prévue par la loi du 31/12/1971, et d'endosser le rôle du professionnel réglementé.
- Ligne 48 : *"Tu estimes TOUJOURS une probabilité de succès honnête en pourcentage"* — avis personnalisé chiffré, pas une information générale.
- `buildUserContext()` (lignes 210-288) injecte dans **chaque** appel système l'identité complète de l'utilisateur (nom, date/lieu de naissance, adresse, employeur, salaire net/brut, statut locataire, bailleur, loyer, IBAN) — c'est le substrat même d'une consultation personnalisée au sens juridique, pas une info générale déconnectée du cas.
- Le bloc `<juris-meta>` (lignes 173-197) impose une sortie structurée par dossier : `success_probability`, `strategy.recommended`, `deadlines`, `estimated_savings` — un avis juridique personnalisé et actionnable, généré systématiquement dès qu'une "analyse substantielle" est livrée.
- Le seul disclaimer prévu (lignes 69-70) n'apparaît **qu'une fois par nouveau dossier**, noyé dans le texte généré par le modèle lui-même (pas un élément d'UI structurel et permanent) — et sur l'écran de conversation réel (`/chat/[caseId]`), même le composant `AIDisclosure` prévu à cet effet n'est pas rendu (cf point 5, gap G7).
- Le copy produit renforce cette confusion plutôt que de la corriger (cf point 6 : "remplace ton avocat à 99%", "L'avocat qui ne dort jamais", plan "Avocat Virtuel", "consultations IA").

Conclusion : sur le papier (CGU §5, mentions légales, CGV §7) JurisPurama affirme ne pas fournir de "consultation juridique personnalisée au sens de la loi du 31 décembre 1971" — mais le comportement réellement codé du produit (system prompt + profil injecté + sortie structurée + naming) produit exactement cela, de façon systématique et sans garde-fou technique (pas de filtre, pas de détection, aucune logique applicative n'empêche ou ne requalifie une réponse trop personnalisée). Il n'y a aucune "frontière codée" — seulement un disclaimer textuel isolé et partiellement affiché.

---

## Récapitulatif des 11 gaps

| # | Gap | Sévérité | Preuve |
|---|---|---|---|
| G1 | Frontière JURIS non codée, system prompt l'inverse explicitement | **Critique** | `src/lib/prompts/jurisia.ts:45-48,210-288,173-197` |
| G2 | Lexique : "remplace ton avocat à 99%" | Majeur | `src/lib/ecosystem.ts:18` |
| G3 | Lexique : "L'avocat qui ne dort jamais" (H1 public) | Majeur | `src/lib/i18n.ts:159` |
| G4 | Lexique : plan nommé "Avocat Virtuel" | Majeur | `src/lib/constants.ts:61-64` |
| G5 | Contradiction "pas une consultation" vs "consultations IA" | Modéré | `src/lib/i18n.ts:161` vs `src/lib/constants.ts:31` |
| G6 | Aucune infrastructure de scan lexical mécanique | Majeur | recherche repo, 0 résultat |
| G7 | `AIDisclosure` importé mais jamais rendu sur l'écran de conversation réel | Majeur | `src/app/(dashboard)/chat/[caseId]/page.tsx:15` (0 usage JSX) |
| G8 | Chatbot SAV `/aide` sans déclaration IA explicite standardisée | Modéré | `src/app/aide/AideClient.tsx:344,364` |
| G9 | Médiateur de la consommation non désigné | Mineur | `src/app/mentions-legales/page.tsx:119-130`, `src/app/cgv/page.tsx:167-178` |
| G10 | Pricing (9,99/19,99/39,99€) ≠ FACTS.md (9,99/49,99/99,99€) | Modéré (à trancher) | `src/lib/constants.ts:39,51,64` vs `FACTS.md` |
| G11 | Aucune migration SQL versionnée pour les tables légales | Mineur | recherche `schema*.sql`, 0 résultat ; `ERRORS.md:6` |

VERDICT:jurispurama:ROUGE:11
