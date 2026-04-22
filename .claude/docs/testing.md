# PURAMA — TESTING MODULE (chargé à la demande)
Module de testing complet : 113 tests experts Playwright + sub-agents QA/Security + hooks + test commands. Chargé quand Claude Code prépare un deploy ou crée/modifie des tests.

## AGENTS QA + SÉCURITÉ
Le main agent code directement(il a tout le contexte). Sub-agents=uniquement pour QA et sécurité(contexte isolé,pas de pollution).
**qa.md** dans `.claude/agents/`:description="MUST BE USED after every feature and before deploy"|model:sonnet|tools:Read,Bash(npx/npm/curl/grep)|maxTurns:20. Prompt:"QA Purama. tsc→build→grep TODO/console.log/placeholder/faux contenu→PW tests→responsive 375+768+1440→Lighthouse→curl 200. TESTER COMME UN HUMAIN:cliquer chaque bouton,remplir chaque formulaire,tester auth réelle,tester déconnexion. 1 échec=BLOQUANT. Rapport ✅/❌."
**security.md** dans `.claude/agents/`:description="MUST BE USED before every deploy"|model:haiku|tools:Read,Bash(grep/find)|maxTurns:8. Prompt:"Scan:secrets/sk_live/passwords dans src/. RLS toutes tables. CORS. JWT httpOnly. CSP. Rate limit. Zod validation. DOMPurify. PASS/FAIL."

**QA-AGENT détaillé (.claude/agents/qa-agent.md)**:name:qa-agent|description:"Agent QA Purama — vérifie qualité avant commit/deploy. TOUJOURS avant deploy"|tools:Read,Bash,Write. "Tu es l'agent QA de Purama. BRUTAL et SANS PITIÉ. Tu ne valides JAMAIS par politesse." 22 points:BUILD→npm run build 0 erreur|0 console.error prod|0 env manquante. FONCTIONNEL→chaque feature BRIEF 100%|0 placeholder/TODO/"coming soon"|API keys connectées+testées|Auth Supabase login/logout/session|routes protégées redirect|formulaire principal soumet résultat réel. UI/UX→design conforme GOD MODE V5|responsive 375/768/1440|pas texte blanc/fond blanc|loading states tous async|error states user pas juste console. PERFORMANCE→pas boucle infinie/re-render|images next/image|pas secret hardcodé. DEPLOY→Vercel preview OK|env vars Vercel(pas juste local)|*.purama.dev accessible. Rapport:`QA REPORT—[APP]—[DATE] PASSÉ:X/22 BLOQUANTS:[liste] WARNINGS:[liste] VERDICT:DEPLOY OK/BLOQUÉ`. 1 BLOQUANT→REFUSE le deploy.

**SECURITY-AGENT détaillé (.claude/agents/security-agent.md)**:name:security-agent|description:"Audit sécurité complet avant prod"|tools:Read,Bash. SECRETS→0 API key hardcodée|0 secret dans logs|.env.local dans .gitignore|pas service_role côté client. AUTH→RLS toutes tables|middleware protège /dashboard /admin /api|JWT vérifié serveur|rate limiting API publiques. INPUT→Zod tous inputs|pas injection SQL|XSS impossible(dangerouslySetInnerHTML absent/sanitized). DÉPENDANCES→npm audit 0 critique/haute. Rapport:`SECURITY REPORT—[APP]—[DATE] CRITIQUES:[bloque] HAUTES:[bloque] MOYENNES:[48h] OK:X VERDICT:PROD OK/BLOQUÉ`. 1 critique ou haute→deploy BLOQUÉ.

## HOOKS — .claude/settings.json
```json
{"permissions":{"allow":["Bash(*)","Read(*)","Write(*)","Edit(*)"]},"model":"opus","effort":"high","hooks":{"SessionStart":[{"hooks":[{"command":"cat ~/purama/LEARNINGS.md 2>/dev/null | tail -20 || true"}]}],"PostToolUse":[{"matcher":"Edit|Write","hooks":[{"command":"npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"},{"command":"npx tsc --noEmit 2>&1 | head -20"}]}],"PreToolUse":[{"matcher":"Edit|Write","hooks":[{"command":"echo $CLAUDE_FILE_PATH | grep -qE '\\.(env|lock)$' && echo 'BLOCKED' && exit 1 || exit 0"}]}],"Stop":[{"hooks":[{"command":"grep -rn 'TODO\\|console\\.log\\|placeholder\\|any:\\|10.000\\|5.000\\|99%\\|témoignage\\|Lorem\\|avis client' src/ 2>/dev/null | head -10 && echo '⛔ PLACEHOLDERS OU FAUX CONTENU — CORRIGE' && exit 2 || echo '✅ Clean'"}]}]}}
```

## TESTING — 113 TESTS EXPERTS
Claude Code SE COMPORTE comme un vrai utilisateur humain. Il ouvre l'app LIVE sur le web, clique sur TOUT, remplit TOUT, vérifie TOUT. Pas de simulation — des vrais appels HTTP/Playwright sur la vraie URL déployée. Si 1 SEUL test échoue→CORRIGER→re-tester TOUT→deploy UNIQUEMENT quand 100% passe.

**ÉTAPE 0 — PRÉ-DEPLOY CHECKS(avant même de déployer)**:
```bash
# 1. Code propre
npx tsc --noEmit # 0 erreur
npm run build # 0 erreur 0 warning
grep -rn 'TODO\|console\.log\|placeholder\|any:\|10.000\|5.000\|99%\|témoignage\|Lorem\|avis client\|coming soon\|FIXME\|originstamp' src/ # 0 résultat (originstamp=retired mai 2025)
# 2. Sécurité
grep -rn 'sk_live\|sk_test\|password\|secret' src/ --include="*.ts" --include="*.tsx" | grep -v '.env' # 0 résultat
# 3. Deploy preview
vercel --token $VERCEL_TOKEN --scope puramapro-oss --yes # preview URL
# 4. Smoke test preview
curl -s -o /dev/null -w "%{http_code}" https://PREVIEW_URL # 200
```

**ÉTAPE 1 — TEST HUMAIN LIVE(Playwright sur URL déployée)**:
PW config:baseURL=https://SLUG.purama.dev,timeout:30s,retries:2,viewports:[{w:1920,h:1080},{w:768,h:1024},{w:375,h:812}].

```
PHASE A — PREMIER CONTACT (je suis un user qui découvre l'app pour la 1ère fois)
1. Ouvrir URL navigation privée. Charge en <3s ? Écran beau/pro ? 0 cassé visuellement ?
2. Fond vivant(orbes gradient animés, PAS noir plat) ? Cards glass(blur+border) ? Design DOMAINE(trading=data dense, wellness=doux, juridique=structuré) ?
3. LIRE chaque texte visible mot par mot. 0 faux chiffre ? 0 Lorem ? 0 TODO ? 0 témoignage inventé ?
4. CLIQUER sur CHAQUE lien et CHAQUE bouton de l'écran. Chacun fait quelque chose ? 0 bouton mort ? 0 lien cassé ?
5. Mobile 375px:0 overflow ? Texte lisible ? Boutons>44px ? Bottom tab bar visible ? Safe areas iOS ?
6. Tablette 768px:layout adapté ? Sidebar visible ou menu burger ? 0 zone vide bizarre ?
7. BLOC PARRAINAGE visible above the fold ? Lien copiable ? Compteur ? CTA "Partager" ?
8. BLOC AMBASSADEUR visible above the fold ? Paliers ? Barre progression ? CTA "Postuler" ?
9. BLOC CROSS-PROMO visible ? App cohérente avec le domaine ? Lien /go/[source]?coupon=WELCOME50 ?
10. Favicon custom Purama(pas Next.js default) ? OG image ? Meta title+description remplis ?

PHASE B — INSCRIPTION (je crée un compte comme un vrai user)
11. Page /signup:formulaire propre ? Champs email+password+nom ? Validation Zod FR si erreur ?
12. S'inscrire avec email test@test.com → email de confirmation reçu Resend ? Lien de confirmation fonctionne ?
13. S'inscrire avec Google OAuth → redirect fonctionne ? Pas d'erreur "provider not enabled" ? Retour dashboard ?
14. Profil affiche bon nom/email/avatar ?
15. Session persistante ? Refresh→toujours connecté ? Cookie httpOnly Supabase ?

PHASE C — NAVIGATION COMPLÈTE (j'explore CHAQUE page comme un curieux)
16. Sidebar desktop:cliquer CHAQUE lien→chaque page charge sans erreur ? Retour possible ?
17. Bottom tabs mobile:CHAQUE tab→page charge ? Active state visible ?
18. Cmd+K recherche:s'ouvre ? Résultats pertinents ? Cliquer résultat→navigation ?
19. CHAQUE formulaire visible:remplir avec données réelles→validation Zod FR→soumission→feedback success ?
20. CHAQUE formulaire:soumettre VIDE→messages d'erreur FR explicites ? Pas de crash ?
21. Navigation profonde:aller dans un sous-menu→revenir→re-aller→pas de boucle/crash ?
22. URL directe:taper /dashboard,/wallet,/settings directement→page charge(si connecté) ou redirect /login(si non connecté) ?
23. Page 404:taper URL invalide→page 404 custom Purama(pas erreur Next.js default) ?

PHASE D — FEATURES CORE (j'utilise VRAIMENT l'app comme le ferait un client payant)
24. Feature IA principale:envoyer un message au chat→réponse IA reçue ? Streaming ? Pas d'erreur API ? IA se présente comme [APP] pas "Claude" ?
25. Envoyer un 2ème message→contexte maintenu ? Conversation cohérente ?
26. Parrainage:générer lien→copier→ouvrir 2ème nav privée→coller→page d'inscription s'ouvre avec referral code ?
27. S'inscrire via lien parrainage→le parrain voit le filleul dans son dashboard ? Commission calculée ?
28. Wallet:solde affiché ? Historique transactions ? Bouton retrait existe(Phase 1=grisé+"Bientôt disponible") ?
29. /financer:wizard 4 étapes fonctionne ? Profil→aides matchées avec cumul→PDF se génère→suivi accessible ?
30. /financer bandeau pricing:"La plupart de nos clients ne paient rien grâce aux aides"→lien vers /financer ?
31. Chatbot aide:poser question→réponse ? Formulaire escalade→envoie email Resend ?
32. Cross-promo:cliquer lien /go/[source]?coupon=WELCOME50→cookie posé→redirect signup ?
33. /settings/abonnement:plan+prix+statut affichés ? Boutons Pause/Résilier présents ?
34. /fiscal:page accessible ? Seuils affichés ? Étapes déclaration ? Bouton télécharger ?
35. Page /ambassadeur:paliers affichés ? CTA ? Formulaire postuler ?

PHASE E — EDGE CASES (je teste les cas limites comme un testeur QA senior)
36. Double-clic sur bouton soumission→pas de double requête ?
37. Connexion internet coupée→message offline ? Pas de crash ?
38. Token expiré→redirect /login proprement ? Pas d'écran blanc ?
39. Input très long(500 chars)→pas de overflow ? Troncature propre ?
40. Input avec caractères spéciaux(<script>alert('xss')</script>)→sanitized ? Pas d'exécution ?
41. Refresh page au milieu d'un formulaire→données conservées ou message "quitter la page?" ?
42. Ouvrir 2 onglets même compte→pas de conflit ? Données synchronisées ?

PHASE F — PARAMÈTRES (je personnalise tout)
43. Thème dark→light→OLED→change VISUELLEMENT partout ? Pas de flash blanc ? Persiste après refresh ?
44. Langue FR→EN→TOUS textes changent ? Pas de texte FR résiduel ? Persiste ?
45. Déconnexion→retour /login ? Session effacée ? localStorage/cookies nettoyés ?
46. Tenter accéder /dashboard après déconnexion→redirect /login ?
47. Se reconnecter→TOUTES les données encore là(profil,wallet,conversations,filleuls) ?

PHASE G — PERFORMANCE & ACCESSIBILITÉ
48. Lighthouse:Performance>85|Accessibility>90|SEO>90|Best Practices>85 ?
49. LCP<2.5s ? FCP<1.5s ? CLS<0.1 ?
50. Console navigateur:0 erreur JS ? 0 warning critique ?
51. Contraste texte:ratio 4.5:1 minimum(WCAG AA) ?
52. Aria labels sur boutons icônes ? Tab navigation possible ?

EXPERT 1 — DESIGNER SENIOR (je juge comme un designer Apple/Spotify)
53. Spacing cohérent PARTOUT:même padding cards,même gap entre éléments,même margin sections ? 0 pixel décalé ?
54. Typographie:hiérarchie claire(h1>h2>h3),même font-weight par niveau,line-height lisible(1.5 minimum corps),letter-spacing titres ?
55. Couleurs:palette Purama respectée(#0A0A0F/#7C3AED/#06B6D4) ? Pas de couleur random ? Cohérence hover/active/focus states ?
56. Animations:transitions fluides(200-300ms),pas de saccade,pas de flash,éléments qui apparaissent avec fade/slide(pas pop brutal) ?
57. Micro-interactions:boutons ont feedback au clic(scale 0.95),inputs focus ring visible,toggle smooth,skeleton loading shimmer ?
58. Scroll:smooth scroll,pas de jumpiness,parallax fluide si utilisé,sticky header fonctionne ?
59. Dark mode CHAQUE composant:cards,modals,dropdowns,tooltips,inputs,badges→TOUS adaptés ? Pas de texte invisible ?
60. Comparaison mentale:"Cette app pourrait être sur l'App Store à côté de Spotify/ChatGPT/Revolut ?" Si NON→REFAIRE.

EXPERT 2 — PENTESTER SÉCURITÉ (je tente de casser l'app)
61. Tenter accéder /admin sans être admin→redirect /login ou 403 ? Pas de fuite données ?
62. Tenter accéder API /api/admin/* avec token user normal→401/403 ?
63. Tenter modifier l'user_id dans une requête API→RLS bloque ? Pas d'accès aux données d'un autre user ?
64. Tenter SQL injection dans champs recherche/formulaire:`'; DROP TABLE profiles;--`→Zod bloque ou Supabase paramétré ?
65. Vérifier headers sécurité:X-Frame-Options,X-Content-Type-Options,Strict-Transport-Security,Content-Security-Policy présents ?
66. Cookies:httpOnly=true,secure=true,sameSite=lax ? Pas de token dans localStorage visible ?
67. Rate limiting:envoyer 100 requêtes /api/ai/chat en 10s→429 Too Many Requests après le seuil ?
68. CORS:fetch depuis un autre domaine→bloqué ? Seul *.purama.dev autorisé ?
69. Secrets:grep dans le build output(/.next/)→0 API key/secret/password visible ?

EXPERT 3 — INGÉNIEUR PERFORMANCE (je mesure tout)
70. Bundle size:`npx @next/bundle-analyzer`→pas de page>500KB ? Components>50KB→dynamic import ?
71. API response time:CHAQUE route API<500ms ? Chat IA streaming commence<2s ?
72. Images:toutes via next/image ? Format WebP/AVIF ? Lazy loading ? Pas d'image>200KB ?
73. Code splitting:chaque page charge UNIQUEMENT son JS ? Pas de vendor bundle>300KB ?
74. DB queries:pas de N+1 ? Index sur les colonnes filtrées(user_id,email,referral_code) ?
75. TTFB<800ms ? Vérifier avec:`curl -o /dev/null -s -w "TTFB:%{time_starttransfer}" https://SLUG.purama.dev`
76. Memory leaks:naviguer 20 pages→revenir accueil→pas de ralentissement ? useEffect cleanup partout ?

EXPERT 4 — SPÉCIALISTE ACCESSIBILITÉ (WCAG AA complet)
77. Keyboard:Tab parcourt TOUS les éléments interactifs dans l'ordre logique ? Focus visible(ring) ?
78. Escape ferme les modals/dropdowns ? Enter active les boutons ?
79. Screen reader:chaque bouton icône a aria-label ? Images ont alt ? Régions landmarks(main,nav,header) ?
80. Formulaires:chaque input a label associé ? Erreurs annoncées aria-live ? Required indiqué ?
81. Contraste CHAQUE élément texte:vérifier avec axe-core→0 violation "color-contrast" ?
82. Animations:prefers-reduced-motion respecté ? Animations désactivées si activé ?
83. Zoom 200%:contenu reste lisible et utilisable ? Pas de horizontal scroll ?

EXPERT 5 — QA MOBILE (je teste comme un user iPhone/Android)
84. Touch targets:CHAQUE bouton/lien>44×44px ? Pas de zone morte entre boutons proches ?
85. Clavier virtuel:formulaires→clavier s'ouvre→contenu scroll pour rester visible ? Pas masqué ?
86. Safe areas:contenu pas caché sous notch iPhone/barre navigation Android ?
87. Orientation:portrait OK ? Paysage→layout adapté ou verrouillé portrait ?
88. Pull-to-refresh:dans les listes→refresh data ? Pas de double scroll avec le navigateur ?
89. Bottom tab bar:toujours visible(pas cachée par clavier) ? Active state clair ? Badge notification si pertinent ?
90. Swipe back(iOS):naviguer en arrière par swipe→fonctionne ? Pas de conflit avec sidebar ?
91. PWA:manifest.json valide ? Icône custom ? Splash screen ? Installable "Ajouter à l'écran d'accueil" ?

EXPERT 6 — ANALYSTE BUSINESS (je vérifie le tunnel de conversion)
92. Onboarding:un nouveau user comprend-il EN 30 SECONDES ce que l'app fait et pourquoi s'inscrire ?
93. Pricing clair:9,99€/mois affiché clairement ? Prime 100€ mise en avant ? Calcul "tu gagnes plus que tu paies" visible ?
94. FOMO:user gratuit voit-il ses points VERROUILLÉS avec un cadenas ? Motivation à souscrire ?
95. Parrainage funnel:de "voir le bouton" à "partager le lien"→combien de clics ? Doit être ≤2 clics.
96. Cross-promo conversion:le BLOC 3→CTA visible→clic→cookie→inscription→coupon appliqué→tout le funnel fonctionne ?
97. Retention hooks:streak visible ? Compteur de jours consécutifs ? Notification "Ne perds pas ta série !" ?
98. Magic moment:le user voit-il rapidement sa PREMIÈRE récompense(prime J1 25€) ? Confettis ? Sentiment de victoire ?

EXPERT 7 — RÉDACTEUR/COPYWRITER (je lis chaque mot)
99. 0 faute d'orthographe/grammaire FR sur TOUTE l'app ? Vérifier chaque page.
100. Ton cohérent:tutoiement PARTOUT(jamais "vous") ? Emojis utilisés naturellement ? Pas de ton robotique ?
101. Micro-textes:boutons ont des verbes d'action("Commencer","Découvrir","Partager") pas des noms("Soumission","Envoi") ?
102. Empty states:quand une liste est vide→message encourageant+CTA("Commence ton premier...") pas juste vide ?
103. Erreurs:messages FR humains("Oups, quelque chose n'a pas marché. Réessaie !" pas "Error 500 Internal Server Error") ?
104. Texte légaux:CGU/CGV/mentions légales complets ? Article prime L221-28 présent ? SASU PURAMA 8 Rue Chapelle 25560 Frasne ?

EXPERT 8 — INGÉNIEUR API (je teste chaque endpoint)
105. GET /api/status→200+JSON valide avec version+uptime
106. POST /api/ai/chat avec token valide→réponse IA streaming
107. POST /api/ai/chat SANS token→401 Unauthorized
108. POST /api/ai/chat avec input vide→400+message FR
109. POST /api/stripe/webhook avec signature invalide→400
110. GET /api/wallet avec token user→solde correct
111. GET /api/referral avec token→lien parrainage+stats filleuls
112. Chaque route API avec méthode HTTP incorrecte(GET au lieu de POST)→405 Method Not Allowed
113. Chaque route API avec payload malformé→400+message explicite FR pas stack trace
```

**ÉTAPE 2 — RAPPORT & CORRECTION**:
Rapport:`TEST EXPERT—[APP]—[DATE]—PASSÉ:X/113—ÉCHOUÉ:[liste détaillée]—VERDICT:DEPLOY OK/BLOQUÉ`
Si VERDICT=BLOQUÉ:1.Lister TOUS les bugs 2.Corriger CHAQUE bug 1 par 1 3.Re-tester les tests échoués 4.Si 1 nouveau bug→re-tester TOUT 5.Boucler jusqu'à 113/113 ✅

**ÉTAPE 3 — DEPLOY PROD(uniquement si 113/113 ✅)**:
```bash
# Invoquer qa-agent→VERDICT OK
# Invoquer security-agent→VERDICT OK
vercel --prod --token $VERCEL_TOKEN --scope puramapro-oss --yes
# Vérifier prod
curl -s -o /dev/null -w "%{http_code}" https://SLUG.purama.dev # 200
curl -s https://SLUG.purama.dev | grep -c "TODO\|Lorem\|placeholder" # 0
# Smoke test prod
npx playwright test --config=playwright.prod.config.ts # PASS
```
**RÈGLE ABSOLUE**:1 seul test échoué sur 113=deploy INTERDIT. Pas d'exception. Pas de "c'est mineur". Pas de "on fixera après". CORRIGER→RE-TESTER→DEPLOY uniquement quand TOUT est vert. L'app DOIT être au niveau App Store(ChatGPT/Spotify/Revolut) ou elle ne sort PAS.

## COMMANDS /deploy /test-full /audit
**COMMAND /deploy(.claude/commands/deploy.md)**:1.Invoque qa-agent→attends VERDICT OK 2.Invoque security-agent→attends VERDICT OK 3.npm run build 0 erreur 4.vercel --prod 5.Teste URL prod curl 6.Rapport URL live+status. Si QA ou Security BLOQUÉ→STOP ne deploy PAS.
**COMMAND /test-full(.claude/commands/test-full.md)**:Lance checklist 22 points:build+lint|chaque feature BRIEF|curl chaque API|auth flow Supabase|responsive 375px|rapport ✅/❌ par point.
**STOP HOOK(.claude/hooks/stop-verify.sh)**:Déclenché à chaque fin de turn. Questions:1.Build passe? 2.Feature BRIEF 100% finie? 3.TODO/placeholders restants? Si OUI→CONTINUE ne t'arrête pas.

## VÉRIFICATION OBLIGATOIRE AVANT "TERMINÉ" (10 checks)
1.curl -s URL→200 2.Cliquer CHAQUE bouton PW→vérifie action 3.Tester inscription email RÉELLE 4.Tester Google OAuth RÉELLE(redirect_uri+provider enabled VPS) 5.Responsive 375+768+1440→0 overflow 6.`grep -r "10.000\|5.000\|99%\|témoignage\|Lorem" src/`=0 faux contenu 7.Thème dark/light CHANGE vraiment 8.Langue FR/EN CHANGE vraiment 9.Déconnexion→retour /login 10.1 échec=CORRIGER avant "terminé".

## REGRESSION GUARDIAN
Avant CHAQUE deploy, tester les 3 flows critiques:1.Inscription→login→dashboard→feature principale→déconnexion 2.Parrainage→lien→inscription filleul→commission visible 3.Wallet→solde→historique. Si 1 des 3 flows casse→le deploy est INTERDIT même si la nouvelle feature marche.
