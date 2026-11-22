# Lectures administrateur concurrentes — 22 novembre 2026

Base : `cfa2b8982257795a199d5f7bdfad9bcfdd4f6c36`. Périmètre : chargement des listes de paiements et d'utilisateurs, et lecture de rafraîchissement après un changement de plan.

## Défauts reproduits

Une réponse lente issue d'un ancien filtre pouvait remplacer les données d'un filtre plus récent. Le `finally` de cette ancienne requête pouvait également arrêter l'indicateur de chargement d'une requête toujours active. Une erreur réseau de lecture sortait du callback sans message utilisateur.

Dans la page Utilisateurs, le callback de changement de plan conservait son ancien chargeur. Si les filtres changeaient pendant le PATCH, sa lecture de rafraîchissement pouvait rétablir l'ancienne recherche. Un PATCH terminé après démontage pouvait également démarrer une nouvelle lecture.

## Correction et invariants

Chaque nouvelle lecture annule la précédente. Le signal est contrôlé après la réponse, après le décodage JSON et dans les branches d'erreur et de fin de chargement. Le nettoyage de l'effet annule la requête courante. Une erreur réseau courante présente un message français fixe, sans recopier le détail du transport.

Le chargeur courant de la page Utilisateurs est enregistré dans une référence uniquement depuis l'effet, puis cette référence est vidée au nettoyage. Le rafraîchissement après PATCH utilise cette référence, ou s'abstient si la page a été démontée. Les URL, paramètres GET, méthode et corps PATCH, règles serveur d'autorisation, messages HTTP existants et message de succès restent identiques. Aucun traitement Stripe ou AR24 n'est ajouté ou activé.

## Vérification exécutée

Les tests exécutent les vrais callbacks extraits des sources TSX par l'AST TypeScript, avec des réponses HTTP différées et sans transport réel :

```sh
JURIS_ADMIN_TEST_BASE_REF=cfa2b8982257795a199d5f7bdfad9bcfdd4f6c36 node --test tests/admin-read-races.test.mjs
node --test tests/admin-read-races.test.mjs
```

- Référence : **4 PASS, 12 FAIL**, défauts reproduits.
- Correction : **16 PASS, aucun échec ni skip**. Scénarios : paramètres conservés, réponse ancienne, annulation pendant le JSON, chargement courant, erreur expurgée, messages HTTP, démontage, PATCH pendant changement de filtre, PATCH terminé après démontage.
- TypeScript ciblé : **PASS** sur les deux pages réelles, leurs composants importés, les tests navigateur administrateur et la signature existante. Le sous-graphe public `tests/signature-state-deps` est réutilisé sans dépendance ajoutée ; ses 43 entrées verrouillées concordent avec le verrou applicatif, et 17 packages sont installés sur cette plateforme.
- Les deux fixtures navigateur des pages réelles se compilent avec esbuild : **PASS**. Les tests Playwright couvrent le filtre Paiements, l'erreur réseau et le rafraîchissement Utilisateurs après PATCH aux trois largeurs existantes. Ils sont ajoutés au job navigateur existant, dont le résultat au commit publié doit être consulté ; aucune exécution de navigateur local n'est revendiquée.
- Les nouveaux tests ne créent aucune erreur ESLint. Les deux erreurs `react-hooks/set-state-in-effect` et l'avertissement CSV préexistants des pages restent visibles ; aucune règle n'est désactivée. Ce correctif ne déclare pas le lint global réussi.

## Revue et limites

GitNexus retrouve les deux composants avant modification, mais ne résout pas leurs appelants de routes Next : risque **UNKNOWN**, et non absence d'impact. Le contrôle des changements identifie le flux `AdminUsersPage → load`, notamment son utilisation après `updatePlan`, avec risque **MEDIUM**. Les tests ciblent ce flux. Le code d'export CSV, parfois inclus par les hunks de l'analyse, ne change pas.

La revue React vérifie l'absence de mutation de référence pendant le rendu, les dépendances des effets, le nettoyage et les gardes contre les réponses périmées. Cette approche suit le [nettoyage des chargements en effet décrit par React](https://react.dev/reference/react/useEffect#fetching-data-with-effects).

L'accès administrateur réel, les données persistantes, les écritures de production, le build complet et les autres pages ne sont pas qualifiés par ces fixtures. La branche de revue conserve son exclusion de déploiement.
