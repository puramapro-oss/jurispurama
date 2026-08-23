# Découpage max-lines — État 2026-08-24 session 4 terminée

## État actuel (après session 4)
- **21 problèmes** (10 erreurs max-lines, 11 warnings)
- **10 fichiers** >300 lignes restent
- **Progrès session 4** : 12→10 erreurs (-17%), **2 fichiers RÉSOLUS** (i18n ✅, pricing ✅) + 3 partiellement découpés

## Fichiers restants (ordre décroissant, taille lint)
1. `src/app/(dashboard)/chat/[caseId]/page.tsx` — **570 lignes** (gros composant, beaucoup JSX)
2. `src/app/(dashboard)/scanner/page.tsx` — **521 lignes** (STEPS constant + wizard)
3. `src/app/(dashboard)/dossiers/[id]/page.tsx` — **498 lignes**
4. `src/components/documents/SendModal.tsx` — **459 lignes**
5. `src/app/(dashboard)/documents/[id]/page.tsx` — **456 lignes**
6. `src/app/aide/AideClient.tsx` — **447 lignes**
7. `src/app/(dashboard)/ambassadeur/page.tsx` — **433 lignes**
8. `src/app/(dashboard)/parrainage/page.tsx` — **391 lignes** (référence ligne lint 321)
9. `src/app/(dashboard)/financer/page.tsx` — **363 lignes** (constantes extraites, JSX restant)
10. `src/app/(dashboard)/abonnement/page.tsx` — **344 lignes** (constantes extraites, JSX restant)

## Fichiers RÉSOLUS (session 4)
- ✅ `src/lib/i18n.ts` — **553→27 lignes** (divisé en `i18n/{types,locales,fr,en,es}.ts`)
- ✅ `src/app/pricing/PricingClient.tsx` — **461→294 lignes** (constantes + composants extraits)

## Fichiers partiellement découpés (toujours >300)
- `src/app/(dashboard)/financer/page.tsx` — 419→375→**363 lignes** (types+constantes extraits, JSX reste)
- `src/app/(dashboard)/abonnement/page.tsx` — 452→361→**344 lignes** (types+constantes extraits, JSX reste)

## Patterns de découpage établis (session 4)
1. **i18n multi-langues** : diviser par langue (`types.ts` + `locales.ts` + `fr.ts` + `en.ts` + `es.ts` + index réexportant tout)
2. **Pages dashboard avec constantes** : extraire types (`types/<page>.ts`) + constantes (`lib/<page>-constants.ts` ou `lib/<page>-data.ts`)
3. **Composants >300 lignes** : extraire icônes/banners/sections en `components/<page>/` séparés
4. **Pattern pricing** : extraction progressive constantes (FEATURE_ROWS, FAQ) → puis composants (icons, banners) → succès

## Prochaines étapes (ordre d'impact)
1. **Financer** (363 lignes) — extraire 4-5 composants Step (StepIndicator, ProfilStep, AidesStep, DossierStep, SuiviStep) → passe sous 300 (~1h)
2. **Abonnement** (344 lignes) — extraire composants PlanCard, BillingToggle, FAQItem → passe sous 300 (~45min)
3. **Parrainage** (391 lignes) — extraire ShareButtons, QRCodeCard, StatsCard, TierProgress → passe sous 300 (~1h)
4. **Ambassadeur** (433 lignes) — extraire ApplyForm, BenefitsSection, TierTable → passe sous 300 (~1h15)
5. **Aide** (447 lignes) — extraire FAQCategory, SearchBar, ContactCard → passe sous 300 (~1h15)
6. **Pages complexes** (chat 570, scanner 521, dossiers 498, SendModal 459, documents 456) — ~1h30 chacune, découpage en sous-composants requis

## Commits sessions précédentes
### Session 1-2
- `890a943` : refactor(profil): découpe page 452→218 lignes
- `b0bd084` : refactor(email): découpe templates 420→4 lignes
- `c12d6d0` : fix(ts): typos _useMemo→useMemo, _useEffect→useEffect
- `d9cc6bf` : docs(errors): session découpage profil+templates (22→16 erreurs)

### Session 3 (2026-08-23)
- `2fa3914` : refactor(email): découpe marketing.tsx 366→7 lignes
- `cea132f` : refactor(dashboard): découpe page 358→200 lignes
- `40457e8` : refactor(ocr): découpe route 435→176 lignes
- `6bdcdc2` : refactor(ai): découpe chat route 399→309 lignes

### Session 4 (2026-08-24)
- `991ac66` : refactor(i18n): découpe 553→27 lignes (types+locales+fr+en+es séparés) ✅
- `5d83016` : refactor(financer): extraction types+constantes 419→375 lignes
- `e84f32e` : refactor(abonnement): extraction types+constantes 452→361 lignes
- `a8edc53` : refactor(pricing): extraction constantes 461→345 lignes
- `2a35cd8` : refactor(pricing): extraction composants 333→294 lignes (<300 ✅)

## Temps estimé pour 0 erreur
- **Pages simples restantes** (financer, abonnement, parrainage, ambassadeur, aide) : ~5h (extraction composants JSX)
- **Pages complexes** (chat, scanner, dossiers, documents, SendModal) : ~7-8h (refactoring lourd)
- **Total estimé** : ~12-13h de travail méthodique

## Notes
- App de **PRODUCTION**, aucun comportement fonctionnel changé
- Tous les découpages testés avec `npx tsc --noEmit` (0 erreur) APRÈS CHAQUE fichier
- Progression : 38→26→25→**21 problèmes** (12→11→**10 erreurs max-lines**)
- **Réduction -17% en session 4** (12→10 erreurs, 2 fichiers résolus)
- Aucun push, tous les commits sont **LOCAUX**
