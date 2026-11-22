# JURIS — chat, contrats mobiles et récupération du compte

## Résultat et périmètre

**PASS pour la qualification locale du lot ; PARTIEL pour sa mise en service.**
Base initiale : `8d4c88383b07af9525195fdd2d159f9e265d3ad3`. Parent intégré et conservé :
`038793ee0cad0dd1a35c2c6e830bcb901552d1a6`, branche de revue existante `codex/juris-legal-review-20261111`, PR 2. Aucun remplacement de dépôt,
nouvelle PR concurrente, fusion main, migration distante ou déploiement de
production n’est requis par ce lot.

La qualification finale, le 22 novembre 2026 à 19:16 Paris, a exécuté les
39 fichiers `tests/*.test.mjs` dans un corpus unique : **578/578 PASS**, sans
échec, annulation ni scénario ignoré. Les sources n’ont pas changé pendant
les contrôles. Les **21 scénarios de récupération** ont ensuite aussi réussi
avec Supabase **2.112.3**, exactement verrouillé par l’application mobile ;
ce second passage ne s’ajoute pas aux 578 scénarios distincts.

Le [relevé vérifiable](evidence/mobile-auth-chat-2026-11-22/qualification.json)
contient les commandes, codes de sortie, versions, empreintes des sources
modifiées et empreinte de l’inventaire complet. Les journaux finaux des
[tests](evidence/mobile-auth-chat-2026-11-22/node-regressions.log), du
[SDK mobile](evidence/mobile-auth-chat-2026-11-22/native-sdk-exact.log) et du
[lint global](evidence/mobile-auth-chat-2026-11-22/lint-global.log) sont joints.

## Continuité de la contribution concurrente

Avant publication, la branche distante avait avancé au commit `c9c7617`. Les
sept blobs et son arbre Git ont été vérifiés. Ses quatre fichiers de tests
restent inchangés et ses étapes CI sont conservées. Son hook est la version
canonique, avec seulement le client stable et la destination du formulaire
ajoutés. Les 21 tests Node supplémentaires sont inclus dans les 578 résultats
finaux ; les quatre scénarios Chromium sont conservés mais non exécutés
localement. Aucun historique ni travail parallèle n’a été écrasé.

Un second avancement, `038793e`, a été détecté pendant la garde de publication.
Ses corrections de notifications, ses deux fichiers de tests et ses étapes CI
sont également conservés. Les six blobs ont été vérifiés ; les quatre fichiers
produit/tests non conflictuels restent identiques. Ses 40 scénarios sont inclus
dans les 578 contrôles finaux. La tentative sur l’ancienne tête n’a pas modifié
la référence distante ; le lot est reparti de ce nouveau parent.

## Défauts corrigés

### Chat et persistance

Le mobile envoyait un tableau `messages` alors que l’API attend `message` et
éventuellement `caseId`. Il lisait les événements SSE comme du texte, tandis
que les routes n’admettaient pas son authentification Bearer. Le mobile utilise
maintenant le contrat existant, `expo/fetch` et le lecteur SSE partagé. Il
vérifie le type de réponse, les identifiants et le terminal confirmé ; une fin
de transport seule ne vaut pas succès. Le dossier est réutilisé à la suite.

Le serveur charge désormais les 39 messages précédents les plus récents,
avant l’insertion de la demande, puis les remet dans l’ordre chronologique.
Il supprime le préfixe assistant orphelin créé par la limite et ajoute
explicitement la demande actuelle avec ses images. Le contexte reste borné à
40 messages. L’ordre secondaire par identifiant rend les égalités de date
déterministes. Une erreur de lecture n’est pas assimilée à un historique vide.

La persistance doit fournir les reçus attendus avant un événement `done`.
Une sortie publique vide est refusée ; les métadonnées internes, y compris les
balises de casse différente ou tronquées, ne sont pas affichées. Les détails
privés d’une exception fournisseur ne sont pas renvoyés au client.

Si le dossier est créé mais que l’enregistrement initial n’est pas confirmé,
HTTP 500 conserve son UUID. Web et mobile l’adoptent uniquement pour une
nouvelle conversation et gardent l’erreur visible. L’action explicite suivante
réutilise le dossier. Aucun dossier n’est supprimé en compensation : un reçu
manquant peut masquer une insertion déjà effectuée.

Les requêtes sont liées au propriétaire et à une tentative. Le double clic,
le démontage, le changement de compte et les réponses tardives ne peuvent
modifier une nouvelle conversation. Le mobile possède un arrêt explicite et
une limite de 130 secondes. Le flux serveur est borné à 110 secondes, en
retranchant le temps d’admission déjà écoulé, et l’annulation est transmise au
SDK Anthropic. Un appel d’authentification déjà figé avant le démarrage du
contrôleur n’est pas couvert par ce délai serveur.

### Authentification, abonnement et dossiers mobiles

Un Bearer explicite est vérifié avec le SDK Supabase et conservé sur le client
qui effectue les lectures sous RLS. Un Bearer mal formé ou refusé ne retombe
pas sur les cookies. Le comportement web par cookies demeure disponible en
l’absence d’en-tête Authorization. Les routes chat, dossiers, checkout et
portail Stripe partagent cette admission.

L’abonnement mobile réutilise le catalogue canonique et l’identifiant technique
Premium existant, `avocat_virtuel`. Il envoie une facturation mensuelle et un
UUID d’intention conservé lors d’une reprise. Une autre offre ou un autre
compte produit une nouvelle intention. Aucune URL de paiement ancienne ne
s’ouvre après un changement de compte. Les résumés et statuts des dossiers
proviennent des types et champs existants ; les réponses d’un ancien compte
ne repeuplent pas la liste.

### Récupération du mot de passe et cycle des profils

Le web dirige le lien PKCE vers un véritable formulaire `/update-password`.
Le formulaire confirme l’identité, valide les deux saisies, attend le reçu de
modification et traite les liens expirés, erreurs, doublons et changements de
session. Le callback et le login partagent une destination interne normalisée ;
les redirections externes et leurs variantes encodées sont refusées.

Le natif utilise `jurispurama://auth/callback?flow=recovery`. Le vérificateur
PKCE possède son espace SecureStore dédié et la session de récupération reste
en mémoire dans un client distinct. Un échange obsolète ne remplace pas le
compte connecté. Le callback contrôle origine, chemin, paramètres et code.
Le formulaire, son transfert depuis le callback, l’annulation et la purge de
l’état temporaire sont exercés. Expo Web ouvre le parcours web existant.

Le cœur de validation et modification est partagé entre web et mobile, sans
import runtime natif. La modification utilise un client éphémère attaché à
l’identité vérifiée ; une connexion concurrente ne redirige pas la requête
vers le nouveau compte. Une opération déjà reçue par le serveur peut toutefois
avoir abouti malgré l’abandon de sa confirmation locale.

Le hook web et le store natif n’acceptent plus un snapshot initial périmé.
Le hook web utilise un client stable, un callback auth synchrone et des lectures
de profil gardées par propriétaire et génération. Il ne crée pas de profil
après erreur de lecture et relit après un conflit de création concurrente.
Les tokens rafraîchis restent synchronisés.

## Vérifications et reproduction

| Contrôle final | Résultat | Portée |
| --- | --- | --- |
| 39 suites Node | 578/578 PASS | Modules réels ; frontières réseau, base et vues natives contrôlées |
| Supabase mobile exact 2.112.3 | 21/21 PASS | Même récupération rejouée, SDK réel et HTTP synthétique |
| TypeScript web global | PASS, zéro diagnostic | `tsc --noEmit --incremental false --pretty false` |
| ESLint global | PASS, zéro erreur, deux avertissements existants | Navigation complète de déconnexion et ErrorBoundary conservée |
| ESLint mobile explicite | PASS, zéro erreur et avertissement | Onze fichiers TS/TSX modifiés, `--no-ignore` |
| Metro et espaces du patch | PASS | `node --check mobile/metro.config.js`, `git diff --check` |
| Contre-revue indépendante | PASS dans le périmètre relu | Identités, redirections, reprise dossier et cycles React |

Node local : **24.22.3** ; Node CI configuré : **24.22.1**. React/ReactDOM web :
**19.2.4** ; React/ReactDOM mobile : **19.1.0** ; Zustand mobile : **5.0.15** ;
JSDOM : **29.0.2** ; Supabase web : **2.103.0** ; Anthropic : **0.82.0**.

Le workflow existant `account-deletion.yml` conserve les tests historiques et
exécute les nouveaux tests dans ses jobs publics. Aucun workflow parallèle
redondant n’est ajouté. Le sous-ensemble mobile contient 52 paquets : les
43 entrées React/JSDOM initiales sont conservées et les neuf entrées Supabase
correspondent au verrou mobile. L’installation locale des neuf paquets SDK
exacts a réellement réussi hors ligne. Le `npm ci` applicatif complet et
l’installation fraîche de tous les sous-ensembles ne sont pas revendiqués.

Pour reproduire les tests, suivre les installations temporaires et variables
du workflow, puis les commandes du relevé JSON. Le
[README des dépendances mobiles](../../tests/mobile-react-deps/README.md)
précise les environnements React et SDK distincts. Le premier lancement global
local avait omis `JURIS_TEST_DEPENDENCY_ROOT` exigé par deux suites historiques
OTS/collections : elles n’avaient pas démarré. Après définition du chemin des
dépendances exactes, sans changement des sources ni assertions, le corpus
complet a réussi. Cet essai initial reste mentionné dans le relevé.

## Limites de mise en service

- **BLOQUÉ — build web complet local :** Turbopack refuse le lien des
  dépendances situé hors de sa racine. Le workflow complet préexistant exige
  encore l’accès privé SMARANA documenté dans le lot précédent. Le typage
  global réussi ici ne remplace pas un build canonique propre.
- **NON TESTÉ — mobile natif complet :** typage/build Expo intégral, appareils
  iOS/Android, retour de lien par le système et Maestro.
- **NON TESTÉ — services réels :** allowlist Supabase du callback natif, email
  reçu et consommé, fournisseur IA, paiement, base persistante et RLS déployées.
- **PARTIEL — reprise :** l’identifiant est conservé lorsqu’une erreur HTTP
  est reçue. Une perte totale de réponse et l’idempotence générale des messages
  ne sont pas garanties ; aucune suppression ni relance aveugle n’est ajoutée.
- **NON TESTÉ — production et charge :** aucune promesse d’absence absolue de
  bug ou de latence ne découle de ces essais locaux. Le statut CI publié doit
  être vérifié sur la nouvelle tête de la PR avant intégration.

Ce lot fournit du code et des preuves de comportement. Il ne certifie pas les
conditions commerciales, la conformité juridique globale ou la disponibilité
de l’écosystème PURAMA.
