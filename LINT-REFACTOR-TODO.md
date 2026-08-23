# Découpage max-lines — État 2026-08-23 16h25

## État actuel
- **26 problèmes** (16 erreurs max-lines, 10 warnings)
- **15 fichiers** >300 lignes restent

## Fichiers restants (ordre décroissant)
1. `src/app/(dashboard)/chat/[caseId]/page.tsx` — **626 lignes** (1 export, beaucoup de JSX)
2. `src/app/(dashboard)/scanner/page.tsx` — **564 lignes** (STEPS constant + 1 export)
3. `src/lib/i18n.ts` — **553 lignes** (16 langues, fr/en/es complets)
4. `src/app/(dashboard)/dossiers/[id]/page.tsx` — **498 lignes**
5. `src/app/pricing/PricingClient.tsx` — **461 lignes**
6. `src/components/documents/SendModal.tsx` — **459 lignes**
7. `src/app/(dashboard)/documents/[id]/page.tsx` — **456 lignes**
8. `src/app/(dashboard)/abonnement/page.tsx` — **452 lignes**
9. `src/app/aide/AideClient.tsx` — **444 lignes**
10. `src/app/(dashboard)/ambassadeur/page.tsx` — **433 lignes**
11. `src/app/(dashboard)/financer/page.tsx` — **401 lignes**
12. `src/app/(dashboard)/parrainage/page.tsx` — **391 lignes** (référencé dans erreurs précédentes mais apparemment disparu de la liste actuelle)
13. `src/app/api/ocr/route.ts` — **369 lignes**
14. `src/app/(dashboard)/dashboard/page.tsx` — **358 lignes**
15. `src/lib/email/marketing.tsx` — **366 lignes** (5 exports : WelcomeEmail, Day1TipEmail, Day7UpgradeEmail, WinbackEmail, ReferralSuccessEmail)
16. `src/app/api/ai/chat/route.ts` — **345 lignes**

## Patterns de découpage établis
1. **Email templates** : extraire chaque fonction email dans son fichier + `styles.ts` commun (fait sur `templates.tsx`, à faire sur `marketing.tsx`)
2. **Pages dashboard** : extraire composants UI (CircularProgress, ProfileField, ProfileSection) + constantes (FIELD_META) dans `components/<page>/` + `lib/<page>-fields.ts`
3. **Routes API** : extraire `helpers.ts` + `handlers.ts` (fait sur stripe/webhook)
4. **i18n** : diviser par langue (`i18n/locales.ts` + `i18n/fr.ts` + `i18n/en.ts` + `i18n/es.ts` + `i18n.ts` juste les types+exports)

## Prochaines étapes (ordre suggéré)
1. **marketing.tsx** (366 lignes, 5 exports) — même pattern que templates → 5 fichiers séparés + styles réutilisés → ~30min
2. **dashboard/page.tsx** (358 lignes) — extraire stats/cards/sections en composants → ~30min
3. **ocr/route.ts** (369 lignes) — extraire helpers → ~20min
4. **ai/chat/route.ts** (345 lignes) — extraire handlers → ~20min
5. **i18n.ts** (553 lignes) — diviser par langue (plus long, ~1h)
6. **Pages dashboard complexes** (chat 626, scanner 564, dossiers 498, etc.) — cas par cas, 30-60min chacune

## Commits de cette session
- `890a943` : refactor(profil): découpe page 452→218 lignes (profile-fields.ts+3 composants)
- `b0bd084` : refactor(email): découpe templates 420→4 lignes (4 composants+styles séparés)
- `c12d6d0` : fix(ts): typos _useMemo→useMemo, _useEffect→useEffect, _devices→devices
- `d9cc6bf` : docs(errors): session 2026-08-23 découpage profil+templates (22→16 erreurs max-lines)

## Temps estimé pour 0 erreur
- **Routes API** (ocr, ai/chat) : ~40min
- **Email marketing** : ~30min
- **Dashboard pages simples** (dashboard, financer, parrainage, ambassadeur, abonnement) : ~2h30
- **Pages complexes** (chat, scanner, dossiers, documents, aide, pricing, SendModal) : ~4-5h
- **i18n** : ~1h
- **Total** : ~9-10h de découpage méthodique

## Notes
- App de **PRODUCTION**, aucun comportement fonctionnel changé
- Tous les découpages testés avec `npx tsc --noEmit` (0 erreur)
- `npm run lint` passe de 38→26 problèmes (-32%)
- Aucun push, tous les commits sont **LOCAUX**
