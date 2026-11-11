# JurisPurama — concurrence et annulation de suppression

Date : 11 novembre 2026. Base GitHub : `1fafc538f871ee527a7449c5da441c510b674b2f`, PR 2 existante.

## Problème reproduit

Le cron lisait les demandes dues puis les passait à `executing` avec le seul identifiant de ligne. Deux exécutions ayant lu la même ligne pouvaient donc appeler toutes deux `deleteUser`. Une demande annulée ou reportée entre le scan et la prise en charge restait supprimable. L'API d'annulation annonçait également `ok:true` quand son UPDATE n'avait changé aucune ligne, notamment après la prise en charge du cron. Le POST utilisait un upsert inconditionnel : il pouvait reprogrammer une demande déjà acquise, annoncer un nouveau délai de 30 jours alors que la suppression se poursuivait.

Les trois premiers cas ont été reproduits sur le vrai handler de la base, avec des dépendances en mémoire et des identités fictives : deux appels destructifs pour la concurrence, un appel après annulation et un appel après report. Aucun compte réel n'a été utilisé.

## Réconciliation et correction

La copie Mac contrôlée en lecture seule contenait déjà une prise conditionnelle sur `id` et `status` (base locale `3f93395`). Elle n'incluait pas la vérification de l'utilisateur et de l'échéance, ni les corrections de signalement d'erreurs du lot GitHub. Sa route d'annulation avait aussi une amélioration locale non commitée : remplacer les détails DB renvoyés au client par un message générique et journaliser seulement le code. Ces éléments ont été rapprochés ; la copie Mac n'a pas été modifiée.

Le candidat complète le lot GitHub existant :

- Un seul UPDATE de prise en charge filtre l'identifiant, l'utilisateur, `status='scheduled'`, l'échéance identique à celle lue et son caractère dû. Il demande le retour de l'identité acquise.
- Zéro ligne retournée signifie qu'une autre opération a gagné : aucun appel de suppression, et compteur `skipped`. Un reçu incomplet ou incohérent est un échec explicite.
- Une prise réussie conserve la logique de suppression, les contrôles des erreurs et les compteurs précédents. Les réponses des lots sain/vide/refus restent compatibles.
- L'annulation demande le retour de la ligne modifiée. Zéro ligne produit HTTP 409, une erreur ou un reçu invalide HTTP 500. Un succès exige un identifiant retourné.
- Le POST relit l'état : il refuse `executing`/`completed`, met à jour une demande existante par CAS sur identité/statut/échéance ou insère une première demande. Un conflit d'insertion ou une course perdue renvoie HTTP 409 ; un reçu cohérent est exigé avant d'annoncer le délai.
- L'expurgation locale des erreurs POST/DELETE est conservée. Aucun schéma, fournisseur, paiement, règle tarifaire ou secret n'est ajouté.

Le changement de `status` est une prise conditionnelle en base, pas une transaction distribuée englobant le service Auth. Le stockage, les cascades, les sauvegardes et les sous-traitants restent distincts.

## Vérifications exécutées

Environnement : Node 24.22.1 ; SDK `@supabase/supabase-js` 2.103.0, version du lockfile, et Zod 4.3.6, installés séparément sans script d'installation ni audit npm.

| Contrôle | Résultat |
| --- | --- |
| Nouveaux scénarios de concurrence, annulation et reçus | **23/23 PASS** ; **4/23** sur la base GitHub, donc 19 critères exposés en échec avant correction |
| Programmation POST, conflits, courses avec cron/annulation et validation réelle Zod | **16/16 PASS**, contre **6/16** sur la base GitHub |
| Contrat du SDK réel : filtres, création, CAS, retours, zéro ligne, refus et annulation | **11/11 PASS**, transport HTTP intercepté |
| Huit scénarios du correctif précédent | **8/8 PASS**, contre 4/8 sur son original historique |
| Régressions AR24 existantes | **27/27 PASS** |

Les 29 échecs avant correction (19 + 10) sont des scénarios, pas 29 incidents de production distincts. Les tests importent les vrais handlers après retrait natif de leurs annotations TypeScript. Les 23 scénarios doublent le framework, Supabase, le garde d'authentification et le rate limit ; les 16 scénarios POST utilisent Zod réel. Les onze scénarios SDK exécutent le SDK du lockfile, avec les réponses HTTP locales attendues. Aucun test n'utilise de compte, clé ou endpoint réel.

Commandes depuis la racine du dépôt :

```bash
node --experimental-vm-modules --test tests/account-deletion-concurrency.test.mjs
node --experimental-vm-modules --test tests/account-deletion-scheduling.test.mjs
JURIS_BASELINE_REF=1fafc538f871ee527a7449c5da441c510b674b2f node --experimental-vm-modules --test tests/account-deletion-concurrency.test.mjs
node --experimental-vm-modules docs/audit-juridique-2026-11-11/cron/verify_fix.mjs
node --test tests/ar24-*.test.mjs
node --experimental-vm-modules --test tests/account-deletion-sdk.test.mjs
```

La commande de comparaison sur la base doit échouer : elle mesure les régressions reproduites. Elle nécessite que le commit soit disponible dans le dépôt Git. Les tests SDK et programmation utilisent l'installation du projet par défaut. Pour une installation de validation isolée, définir `JURIS_TEST_DEPENDENCY_ROOT` vers le répertoire contenant `package.json` et `node_modules/@supabase/supabase-js` 2.103.0 et `node_modules/zod` 4.3.6.

Le SDK de ce lockfile demande une liste même pour PATCH, puis applique `maybeSingle` côté client. Le double HTTP des tests SDK a été aligné sur cette implémentation après un premier essai fondé sur l'ancien contrat de réponse singulière ; cette correction du test n'est pas revendiquée comme une correction du produit.

Les résultats enregistrés figurent dans `account-deletion-concurrency-2026-11-11.json`. Les empreintes sont celles des sources testées ; aucune identité de commit final n'est déduite du seul succès local.

## Qualification continue ciblée

Le workflow `.github/workflows/account-deletion.yml` exécute ces 50 scénarios, les huit scénarios historiques et les 27 régressions AR24 lors des événements de pull request et des pushes sur `main`, avec une exécution manuelle possible. Il utilise Node 24.22.1 et deux actions officielles épinglées sur des commits précis ; leurs références et métadonnées ont été relues.

`tests/account-deletion-deps/package.json` et son lockfile verrouillent uniquement les dépendances publiques nécessaires aux essais : Supabase 2.103.0 et Zod 4.3.6, soit 14 paquets avec leurs dépendances transitives. L’installation s’effectue dans un répertoire temporaire avec `npm ci --ignore-scripts --no-audit --no-fund`. Le workflow contrôle la concordance des versions directes avec le lockfile applicatif, utilise les droits GitHub `contents: read` et ne persiste pas les identifiants Git. Il n’installe pas l’application et ne demande aucun secret de service.

**PASS local :** toutes les commandes `run` du workflow ont été rejouées depuis une installation neuve, avec les résultats 50/50, 8/8 et 27/27. **NON TESTÉ :** exécution du workflow sur les runners GitHub et configuration d’un contrôle obligatoire de fusion. Cette qualification ne représente pas un build complet ni un test avec les services réels.

## Publication de revue

`vercel.json` désactive le déclenchement Git automatique pour la seule branche `codex/juris-legal-review-20261111`. Les autres paramètres existants sont conservés. Cette configuration prépare la publication du candidat dans la PR 2 ; elle ne prouve pas son application par Vercel et ne constitue pas un déploiement.

## Limites et actions restantes

- **NON TESTÉ :** PostgreSQL/PostgREST réel, isolation entre processus ou hôtes, RLS, cascades réelles, build/types globaux, navigateur, ordonnanceur, service Auth réel, stockage, sauvegardes, prestataires et production.
- **NON TESTÉ :** analyse de graphe GitNexus. Le contrôle tenté sur l'environnement natif a terminé avec le code 1 ; aucun résultat de graphe concluant n'est revendiqué.
- Une demande `executing` reste en investigation manuelle. Le schéma versionné n'a pas de jeton ni date d'expiration de bail. Aucun retry automatique n'est ajouté à une opération dont le résultat distant peut être incertain.
- Le POST est désormais conditionnel, mais les politiques versionnées du socle autorisent encore les écritures directes sur sa propre ligne avec la seule condition `auth.uid() = user_id`. Une machine d’états imposée en base reste à qualifier avec le socle partagé ; les tests ne prouvent pas les politiques actuellement déployées. Le correctif protège les routes applicatives examinées, pas tous les clients directs possibles.
- Le schéma versionné référence `auth.users` avec `ON DELETE CASCADE` : une demande peut disparaître lors de l'effacement. Le scénario local de cascade vérifie que cela n'ajoute pas un second appel ; il ne prouve pas la migration réellement déployée.
- La réponse HTTP 409 de l'annulation et le compteur `skipped` doivent être pris en compte dans l'intégration et la supervision. Le composant actuel traite un statut non réussi comme une annulation échouée ; son rendu navigateur n'a pas été testé ici.
- L'identité Auth est commune à l'écosystème selon la documentation : le périmètre de consentement et de suppression inter-applications doit être qualifié avant activation réelle.

## Références techniques consultées

- [Supabase : UPDATE et retour des lignes modifiées](https://supabase.com/docs/reference/javascript/update)
- [Supabase : maybeSingle](https://supabase.com/docs/reference/javascript/maybesingle)
- [PostgreSQL : réévaluation des conditions UPDATE en concurrence](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Vercel : désactivation des déploiements Git par branche](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
- Sources installées du SDK 2.103.0 : `PostgrestTransformBuilder.maybeSingle` et `PostgrestBuilder`.
