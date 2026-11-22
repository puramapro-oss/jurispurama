# Recherche d'aides : nettoyage des lectures — 22 novembre 2026

Base : `7bc5af6833a70b85cd6ed88927a20aae608608e5`. Périmètre produit : uniquement la lecture `/api/financer` de la page Financer.

## Observation et portée de la reproduction

Le callback acceptait encore une réponse ou une erreur après sa mise à l'écart. Quitter la page pendant une lecture laissait cette requête active ; une erreur tardive pouvait afficher le message global sur une autre page. Deux invocations contrôlées du vrai callback prouvent également qu'une ancienne réponse pouvait remplacer le résultat d'une invocation plus récente.

Cette seconde preuve est une qualification de concurrence du callback, pas la preuve d'un parcours utilisateur permettant de changer de profil pendant le chargement : `AidesMatching` masque alors le bouton Retour. Aucun contrôle de navigation n'est ajouté pour rendre artificiellement cette course accessible.

## Correctif minimal

Une nouvelle lecture annule la précédente. Les gardes après `fetch`, après le JSON, dans `catch` et dans `finally` ignorent la lecture annulée. Le nettoyage de l'effet annule sa requête lorsque l'étape 2 est quittée ou que la page est démontée.

Le déclenchement reste `step === 2 && (profil || situation)`. Paramètres GET, message français, sélection des aides et navigation sont conservés. Le texte depuis `toggleAide` jusqu'à la fin du composant est identique à la base. Aucune écriture, paiement, règle d'éligibilité, autorisation ou route serveur ne change.

## Vérifications exécutées

- Test des vrais callbacks extraits par AST : **11 PASS / 6 FAIL** contre la base ; **17 PASS, zéro échec et zéro skip** après correction. Les cas couvrent profil et situation séparés, paramètres, conditions de déclenchement, réponses obsolètes, décodage retardé, chargement actif, message courant, nettoyage, retour à l'étape 2 et sélection préservée.
- TypeScript ciblé de la vraie page, de ses composants importés et de la fixture navigateur : **PASS**. Les contrôles administrateur et signature existants restent inclus dans ce même projet TypeScript.
- Bundle navigateur avec la vraie page, React, Sonner et le vrai `next/link` : **PASS**. Aucun module de remplacement ni type inventé n'est utilisé pour Next.
- Tests ajoutés : **zéro erreur et zéro avertissement ESLint**. La page garde sa seule erreur `react-hooks/set-state-in-effect` préexistante ; aucune règle n'est affaiblie.

Reproduction locale, avec les dépendances publiques verrouillées installées :

```sh
JURIS_FINANCER_TEST_BASE_REF=7bc5af6833a70b85cd6ed88927a20aae608608e5 node --test tests/financer-read-races.test.mjs
node --test tests/financer-read-races.test.mjs
```

## Qualification navigateur et dépendances

La fixture Playwright conserve les vrais contrôles de la page. Elle vérifie les recherches séquentielles par profil, le message d'erreur courant et le démontage pendant une lecture suivi d'une erreur tardive. Le bouton de fermeture appartient uniquement à la fixture et contrôle le montage React, comme une navigation quittant la route. Les réponses HTTP sont fictives ; toute sortie réseau est refusée. Ces trois cas sont ajoutés aux trois largeurs du job navigateur existant. Aucun navigateur local n'a été exécuté ; consulter le résultat CI du commit publié.

Next `16.4.6`, déjà déclaré par l'application, est ajouté uniquement au sous-graphe public de test parce que la page importe `next/link` via son composant de suivi. Chaque version, résolution et intégrité des **94 entrées** du sous-graphe concorde avec le verrou applicatif. `npm ci --ignore-scripts --no-audit --no-fund` installe **39 packages** sur la plateforme locale et réussit. Le manifeste et le verrou de l'application restent inchangés.

GitNexus reconnaît l'entrée `FinancerPage` avant correction, avec risque **UNKNOWN** pour ses appelants Next. Le contrôle des changements est **LOW** sans processus affecté résolu ; ce résultat n'est pas une preuve d'absence de tous les parcours. La revue des gardes et les tests ci-dessus portent la qualification. Les données réelles, droits aux aides, autres étapes fonctionnelles et production restent hors de ces fixtures de lecture.
