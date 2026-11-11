# JurisPurama — corrections candidates et preuves

Date de préparation et de validation : **11 novembre 2026**.
Base examinée : `puramapro-oss/jurispurama`, commit `70d123d40ebffc507271c8acf0c9b56c20c428a8`.

**Statut : correction candidate avec contrôles ciblés réussis.** Ce dossier atteste le contenu examiné et les essais isolés décrits ci-dessous ; le statut d'intégration et de déploiement doit être lu dans la PR, la CI et les preuves d'exploitation correspondantes. Il ne constitue pas une certification juridique générale de l'application.

## Périmètre des trois fichiers applicatifs

### Présentation commerciale — `src/lib/constants.ts`

Le pitch présente désormais la compréhension des informations juridiques et la préparation du dossier, puis demande à l'utilisateur de vérifier et valider les documents avant signature ou envoi. La promesse d'un dossier complet en trois minutes et de signature/envoi « à ta place » a été retirée. Ce texte ne prétend pas qu'un mécanisme technique de validation a été ajouté.

### Confidentialité — `src/app/politique-confidentialite/page.tsx`

La phrase sur les paiements Stripe ne prétend plus à l'absence de toute donnée bancaire alors que la même page décrit un profil contenant un IBAN. Le texte distingue le traitement des paiements de l'IBAN renseigné pour préparer les documents. Le qualificatif « uniquement » n'est pas conservé.

La date de mise à jour est fixée au 11 novembre 2026, date réelle de cette modification rédactionnelle, au lieu d'être recalculée au rendu. Cela ne signifie pas que l'ensemble des déclarations de confidentialité a été vérifié techniquement ou contractuellement.

### Suppression — `src/app/api/cron/account-deletion/route.ts`

- Une erreur lors de l'update vers `executing` est traitée avant tout appel de suppression.
- Une erreur lors de l'update vers `completed` est signalée comme échec de finalisation, même si la suppression de l'identité a déjà réussi.
- Les objets d'erreur Supabase contenant un `message` textuel conservent ce message dans les résultats, au lieu de devenir `[object Object]`.
- Au moins une demande en échec entraîne `ok:false` et HTTP 500 ; les détails et compteurs par demande sont conservés.
- Le commentaire ne promet plus une purge complète en un appel. La suppression relationnelle dépend des cascades du schéma effectivement déployé ; stockage, sauvegardes et sous-traitants ne sont pas vérifiés par ce handler.

**La reprise manuelle est conservée.** Une erreur de prise en charge empêche l'appel de suppression ; une demande encore `scheduled` demeure éligible à un passage suivant. Une demande laissée à `executing` reste exclue de la sélection et nécessite une intervention manuelle. Ce blocage n'est pas corrigé. Aucune nouvelle reprise, suppression, migration SQL, règle d'autorisation ou logique tarifaire n'a été introduite.

## Rejouer les huit scénarios depuis la racine du dépôt

Prérequis de l'exécution enregistrée : **Node v24.22.1**, sans installation de dépendances. Commande :

```bash
node --experimental-vm-modules docs/audit-juridique-2026-11-11/cron/verify_fix.mjs
```

Le programme lit le handler corrigé à son vrai chemin `src/app/api/cron/account-deletion/route.ts`. Le fichier voisin `cron/route.original.ts` est la fixture originale exacte ; son SHA Git est contrôlé avant exécution. `cron/harness.mjs` fournit uniquement les dépendances simulées. Les seules annotations TypeScript sont retirées par l'API native Node ; la logique des handlers n'est ni copiée ni réécrite.

Les modules NextResponse, garde d'authentification et Supabase sont simulés. Les données sont des identités et lignes fictives en mémoire. La VM ne dispose pas d'accès réseau ou disque ; le programme hôte lit les fichiers locaux et écrit `cron/fix-results.json`. Aucun compte réel n'est supprimé. Les avertissements sur les API expérimentales Node sont attendus.

## Résultat de la dernière exécution enregistrée

**PASS — code de sortie 0, `PASS_CORRECTED_8_OF_8`.** Sur les huit critères ciblés, le handler d'origine en satisfait 4 et le handler candidat 8. Ce ratio ne mesure pas la conformité globale du produit.

| Scénario | Résultat du candidat |
| --- | --- |
| Erreur d'écriture `executing` | Aucun `deleteUser`, échec signalé, HTTP 500 |
| Erreur d'écriture `completed` | Finalisation en échec, HTTP 500 ; message exact `SIMULATED_COMPLETION_WRITE_FAILURE` vérifié |
| Erreur de suppression auth | Échec individuel et global, HTTP 500 |
| Lot mixte | Un succès, un échec, `ok:false`, HTTP 500 |
| Lot sain | Réponse identique au handler d'origine |
| Lot vide | Réponse identique au handler d'origine |
| Refus du garde d'authentification | Retour immédiat identique, aucun accès DB ni suppression |
| Reprise manuelle conservée | La demande `executing` n'est pas retraitée lors du second passage |

Les réponses complètes, états, traces et différences avant/après figurent dans `cron/fix-results.json`. Le scénario de finalisation vérifie aussi les erreurs Supabase sous forme d'objet simple. Les cas sain/vide/refus font l'objet d'une comparaison des réponses avec l'original.

## Intégrité des sources

| Fichier original | SHA Git blob à la base examinée |
| --- | --- |
| src/lib/constants.ts | `0fe2e4275181091798c44edbb38e026fbf5b5f93` |
| src/app/politique-confidentialite/page.tsx | `6403fe899edb4f0600b52517bab4daa5efd7a8dd` |
| src/app/api/cron/account-deletion/route.ts | `eb21cb8f39003f88d8cf92fda00a3a86d5aa9813` |

SHA-256 du handler candidat testé :

```text
89a7db367a7f92017254657e748c6ca49d0691c062380594c830690dbf1b1cbc
```

Le manifest `SHA256SUMS` contient les empreintes des trois fichiers applicatifs et des fichiers de preuve à la préparation. Il peut être vérifié depuis la racine du dépôt avec :

```bash
sha256sum -c docs/audit-juridique-2026-11-11/SHA256SUMS
```

Une nouvelle exécution réécrit le résultat horodaté ; son empreinte doit alors être recalculée si une nouvelle preuve est conservée.

## Limites

**NON TESTÉ :** build Next.js complet, vérification globale des types, rendu navigateur, Supabase réel, contraintes/cascades/transactions SQL, objets stockés, prestataires, sauvegardes, ordonnanceur, authentification réelle et production.

Le test d'authentification vérifie le respect du refus fourni au handler, pas la validité de l'implémentation du garde. Le backend simulé conserve les demandes après suppression d'une identité fictive ; il ne représente pas les clés étrangères réelles. Les essais montrent le comportement du handler pour les résultats de dépendances injectés, pas un incident déjà observé en production.

La prise en charge n'est pas devenue atomique ; les courses d'annulation ou de concurrence et la reprise des demandes `executing` restent à traiter séparément. Le passage à HTTP 500 en cas d'échec partiel doit être rapproché de la configuration réelle de supervision avant déploiement. Les anciens tarifs, l'identité déclarée de l'éditeur et les affirmations contractuelles ou techniques non couvertes ici restent à vérifier par leurs preuves propres.
