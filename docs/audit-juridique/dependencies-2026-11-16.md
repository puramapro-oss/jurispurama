# Dépendances — qualification isolée du 16 novembre 2026

Le build complet a rendu visibles des alertes qui n'étaient pas couvertes par les dépendances réduites des tests AR24. Le verrou précédent est conservé dans l'historique ; son build Next 16.2.11 avait réussi. Les corrections ci-dessous n'activent aucun fournisseur, migration ou déploiement. La branche de qualification et la branche de cette PR restent explicitement exclues de Vercel.

## Graphe et correctifs

| Mesure npm audit | Avant | Après |
|---|---:|---:|
| Production : critiques / hautes / modérées / faibles | 3 / 7 / 10 / 5 | 0 / 0 / 6 / 6 |
| Complet : critiques / hautes / modérées / faibles | 3 / 8 / 18 / 6 | 0 / 0 / 14 / 7 |

Il s'agit de groupes de packages signalés par npm, pas d'un nombre d'exploits prouvés. Audits du graphe installé avec `npm audit --omit=dev --json` et `npm audit --json`, sans correction forcée ni downgrade.

| Dépendance | Avant | Candidat |
|---|---|---|
| next / eslint-config-next | 16.2.11 / 16.2.2 | 16.4.6 / 16.4.6 |
| sharp, dépendance du Next corrigé | 0.34.5 | 0.35.5 |
| zod | 4.3.6 | 4.6.6 |
| javascript-opentimestamps | 0.4.5 | remplacement officiel opentimestamps 0.4.9 |
| bitcore-lib / elliptic | 0.13.19 / 3.0.3 | 8.25.47 / 6.6.1, graphe officiel OTS |
| nanoid / source-map-js / js-yaml | 3.3.16 / 1.2.1 / 4.3.0 | 3.3.20 / 1.2.2 / 4.3.2 |
| brace-expansion | 1.1.16 et 5.0.8 | 1.1.22 et 5.0.13, mêmes majeures |

Le nouveau bitcore fixe bn.js à 4.11.8 : un override limité à bitcore utilise 4.12.5 (même API majeure 4, correction `maskn(0)` et tests arithmétiques/endian). L'ancien graphe OTS utilisait bn.js 2 ; sa disparition résulte de la mise à jour officielle OTS, pas d'un override 2→4. Minimatch reste en majeure 3 dans OTS avec brace-expansion 1 corrigé. Aucun remplacement request→4 ni minimatch→11 n'est imposé aux anciens consommateurs. Le Next corrigé supprime son PostCSS 8.4.31 vulnérable ; le graphe résout 8.5.23. Les mises à jour de qs et moment restent dans les plages déclarées.

Sources primaires : [Next image optimizer](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Next AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Next cache](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [Zod 4.6.6](https://github.com/colinhacks/zod/releases/tag/v4.6.6), [renommage officiel OTS](https://github.com/opentimestamps/javascript-opentimestamps), [bn.js](https://github.com/advisories/GHSA-378v-28hj-76wf). L'exploitabilité en production n'est pas déduite d'un audit npm ; le correctif Next couvre aussi les chemins non observés ici (Windows, `use cache`, ImageResponse Node). La route OG actuelle utilise Edge.

## Horodatage et limites de collections

Le wrapper Juris garde `stampHash`, `stampDocument` et `verifyProof`, le SHA256 du texte UTF-8 (y compris une chaîne hexadécimale `signatureHash`) et la vue exacte d'un Buffer copiée avant tout await. Il utilise les primitives officielles de sérialisation, opérations Merkle et attestations de 0.4.9, avec le transport borné déjà qualifié dans IAO. Aucun algorithme cryptographique n'est réimplémenté. Les entrées historiques restent décodables : cinq fixtures officielles se resérialisent octet pour octet, dont les attestations inconnues.

Un dépôt exige deux réponses calendaires portant une attestation admissible. Une panne totale, une seule acceptation ou un arbre sans attestation ne sont plus des succès. La vérification ne confirme que Bitcoin ; c'était déjà le résultat produit de Juris. Le retrait Ethereum/web3 de l'amont ne devient pas une promesse de compatibilité de toutes ses APIs. Preuve 64 Ko, réponses bornées, autorités HTTPS fixes, redirections refusées, limite de requêtes et délai de 10 s par requête ; le délai n'est pas une limite globale de toute vérification multi-requêtes. Les tests bloquent le transport réel et injectent seulement les réponses HTTP.

Zod 4.6.6 contrôle les bornes avant les éléments : au plus 10 pièces dans le schéma chat, 100 IDs de notifications et 4 types légaux. Les appels existants de l'UI restent dans ces bornes. Ces limites de cardinalité ne prétendent pas borner la taille du corps HTTP avant son décodage.

## Qualification

- 17 tests OTS et 3 tests des vrais schémas/routes avec Zod réel PASS, sans réseau fournisseur : fixtures, anciennes empreintes, mutation de Buffer, panne/quorum, preuves invalides, bloc/Merkle simulés, hôtes, redirection, streaming, réponse tardive, BN et tripwire ECDSA.
- Les 125 vérifications AR24/suppression/checkout/Connect/historiques précédentes restent PASS avec le nouveau graphe : total local 145, aucun échec ni skip. Le workflow exécute aussi les 20 nouveaux tests et compare les dépendances publiques aux versions du verrou applicatif.
- TypeScript applicatif complet PASS ; build Next 16.4.6 complet PASS ; lint des dix fichiers TypeScript changés par les lots AR24/dépendances PASS. Les 338 fichiers source de la copie de build sont identiques. Aucune qualification navigateur ni fournisseur réel n'en découle.
- La copie isolée remplace seulement la résolution Git privée SMARANA par une archive de ses sources exactes verrouillées `531cc653c81ffa3c99ab94667067f217deb5f944`, ainsi que le package ESLint frère canonique `6e50837`. Le dépôt conserve sa résolution Git et son lock d'origine pour ces dépendances. Aucune autre version installée ne diffère du verrou candidat.
- Aucun fichier `.env` réel ni variable fournisseur transmis. Seuls URL publique Supabase `https://supabase.test.invalid` et jeton public synthétique non réel ; sorties HTTP/fetch interdites sauf Google Fonts en lecture, TLS vérifié. Un build sans ces deux paramètres publics échoue correctement au prerender ; le build standard du runner exige encore l'accès privé SMARANA et le package frère, ce qui reste distinct des tests publics CI.
- Le SQL durable reste inchangé depuis la qualification CI `43813198970` : 18 scénarios PostgreSQL AR24 et 67 historiques PASS. Les checks du nouveau commit doivent être consultés avant intégration.

## Alertes restantes, sans masquer leur présence

- **Anthropic SDK, modérée** : outil mémoire filesystem touché par GHSA-p7fg-763f-g4gf. Aucun `memoryTool`/FilesystemMemory ni import tools dans les appels Juris observés ; seuls messages create/stream. Le passage de 0.82 à la ligne 1.x proposée par npm dépasse ce correctif compatible. L'alerte du package reste comptée.
- **request/request-promise/uuid, modérées** : dépendances amont OTS encore installées, mais les imports profonds des primitives Juris ne chargent pas ce transport. Le test contrôle le cache des modules effectivement chargés. Cela ne rend pas ces versions sûres pour d'autres usages. La suggestion npm de descendre OTS à 0.0.0 est rejetée.
- **Elliptic 6.6.1, faible** : aucun correctif sûr imposé à la cryptographie amont. Le chemin d'horodatage utilise opérations Merkle et attestations, pas la signature ECDSA ; tripwire sur l'instance réellement résolue par bitcore. Les anciennes alertes critiques d'elliptic 3/lodash 3 ont disparu.
- **deepmerge / React Email / html-to-text, faibles** : pas de version corrective annoncée par l'audit. Le rendu des emails utilise des composants/props internes ; aucune preuve d'absence absolue de risque n'est déduite de ce constat.
- **Développement** : minimatch de la chaîne ESLint/TypeScript reste modéré ; esbuild garde une alerte faible liée au serveur de développement Windows. Le build qualifié est Linux, sans serveur de développement. Aucun override majeur de ces outils n'est introduit pour modifier artificiellement le score.

Les avertissements de migration Next `middleware`→`proxy`, dépréciation Edge et taille de cache Webpack restent visibles dans le log de build ; ils ne sont pas des erreurs de compilation. Aucun déploiement n'a été effectué.
