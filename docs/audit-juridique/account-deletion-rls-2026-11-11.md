# Qualification ciblée des gardes RLS — 11 novembre 2026

## Résultat visé et état de la preuve

Ce lot ferme un défaut précis du schéma versionné : les politiques `insert_own`
et `update_own` contrôlent l'appartenance de la ligne, mais autorisent tous ses
statuts. Un rôle ordinaire auquel des droits d'écriture seraient accordés peut
donc, avec ces seules politiques, entrer dans `executing`/`completed` ou en sortir.
Les scénarios témoins ont reproduit ce comportement dans un cluster synthétique
sous un rôle non propriétaire. L'exposition PostgREST et les droits réellement
déployés restent non vérifiés ; aucune exploitation de production n'est affirmée.

**PASS ciblé :** le 11 novembre 2026, les fichiers exécutés ci-dessous ont obtenu
un résultat PASS sur PostgreSQL **18.4 (Homebrew)**, dans un cluster privé créé pour
le test. Le processus a terminé avec le code 0. Le [rapport natif exact](evidence/account-deletion-rls-2026-11-11.json)
est conservé sans modification ; il confirme l'identité du cluster, TCP désactivé,
l'arrêt du serveur et la suppression de son répertoire.

| Preuve native | Résultat |
| --- | --- |
| Scénarios initiaux de contraintes, cascades et concurrence | 8/8 PASS |
| Vérifications RLS sous rôles synthétiques | 59/59 PASS |
| Témoins avant migration inclus dans ces 59 | 20/20 comportements de référence observés |
| Matrice après migration incluse dans ces 59 | 20/20 comportements attendus observés |
| Attentes de verrou réellement observées | 7, dont 2 sous les rôles RLS |
| Identité du cluster, absence de TCP, arrêt et nettoyage | PASS |

Les 20 témoins avant migration démontrent le défaut du schéma initial dans le
contexte synthétique ; leur PASS signifie que la reproduction attendue a réussi,
pas que l'ancien schéma appliquait déjà les gardes. Les 39 autres vérifications
RLS couvrent l'après-migration et les propriétés complémentaires décrites plus bas.

**PARTIEL pour la production :** ce résultat qualifie les transitions et les
préconditions testées, pas l'installation déployée. Aucune base existante, aucun
utilisateur réel et aucun identifiant de connexion n'ont été utilisés. La
migration a été appliquée exclusivement au cluster privé jetable. Aucun statut de
conformité juridique globale ni de sécurité globale n'est déduit de ces tests.

La revue indépendante de sûreté du runner, du module et de la migration a été
clôturée avant l'exécution. Le cycle de vie du cluster a été conservé ; les huit
scénarios natifs ont été rejoués avec les prédicats actuels, sans réattribuer les
preuves de l'ancien candidat supersédé.

Référence applicative : `puramapro-oss/jurispurama`, commit
`e5fb2a3d28b89f1c54ecc3c90325f4d2b4b1c7b5`.
Le schéma exact est le blob Git `340ba7920659bac96d2dc619d6daf556266a2abb`.

## Modification proposée

La migration ne modifie aucune politique existante, ligne, contrainte, fonction,
appartenance de rôle ou autorisation. Elle ajoute trois politiques **RESTRICTIVE
TO PUBLIC**, qui se combinent avec les politiques permissives existantes sans
accorder de nouveau droit :

| Opération SQL ordinaire | Ancienne ligne | Nouvelle ligne |
| --- | --- | --- |
| INSERT | — | Propriétaire `auth.uid()`, statut `scheduled` |
| UPDATE | Propriétaire `auth.uid()`, statut `scheduled` ou `cancelled` | Même propriétaire authentifié, statut `scheduled` ou `cancelled` |
| DELETE | Toujours refusé par la garde | — |

`USING` protège l'ancien état ; `WITH CHECK` protège l'état à enregistrer. Une
ligne `executing` ou `completed` n'est donc plus modifiable par ces écritures
ordinaires. La garde DELETE ferme la suppression suivie d'une réinsertion, y
compris si une autre politique permissive autorise DELETE. Le schéma relu ne
comportait déjà aucune politique DELETE pour cette table.

`TO PUBLIC` couvre tous les rôles effectivement soumis à RLS. PostgreSQL continue
à exiger les privilèges SQL et au moins une politique permissive applicable. Des
politiques restrictives supplémentaires peuvent donc réduire encore l'accès.

Le rôle `service_role` doit déjà porter l'attribut **BYPASSRLS**. La migration
refuse de s'appliquer dans le cas contraire et ne lui accorde aucun privilège.
Les propriétaires, superutilisateurs, rôles BYPASSRLS, opérations de référence
étrangère et fonctions qui écrivent dans un contexte privilégié restent en dehors
de cette protection des écritures ordinaires.

## Compatibilité des routes actuelles

Les deux routes ont été relues à la tête citée, indépendamment de leurs tests :

| Route | Prédicats et transitions relus | Effet attendu des gardes |
| --- | --- | --- |
| POST `/api/account/delete` | Lit la ligne propre ; INSERT `scheduled` si absente ; sinon UPDATE conditionné par `id`, `user_id`, ancien `status` et ancien `scheduled_for`, depuis `scheduled`/`cancelled` | Autorisé si l'état relu est encore courant |
| DELETE `/api/account/delete` | UPDATE propre de `scheduled` vers `cancelled` avec reçu | Autorisé ; le refus de DELETE SQL ne s'applique pas à cet UPDATE |
| Cron de suppression | Réservation par `id`, `user_id`, `scheduled`, date relue et échéance ; écrit `executing`, puis `completed` avec filtre `id` | Autorisé pour le rôle de service BYPASSRLS |
| Cascade réelle `auth.users` | Suppression de la demande par la FK `ON DELETE CASCADE` | Conservée ; la finalisation peut légitimement ne retourner aucune ligne |

Le runner conserve les huit intentions natives du lot précédent et aligne ses
prédicats de reprogrammation et de finalisation sur cette tête. Les requêtes SQL
ajoutent parfois `RETURNING id` pour observer le nombre de lignes ; le transport
Supabase et les contrôles de réponse des handlers ne sont pas exécutés ici.

Sources relues :

- [Route utilisateur au commit vérifié](https://github.com/puramapro-oss/jurispurama/blob/e5fb2a3d28b89f1c54ecc3c90325f4d2b4b1c7b5/src/app/api/account/delete/route.ts)
- [Cron au commit vérifié](https://github.com/puramapro-oss/jurispurama/blob/e5fb2a3d28b89f1c54ecc3c90325f4d2b4b1c7b5/src/app/api/cron/account-deletion/route.ts)
- [Schéma versionné](https://github.com/puramapro-oss/jurispurama/blob/e5fb2a3d28b89f1c54ecc3c90325f4d2b4b1c7b5/schema-legal.sql)

## Préflight, idempotence et refus

La transaction fixe un délai de verrou de 5 secondes et un délai par instruction
de 15 secondes. Après vérification d'existence, elle verrouille la table avant
d'en contrôler les propriétés. Un verrou ACCESS SHARE conserve également l'identité
de `auth.users` pendant la vérification de sa FK ; les OID sont relus après ces
verrous. Elle exige la table ordinaire attendue, RLS actif,
les colonnes utilisées par les routes, la clé primaire, l'unicité de `user_id`, la
FK validée vers `auth.users(id)` avec cascade et `auth.uid()` retournant un UUID.
L'héritage, les règles de réécriture et les triggers personnalisés nécessitent une
revue au lieu d'une application automatique.

Les trois politiques d'origine doivent avoir leurs définitions attendues. Le rôle
`authenticated` doit être ordinaire, sans propriété effective de la table,
appartenance à un rôle privilégié ni droit TRUNCATE ; ces conditions empêchent de
présenter comme protégé un rôle qui contournerait les gardes. La migration ne
répare ni ne change ces droits : elle refuse la configuration incompatible.

Le second passage est sans effet si les trois gardes possèdent exactement leurs
définitions attendues. Une collision de nom, un caractère permissif inattendu ou
une expression différente provoque un échec atomique. La comparaison utilise la
représentation native `pg_get_expr` sous un `search_path` fixé ; une variation
inattendue de représentation selon la version PostgreSQL provoque un refus à
examiner, jamais le remplacement silencieux d'une politique.

Les préconditions ne constituent pas un inventaire complet des capacités SQL de
tous les rôles ni de tous les chemins privilégiés de l'application. Elles sont
une garde contre l'application à une configuration différente de celle revue.

## Exécution native réservée à un cluster jetable

Les fichiers de ce lot sont :

| Chemin dans le dépôt | Rôle |
| --- | --- |
| `migrations/20261111_account_deletion_rls_guards.sql` | Trois gardes additives et préflight ; aucun déploiement automatique impliqué |
| `tests/account-deletion-postgres.py` | Unique runner natif, huit scénarios initiaux et raccord RLS |
| `tests/account_deletion_rls_scenarios.py` | Scénarios sous rôles synthétiques |
| `docs/audit-juridique/account-deletion-rls-2026-11-11.md` | Présente qualification |
| `docs/audit-juridique/evidence/account-deletion-rls-2026-11-11.json` | Rapport natif exact de l'exécution PostgreSQL 18.4 |

Les trois fichiers SQL/Python sont identiques octet pour octet aux fichiers
exécutés. Le module de scénarios ne possède aucun paramètre de connexion ni aucune
gestion de serveur. Il reçoit exclusivement les fonctions du runner après
vérification du cluster nouvellement créé.

Le runner exige des binaires PostgreSQL déjà installés. Il ne télécharge rien,
ignore les paramètres d'environnement `PG*`, crée son propre répertoire privé
sous `/tmp`, désactive TCP, utilise uniquement son socket privé et vérifie le
répertoire de données réel. Chaque commande et chaque attente sont bornées. Le
serveur doit être arrêté et son répertoire supprimé avant un verdict PASS final.
Un échec de nettoyage fait échouer le rapport et conserve le chemin à examiner.

Commande de reproduction depuis la racine du dépôt, avec les binaires déjà
installés et un chemin local de sortie choisi pour ce run :

```bash
python3 tests/account-deletion-postgres.py \
  --pg-bin /chemin/vers/postgresql/bin \
  --schema schema-legal.sql \
  --migration migrations/20261111_account_deletion_rls_guards.sql \
  --migration-sha256 9ac3b8a570baab2c5b08d81f4ae901e2ac2435552091c7dcb918265f9844565a \
  --report /chemin/local/account-deletion-rls-result.json
```

Le hash du schéma est épinglé dans le runner ; le hash SHA256 de la migration est
obligatoire sur la ligne de commande et vérifié avant toute création de cluster.
Le runner et le module doivent également être comparés aux hashes revus avant
leur transfert ou exécution. Les rôles, droits et utilisateurs sont créés
**uniquement dans ce cluster synthétique**.

Empreintes SHA256 des trois fichiers exécutés, à conserver lors de l'intégration :

```text
9ac3b8a570baab2c5b08d81f4ae901e2ac2435552091c7dcb918265f9844565a  migrations/20261111_account_deletion_rls_guards.sql
fb6a0604fbebe050aaa7f49acb57523c36e4d74b7530c79d52684a31f7d4675a  tests/account-deletion-postgres.py
672924210470629824f11cb7932b4877513f7aa7bd4b40fa5cd3bc207f8a7311  tests/account_deletion_rls_scenarios.py
```

Le rapport archivé ci-dessus concerne PostgreSQL 18.4. Un run CI sur une autre
version doit produire son propre résultat ; son succès n'est pas présumé à partir
de cette exécution locale.

Les scénarios supplémentaires vérifiés sont :

- Les quatre INSERT et les seize transitions de statut avant puis après migration,
  sous un rôle non propriétaire réellement soumis à RLS.
- Sept refus et collisions : service sans BYPASSRLS, RLS désactivé, colonne absente,
  TRUNCATE utilisateur, politique originale altérée et deux collisions de garde,
  dont une après création provisoire de gardes dans la transaction.
- L'idempotence, la conservation des politiques initiales, des rôles et des droits.
- L'appartenance, l'identité absente, le chemin SQL SSR, le service privilégié,
  l'unicité, `ON CONFLICT DO UPDATE` et la cascade FK réelle.
- Deux attentes de verrou observées dans PostgreSQL : une réservation du service
  empêche un utilisateur de réécrire le statut après le déblocage de son UPDATE.
- Le maintien des gardes pour un second rôle ordinaire et malgré l'ajout d'une
  politique permissive de fixture, ensuite retirée.

## Limites et intégration

**NON TESTÉ par ce lot :** exposition et grants de production, validation JWT,
PostgREST, Supabase hébergé, écrans et confirmations, déploiement, effacement des
stockages/sauvegardes/sous-traitants et qualification juridique des délais. Une
écriture directe autorisée peut toujours choisir une date `scheduled_for` ; les
gardes ne font respecter ni la période de 30 jours ni la confirmation de l'UI.
Ces sujets restent distincts du contrôle des transitions d'état.

La migration reste un brouillon pour toute base persistante tant que la
configuration cible n'a pas été revue. Le PASS natif ne vaut ni application à une
base ni autorisation d'élargir le périmètre du run ; l'inclusion dans une PR ne
déclenche aucune opération de production dans ce lot.
Avant intégration définitive, reporter la règle dans le template canonique
`packages/legal/sql/001_legal_core.sql` et vérifier la tête courante afin d'éviter
un nouveau doublon. Aucun changement de ce template ni d'un autre dépôt n'est
inclus dans ce lot.

Références PostgreSQL officielles consultées pour les règles utilisées :

- [Row Security Policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)
- [CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- [Role attributes](https://www.postgresql.org/docs/current/role-attributes.html)
