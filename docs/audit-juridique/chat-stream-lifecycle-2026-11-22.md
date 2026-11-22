# Cycle de vie du chat — 22 novembre 2026

Base canonique : PR 2, branche `codex/juris-legal-review-20261111`, commit `71b14b14bbcadacffbf4e5ada3b5b740bfbb4650`, arbre `a7bffe8d0f92f3d530e71e5d41625874bf7da6aa`.

## Défauts reproduits

Le vrai hook React `useChatMessages` a été exécuté dans un harnais indépendant. Deux régressions échouaient sur la base : une réponse tardive du nouveau dossier remplaçait `/dashboard` par `/chat/generated` après le démontage ; une erreur tardive affichait un toast sur la page suivante. Le transport était simulé et ignorait volontairement l'annulation.

La revue a ensuite reproduit trois autres cas sur le premier candidat : un message pouvait partir avant la fin du chargement de l'historique, un EOF sans événement terminal était accepté, et un brouillon dont `message` était un objet arrivait à la fonction d'envoi. Le callback réel de la page vidait aussi sa saisie lorsqu'il était invoqué pendant le chargement. Ces défauts ont été corrigés avant publication.

## Correctif et invariants

- Chaque fil dispose d'un périmètre d'annulation. Sa fermeture ou son remplacement invalide immédiatement le flux et ses effets tardifs. L'état du nouveau fil est réinitialisé ; le `finally` d'un ancien envoi ne peut pas arrêter l'indicateur du suivant.
- Les lectures initiales et de rafraîchissement transmettent leur signal et vérifient encore leur validité après le décodage. Le défilement programmé est annulé avec la lecture.
- Une référence bloque les envois concurrents avant le prochain rendu React. L'historique en cours de chargement bloque l'admission dans le hook et dans le vrai `ChatInput`. Le callback de la page garde la saisie tant que l'envoi est indisponible.
- Le lecteur SSE annule et libère son reader. Le contrat de `src/app/api/ai/chat/route.ts` émet un événement JSON `done`, puis le marqueur `[DONE]` et la fermeture. Seul l'événement terminal termine normalement la lecture ; un EOF isolé affiche une interruption et conserve le texte partiel. Un terminal reçu permet de libérer le flux sans attendre une fermeture retardée.
- Le brouillon automatique est validé comme chaîne non vide avant consommation. Sa mise en route différée d'une microtâche évite de le perdre pendant la répétition des effets de StrictMode. Cette logique est partagée avec l'appelant existant dans `usePendingChatMessage`.

L'annulation client ne démontre pas que le serveur a annulé son traitement ou ses écritures. Ce lot ne supprime aucune donnée et ne promet aucun rollback distant. Le protocole serveur, les modèles, les règles juridiques, les paiements, AR24 et les migrations restent hors de ce correctif.

## Qualification locale

| Contrôle | Résultat observé avant publication |
| --- | --- |
| Harnais React indépendant | Deux défauts initiaux reproduits ; six scénarios finaux réussis, dont StrictMode, changement de fil, admission et brouillon invalide |
| Lecteur SSE et vrai callback de page | 13 tests Node réussis ; quatre assertions rouges de la revue devenues vertes sans assouplissement |
| Régressions administrateur et Financer conservées | 33 tests réussis, aucun échec ni test ignoré |
| Typage UI isolé étendu aux hooks, au champ de saisie et aux nouvelles fixtures | Réussi sous 512 MiB |
| ESLint ciblé | Aucune erreur ni avertissement ; règles canoniques inchangées |
| Bundle de fixture | Compilation esbuild réussie, aucun avertissement |

Commandes reproductibles avec le sous-graphe public existant installé :

```sh
node --test tests/chat-stream.test.mjs tests/chat-page-admission.test.mjs
node --test tests/admin-read-races.test.mjs tests/financer-read-races.test.mjs
node_modules/.bin/tsc --project tests/signature-state-deps/tsconfig.json --noEmit
node_modules/.bin/playwright test tests/sign-modal-state.spec.ts tests/admin-read-state.spec.ts tests/financer-read-state.spec.ts tests/chat-stream-state.spec.ts --retries=0 --workers=1
```

Les tests d'admission exécutent le callback et l'expression `disabled` extraits du vrai TSX par TypeScript. Ils ne prétendent pas monter toute la page Next. La fixture navigateur monte les vrais hooks, le vrai `ChatInput`, React et Sonner ; ses contrôles extérieurs simulent le changement de route et le démontage. Les réponses HTTP sont fictives et toute sortie réseau est refusée.

Douze scénarios navigateur sont ajoutés aux trois largeurs existantes, soit 36 cas nouveaux et 57 avec les 21 cas précédents. Ils couvrent succès, abandon avant réponse, annulation pendant lecture, erreur tardive, changement de fil, JSON retardé, StrictMode, double appel, 404 tardif, chargement de l'historique, EOF incomplet et brouillon invalide. Leur résultat doit être reçu dans la CI du commit publié ; aucun Chromium local n'est revendiqué.

## Analyse d'impact et revue

GitNexus 1.6.12 a analysé un snapshot isolé de six sources identiques à la base : les hooks de chat, la page et ses deux composants directs. Cet index limité compte 114 nœuds et 126 relations. Le symbole est reconnu, mais ses appelants ne sont pas résolus : impact **UNKNOWN**, sans prétention d'absence d'effet. La recherche textuelle établit l'appel depuis `ChatCasePage` ; il est pris en compte dans les tests. Le contrôle des changements identifie les quatre fichiers métier et cinq symboles, risque `low` dans ce sous-graphe limité, sans flux complet résolu.

La revue indépendante a contrôlé le nettoyage, les réponses périmées, le passage entre fils et les trois cas supplémentaires reproduits. Les copies de travail antérieures sont conservées. Aucun index global ni dépendance tierce n'a été modifié.

## Livraison et limites

La correction est préparée sur `fix/juris-chat-lifecycle-20261122`, en brouillon vers la branche de revue existante. `deploymentEnabled` vaut `false` pour cette branche et sa base. La base ne contient qu'un workflow de régression, sans étape de déploiement.

Les manifestes et verrous de dépendances applicatifs et du harnais sont inchangés. Le sous-graphe UI conserve ses 94 entrées verrouillées ; aucun package supplémentaire n'est requis.

**NON TESTÉ par ce lot :** build complet avec backend privé, authentification et données persistantes réelles, traitement IA distant, production et appareils physiques. La suite CI existante conserve ses jobs serveur et PostgreSQL ; le présent document ne leur attribue pas par avance un succès au nouveau commit. Le lint global historique reste distinct du contrôle ciblé ci-dessus.
