# Installation autonome du linter — 22 novembre 2026

## Défaut reproduit

Base auditée : `ba42d72d44cd6c4ac674565015fb8760c1bc0569`, candidat de la PR 2. Le manifeste et le verrou pointaient `@purama/eslint-config` vers `file:../packages/eslint-config-purama`, absent d'un clone autonome. Le dépôt ne déclare ni workspace, ni sous-module, ni bootstrap créant ce répertoire. `eslint.config.mjs` importe pourtant ce package au démarrage.

Dans une installation isolée des dépendances publiques du linter, toutes verrouillées aux entrées du verrou applicatif, l'import de `eslint.config.mjs` échoue avec `ERR_MODULE_NOT_FOUND: Cannot find package '@purama/eslint-config'`. Ce défaut est indépendant de l'accès au dépôt privé SMARANA.

## Correctif

Le package est conservé dans `tooling/eslint-config-purama` et les trois références du verrou, ainsi que la dépendance du manifeste, utilisent ce chemin interne. Aucun numéro de version ni aucune règle ESLint ne change.

Les deux fichiers sont identiques octet pour octet au [package canonique de purama-master](https://github.com/puramapro-oss/purama-master/tree/6e50837af08ad57d8db37077f0363b3e05289e31/packages/eslint-config-purama), déjà utilisé par SUTRA et par la qualification JURIS du 16 novembre :

| Fichier | SHA256 |
|---|---|
| `package.json` | `6aae62a1b893d3c69181297bde54b0b343616b30439d2e3c0f1f204b08f94382` |
| `index.mjs` | `987fcb95af879ce9c793bd9a865363dd229d64d9004c756be3d2a98046f4d9d6` |

Cette copie doit être mise à jour depuis cette source commune, avec provenance explicite, sans créer de règles propres à JURIS.

## Vérification exécutée

- Node `24.22.3`, npm `11.19.1`. Installation publique isolée : `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline --maxsockets=2 --omit=optional`, **PASS**. Les 396 entrées sélectionnées du verrou sont identiques au verrou applicatif ; 328 packages nécessaires sont installés. Next `16.4.6`, ESLint `9.39.4`, React `19.2.4` et TypeScript `5.9.3` sont ceux de l'application. Les binaires facultatifs de compilation ne sont pas requis pour qualifier le chargement du linter.
- Reproduction avec la dépendance locale absente : import de la configuration **FAIL**, code 1 et erreur `@purama/eslint-config` manquant. Après installation de la copie canonique : import **PASS**.
- API ESLint réelle : TypeScript valide accepté ; `any` refusé ; règles `max-lines=300` et `no-empty` préservées, **PASS**.
- `npm run lint -- --format json` parcourt effectivement les 374 fichiers : **PARTIEL**, 16 erreurs préexistantes (15 `react-hooks/set-state-in-effect`, une `react-hooks/purity`) et quatre avertissements. Restaurer le linter ne qualifie donc pas le lint global comme réussi. Les règles ne sont pas désactivées.
- Régressions métier exécutées sur les sources candidates : **137 PASS, zéro échec, zéro skip** (79 suppression/SDK/OTS/collections/checkout/Connect et 58 AR24). La vérification historique séparée du cron conserve **8/8 PASS** ; elle n'est pas comptée comme 8 nouveaux tests de l'application.
- GitNexus `1.6.12` : index généré (5 088 nœuds, 9 399 relations). La cible externe `puramaConfig` n'est pas indexée : impact **UNKNOWN**, et non zéro impact. Les références du manifeste, du verrou et de la configuration ont été vérifiées directement ; aucune source métier ne change dans ce lot.

## Limites constatées

Le `npm ci` du dépôt complet reste bloqué ici par la résolution SSH du dépôt privé SMARANA. Une copie de qualification utilisant les sources exactes de SMARANA `531cc653c81ffa3c99ab94667067f217deb5f944` (12 blobs vérifiés) a ensuite été interrompue deux fois par le système, code 137, pendant son installation complète. Ce lot ne prétend donc ni réparer l'accès privé ni apporter une nouvelle preuve de build global.

Le navigateur local ne démarre pas dans cet exécuteur (création de socket refusée). Aucun nouveau test navigateur n'est revendiqué. Les tests de signature et PostgreSQL de la CI [44952025748](https://github.com/puramapro-oss/jurispurama/actions/runs/44952025748) étaient réussis au SHA de base ; leur résultat ne remplace pas les futurs contrôles du commit corrigé.

Aucun fournisseur, paiement, envoi AR24, migration distante ni déploiement n'est activé par ce correctif. La branche de revue existante conserve son exclusion de déploiement Vercel.
