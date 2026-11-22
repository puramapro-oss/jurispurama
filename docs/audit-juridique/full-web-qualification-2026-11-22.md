# Qualification web complète — proposition du 22 novembre 2026

## Point de départ vérifié

PR2 à `320711b5a456c7051000e495f4bc3520dd6aa155` : CI `44971255694` réussie, 110 tests Node frontend, 27 OTS, 87 Chromium, régressions serveur/PostgreSQL et types ciblés PASS ; lint global 0 erreur / 2 avertissements conservés. Cette qualification publique ne constitue pas un nouveau build complet.

Le verrou applicatif résout SMARANA à `531cc653c81ffa3c99ab94667067f217deb5f944`. Il s’agit du même commit admis dans YANA et NIDRA. Le manifeste de 21 fichiers est repris de la qualification YANA ; il contient uniquement chemins, tailles et empreintes SHA-256/Git, aucun code privé. Le package ESLint canonique est déjà présent dans `tooling` : aucun accès au dépôt `purama-master` n’est nécessaire pour ses sources.

La présence de clés privées dans les secrets JURIS n’a pas été confirmée. Le connecteur disponible n’expose pas cette API et le CLI local n’a pas de session authentifiée. Une réussite dans un autre dépôt ne démontre pas cette présence.

## Admission et installation proposées

Le workflow séparé `Full web qualification` s’exécute uniquement pour une PR issue du même dépôt. Il conserve le workflow et les 87 scénarios existants. Aucun déploiement, migration distante, activation de fournisseur ou écriture sur main n’est ajouté.

1. Exécuter les tests synthétiques sans credentials, puis exiger un nom d’accès connu : `SMARANA_READ_SSH_KEY`, ou `PURAMA_PACKAGES_READ_SSH_KEY` si le premier est absent. L’absence des deux fait échouer le job. La permission de lire SMARANA doit ensuite être démontrée par l’acquisition réelle ; elle n’est pas déduite du nom du secret.
2. Réutiliser le transport SSH borné de YANA : identité temporaire propre, clé hôte GitHub fixe, agent et configuration héritée écartés, délai et sortie bornés. Récupérer uniquement le commit verrouillé en profondeur 1 et lire tous ses blobs admis. Refuser gitlinks, symlinks, fichiers supplémentaires, dérive d’empreintes, scripts lifecycle, workspaces, binaires de package ou points d’entrée non admis.
3. Conserver un miroir Git local du commit et de son arbre exacts. Retirer le remote et les marqueurs de récupération différée ; vérifier les objets avec `git fsck`. Le miroir ne contient ni historique hors de la révision admise, ni hook, alternate, ref de remplacement, configuration d’authentification ou source privée supplémentaire.
4. Détruire l’identité SSH et ses répertoires temporaires dans le transport et dans un nettoyage de workflow `always()`. Vérifier leur absence, les métadonnées du miroir et l’absence d’authentification du checkout avant tout cycle npm applicatif.
5. Lancer le vrai `npm ci --ignore-scripts --no-audit --no-fund`, sans modifier `package.json` ni `package-lock.json`. Les seules réécritures Git du processus enfant conduisent les URL de SMARANA à ce miroir ; les autres transports Git sont interdits. Aucune configuration Git globale n’est écrite. npm peut tenter son archive GitHub sans authentification avant de revenir au miroir ; tous les fichiers privés installés sont ensuite comparés au manifeste, donc cette voie ne dispense pas de l’admission.
6. Vérifier les 19 fichiers privés que npm doit installer, les deux exclusions standard étant `.gitignore` et `package-lock.json`. Les dépendances publiques imbriquées doivent correspondre à des entrées de registre avec intégrité dans le verrou, à leurs noms/versions et à des liens binaires internes. Leurs tarballs sont contrôlés par le vrai npm. Toute source privée supplémentaire, modifiée ou manquante est refusée.
7. Exécuter `npm rebuild` dans une étape sans credentials, vérifier encore les sources installées et le verrou, puis `next typegen`, TypeScript web complet et `npm run build` avec les sources/configurations applicatives inchangées.

## Réseau, données et artefacts

Le build reçoit uniquement une URL Supabase synthétique et une clé publique de fixture. Il ne reçoit ni secret de service, ni clé de fournisseur, ni fichier d’environnement de production.

Le garde Node repris de NIDRA refuse fetch, HTTP/HTTPS et connexions TCP hors du contexte local et des hôtes Google Fonts sur 443, nécessaires aux polices existantes. Une tentative refusée reste journalisée et fait échouer le contrôle final même si l’application a capturé l’erreur. Ce garde cible les transports Node ; il ne constitue pas une isolation réseau générale des exécutables natifs.

Le workflow conserve seulement les logs de qualification et les reçus d’empreintes. Aucun SDK, `node_modules`, cache npm, `.next` ou source privée ne fait partie des artefacts publiés. Le miroir privé et le cache npm propres au job sont supprimés ; aucun cache Actions de dépendances privées n’est activé.

## Preuves locales et portée

- 40 tests synthétiques PASS, sans échec ni skip : Git réel, admission du commit/arbre, exclusion de l’historique et des objets supplémentaires, rejet de scripts/symlinks/gitlinks/fichiers supplémentaires, échecs expurgés, conservation d’un dossier préexistant, retrait effectif des identités, préflight exécuté par Bash et CLI réel en absence de clé.
- La contre-revue indépendante a reproduit un ajout d’objets historiques suivi du retrait de la frontière shallow : tous les objets devenaient atteignables, ce que la première comparaison acceptait. La vérification exige désormais explicitement un seul commit atteignable, égal au pin. Le contre-test échoue avant cette garde et réussit après.
- Le vrai npm ci utilise une application synthétique dont la dépendance et le lock conservent l’URL GitHub originale. Seule la réponse d’archive indisponible est une fixture HTTP 404 ; npm et Git restent réels. Les sockets sont interdites, Git ne peut utiliser que `file`, les manifestes restent identiques et le lifecycle de l’application synthétique ne s’exécute pas. Ce test ne prétend pas avoir authentifié JURIS auprès du dépôt privé.
- Le manifeste réel de package SMARANA est comparé à son empreinte connue et à l’entrée du verrou JURIS, sans exécuter son code : version/dépendances cohérentes, absence de scripts lifecycle.
- Lint global de la proposition : 403 fichiers, 0 erreur et les 2 avertissements de navigation existants ; aucune règle ou exclusion ajoutée. YAML et syntaxe Bash des étapes contrôlés.

**Statut : proposition en revue, non publiée.** La présence des accès JURIS, l’installation privée réelle, le typage global et le build de cette proposition restent NON TESTÉS jusqu’à un résultat CI effectif. Un build réussi ne qualifierait toujours pas l’authentification réelle, les données persistantes, les fournisseurs, la validité juridique ou la production.
