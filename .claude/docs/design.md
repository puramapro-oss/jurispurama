# PURAMA — DESIGN MODULE (chargé à la demande)
Module design complet : GOD MODE V5, variantes domaine, blocs UI dashboard, Purama Card V3. Chargé quand Claude Code crée/modifie des composants UI, pages frontend, ou le design system d'une app.

## DESIGN GOD MODE V5
Chaque app=UNIQUE et DIFFÉRENTE. JAMAIS 2 apps qui se ressemblent. JAMAIS "AI slop"(Inter/Roboto,gradients violets génériques). Sidebar desktop,bottom tabs mobile. 375→1920. **Code CSS complet dans skill design-code.**

**ADAPTER LE DESIGN AU DOMAINE(OBLIGATOIRE)**:Claude Code DOIT étudier le domaine de l'app AVANT de designer. Chaque domaine a son style visuel propre:

MIDAS(trading)→comme Robinhood/Binance:dark dense,charts Recharts vert/rouge,nombres gros font-mono,cards compactes data,ticker temps réel,sentiment gauge. Ambiance:sérieuse,premium,data-driven.
KAÏA/PRANA(bien-être)→comme Calm/Headspace:doux,organique,espaces respirants,coins très arrondis(rounded-3xl),couleurs nature pastel,animations lentes(spring 500ms),sons doux,illustrations minimalistes SVG nature. Ambiance:zen,apaisant,safe.
JurisPurama(juridique)→comme Notion/Linear:ultra-propre,structuré,police serif display(Cormorant),sections claires,iconographie fine,couleurs sobres,0 fantaisie. Ambiance:professionnel,sérieux,confiance.
SUTRA(vidéo)→comme CapCut/YouTube Studio:media-rich,thumbnails grid,timeline,player plein écran,badges créateur. Ambiance:créatif,dynamique,inspiring.
AKASHA/Purama AI(multi-IA)→comme ChatGPT:minimal,chat plein écran,bulles messages,input bar bas,0 distraction,sidebar conversations. Ambiance:clean,futuriste,intelligent.
EXODUS(RPG bien-être)→comme Duolingo/Habitica:gamifié,playful,progress bars colorées,badges brillants,mascotte,XP bar,level up animation,confettis. Ambiance:fun,motivant,addictif.
KASH(finance perso)→comme Revolut/N26:sleek,cards bancaires glass,transactions liste,graphiques épurés,nombres alignés mono. Ambiance:moderne,fiable,premium.
Compta(comptabilité)→comme Pennylane/QuickBooks:dashboards propres,tableaux,graphiques camembert,factures,vert=positif rouge=négatif. Ambiance:professionnel,clair,rassurant.
LUMIOS(associations)→comme Monday/Asana:kanban,listes,calendrier,couleurs organisationnelles,progress tracking. Ambiance:organisé,collaboratif.
Origin(création sites)→comme Framer/Webflow:preview live,drag feel,templates magnifiques,mode édition. Ambiance:créatif,puissant,moderne.

```css
.trading .data { @apply font-mono text-sm tabular-nums; }
.trading .positive { @apply text-emerald-400; }
.trading .negative { @apply text-red-400; }
.trading .chart-area { @apply h-[300px] bg-white/[0.02] rounded-xl p-2; }
.trading h1 { @apply text-xl font-bold; }
.legal { --color-accent: #6D28D9; --color-secondary: #F59E0B; --accent-rgb: 109,40,217; }
.legal h1 { font-family: 'Cormorant Garamond', serif; @apply text-3xl; }
.legal .glass-card { @apply rounded-xl p-6 border-white/[0.08]; }
.legal .content { @apply max-w-3xl mx-auto; }
.gamified { --color-accent: #22C55E; --color-secondary: #06B6D4; --accent-rgb: 34,197,94; }
.gamified .glass-card { @apply rounded-2xl p-5 border-2 border-white/10; }
.gamified .xp-bar { @apply h-3 rounded-full bg-white/10 overflow-hidden; }
.gamified .xp-fill { @apply h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-secondary)] transition-all duration-700; }
.gamified .badge { @apply w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg; }
```
**RÈGLE**:Claude Code lit le BRIEF→détermine le domaine→applique la variante CSS correspondante. Si aucune variante ne correspond→utiliser les defaults(glass cards classiques). JAMAIS mélanger les styles entre domaines.
**Responsive**:320-1920. 0 overflow. Safe areas iOS. Edge-to-edge Android. `pb-20 lg:pb-0`(compenser bottom tab). `lg:pl-[280px]`(compenser sidebar).
**CSS CODE+COMPOSANTS**:Voir skill `design-code` dans .claude/skills/. Contient:fond d'écran animé,glass card,bouton principal,sidebar desktop,bottom tab mobile,variantes CSS domaine,Hero3D+landing.

**DESIGN=APP(obligatoire)**:sidebar desktop+bottom tabs mobile+chat plein écran. JAMAIS site web 13 sections. JAMAIS Pollinations. Login=card glass max-w-md|Dashboard=sidebar 280px+grid cards DB|Chat=h-screen flex-col|Settings=glass cards liste.

**VISUAL VERIFICATION(OBLIGATOIRE après chaque page/composant)**:1."Un vrai utilisateur comprendrait-il cette page en 3 secondes?" 2."Un designer senior validerait-il ce résultat?" 3."Cette page ressemble-t-elle à [Robinhood/Calm/Notion/CapCut] selon le domaine?" Si la réponse est NON→REFAIRE LE DESIGN avant de continuer. Le code moche ne quitte JAMAIS la machine.

**RÈGLE ANTI-SLOP(OBLIGATOIRE)**:Avant CHAQUE composant UI,3 questions:1."Ressemble à une VRAIE app pro du domaine?"(trading=Robinhood,wellness=Calm,juridique=Notion)→si NON=REFAIRE 2."2 apps Purama pourraient avoir ce design?"→si OUI=REFAIRE 3."Designer senior dirait 'AI slop'?"→si OUI=REFAIRE.
**VALIDATION DESIGN(pipeline test)**:Après chaque feature→score design mental 0-10. Score<7=REFAIRE AVANT continuer.

## PAGE D'ACCUEIL APP — 3 BLOCS OBLIGATOIRES ABOVE THE FOLD
Dashboard ou homepage, PAS site web. JAMAIS landing 13 sections scroll→écran accueil APP(logo+"Commencer"+"Se connecter" comme ChatGPT).

**BLOC 1 — PARRAINAGE**:Card glass visible sans scroller. Contenu:"Invite tes amis, gagne X€ par filleul"+lien parrainage unique copiable 1 tap+QR code+compteur filleuls temps réel+gains cumulés animés. CTA:"Partager mon lien"→share sheet natif. Si 0 filleul→"Ton premier filleul te rapporte X€ dès son inscription".

**BLOC 2 — PROGRAMME AMBASSADEUR**:Card glass premium dorée. Contenu:"Deviens Ambassadeur Purama"+paliers visuels Bronze→Éternel avec montants(200€→200K€)+palier actuel surligné+barre progression vers palier suivant+gains potentiels calculés. CTA:"Postuler comme Ambassadeur"→/ambassadeur. "Influenceur"=INTERDIT dans toute l'UI→"Ambassadeur" PARTOUT.

**BLOC 3 — CROSS-PROMO APP PURAMA(-50% + PRIME)**:Card glass avec aperçu visuel de l'app promue(icône+screenshot+description 1 ligne). Afficher UNE SEULE app Purama cohérente avec le domaine actuel(mapping ci-dessous). Offre:"Découvre [APP]—-50% le premier mois+100€ de prime"+CTA "Essayer [APP]". **LIEN AUTO-PROMO**:`https://[slug].purama.dev/go/[source_app]?coupon=WELCOME50`. **FLOW AUTO-APPLY(user ne tape AUCUN code)**:1.User clique CTA→route `/go/[source]` 2.Route `/go/[source]?coupon=WELCOME50` stocke coupon+source dans cookie `purama_promo={coupon:"WELCOME50",source:"midas",expires:7j}` 3.Redirect→/signup ou /login 4.Après inscription→redirect /subscribe 5.Page /subscribe lit le cookie purama_promo→passe `coupon:WELCOME50` au Stripe Checkout Session(`discounts:[{coupon:"WELCOME50"}]`) 6.Stripe applique -50% auto→4,99€ affiché au lieu de 9,99€ 7.Webhook checkout.completed→prime J1 25€ wallet+tracking cross_promo. **CRÉER COUPON STRIPE(1× par app)**:`curl https://api.stripe.com/v1/coupons -u $STRIPE_SECRET_KEY: -d id=WELCOME50 -d percent_off=50 -d duration=once -d name="Bienvenue -50%"`. La prime 100€ s'ajoute normalement(J1→25€|J30→25€|J60→50€). Résultat user:premier mois 4,99€ ET 25€ prime=**user GAGNE 20,01€ net le premier mois**. Rotation:CRON hebdo change app promue. Tracking:`cross_promos(id,source_app,target_app,user_id,clicked_at,converted,coupon_used)`.

**MAPPING CROSS-PROMO(app source→apps à promouvoir en priorité)**:MIDAS→KASH,MOKSHA|KASH→MIDAS,MOKSHA|MOKSHA→KASH,JurisPurama|JurisPurama→MOKSHA,AKASHA|SUTRA→AKASHA,ADYA|AKASHA→SUTRA,MIDAS|VIDA→KAÏA,PRANA|KAÏA→VIDA,PRANA|PRANA→KAÏA,EXODUS|EXODUS→PRANA,VIDA|LUMIOS→MOKSHA,Origin|Origin→LUMIOS,AKASHA|Lingora→AKASHA,VEDA|ADYA→SUTRA,AKASHA|SATYA→AKASHA,JurisPurama|Compta→MOKSHA,KASH|MANA→AKASHA,Origin. Si app cible pas encore live→afficher la 2ème. Si aucune→masquer bloc 3.

## FONTS / APP (typo signature)
MIDAS #F59E0B Orbitron|SUTRA #8B5CF6 Space Grotesk|JurisPurama #6D28D9 Cormorant Garamond|KAÏA #06B6D4 Fraunces|VIDA #10B981 Syne|Lingora #3B82F6 Space Grotesk|KASH #F59E0B Manrope|EntreprisePilot #6366F1 Cabinet Grotesk|Purama AI #8B5CF6 Syne|Origin #D946EF Clash Display|AKASHA #00d4ff Space Grotesk|AETHER #E879F9 Outfit|EXODUS #22C55E Sora|PRANA #F472B6 Fraunces|Compta #0EA5E9 Manrope|LUMIOS #14B8A6 Cabinet Grotesk|MANA #A855F7 DM Sans

## BG / ANIMATIONS
**BG**:#0A0A0F→radial 8%→grille 60px→noise 3%→aurora 15s. Anims:spring(300,30),sheet+blur,crossfade,shimmer,haptic. Scroll:reveal,sticky,counter,magnetic,parallax,cursor glow. Framer:spring,stagger,tilt 3D,ripple.
**Hero3D**:R3F+MeshDistort+Stars. tsParticles. Lottie. PWA:SW+cache+manifest.
**Landing**(si demandé):cinématique 13s:hero→stats→features→démo→how→témoignages→pricing→FAQ→CTA→footer.
**Images**:Lucide+Pollinations(image.pollinations.ai/prompt/{DESC}?width=3840&height=2160&model=flux&enhance=true&nologo=true). next/image+lazy. JAMAIS Pollinations dans design app→icônes Lucide+gradients CSS.
**CSS**:.glass,.gradient-text. Z:Base1,Cards10,Modals1000.
**Mobile natif**:iOS=SF Pro+safe areas+swipe back+haptics. Android=Material You+edge-to-edge. Bottom sheet>modals.

## PURAMA CARD V3 — 12 FONCTIONNALITÉS
100% virtuelle.

F4 Carte Offline:paiements stockés chiffrés localement,réconciliation auto reconnexion,limite 50€/jour. Terme:"Mode Hors Ligne Purama".
F5 Carte Valeurs:3 valeurs perso(Famille|Santé|Liberté|Créativité|Impact Nature|Apprentissage|Aventure|Communauté). Chaque dépense scorée:"Yoga +94% aligné"|"Fast-food +12%". Rapport mensuel. Table:`user_values(user_id,valeur_1,valeur_2,valeur_3,score_alignement_mensuel)`
F6 Santé Financière Score:/100 hebdo. Ratio épargne/dépenses30%|Régularité25%|Diversification20%|Alignement valeurs15%|Protection découvert10%. Chaque point=micro-récompense. Table:`financial_health(user_id,score,breakdown jsonb,calculated_at)`
F7 Carte Familiale:jusqu'à 6 membres. Junior 8-12:budget hebdo parents,dépenses emojis,étoile dorée économie. Ado 13-17:autonomie,objectifs épargne visuels,1er investissement guidé 16 ans. Héritage financier transmissible. Table:`family_accounts(id,parent_id,member_id,role,weekly_limit,balance)`
F9 Tontine:10-50 personnes,X€/mois auto,chaque mois 1 membre reçoit cagnotte totale. Purama 9% frais. Terme:"Entraide Collective Purama". KYC+engagement 12 mois. Table:`tontines(id,name,members jsonb,montant_mensuel,tour_actuel,prochain_beneficiaire)`
F10 Carte Créatrice Richesse:portefeuille auto selon revenu(<1500€=100% Sécurisé|1500-3000€=60% Sécurisé+40% USDT Earn|>3000€=40% Sécurisé+40% Crypto+20% Or). Rééquilibrage auto. Terme:"Portefeuille Intelligent Purama". Mention risque crypto obligatoire.
F11 Notification Gratitude Vendredi:CRON 19h. Claude API(sonnet-4-6) perso avec vraies données. "Cette semaine:Bu X cafés→épargné X€. Total:X€."
F12 Carte P2P Instantanée:0,3s QR/NFC. Split auto. Offline+réconciliation. Commission 0,3%. Table:`p2p_transactions(id,sender_id,receiver_id,amount,status,offline_queued)`
F13 Objectif Immobilier:"Apport 30K€ en 5 ans"→arrondi+épargne mensuelle auto. Barre progression carte. À 80%→contact partenaires immobiliers invisibles. CPA courtier 200-500€. Table:`savings_goals(user_id,type,target_amount,current_amount,deadline,cpa_triggered)`
F14 Cashback Local:commerçants Purama Business. Boulangerie15%|Marché fermier12%|Artisan10%|Restaurant8%. Cashback financé commerçant. Purama 2%. Table:`local_merchants(id,name,category,cashback_rate,city,qr_code)`
F15 Carte Immortelle:100% virtuelle impossible perdre. Apple Pay/Google Pay. Nouveau token Stripe chaque tx. Numéro jamais exposé. Gel 1 tap. Réactivation 30s. Option physique bois recyclé+0,99€/mois NFC gravée. CPA Treezor carte physique +15€.

**ÉPARGNE AUTO**:Arrondi intelligent(4,30€→5€→0,70€ épargné) boost ×2/×5/×10. Fixe 0,50€/1€/2€/5€ par paiement. % salaire 1%/5%/10%/20% virement entrant. Protection:<50€ wallet=arrondis pause|>100€=reprennent. Jamais découvert.
**CPA CARTE COMPLET**:Treezor IBAN35+carte70+dépôt20+domicil80+1ère tx10+physique15|Binance(CPA_00BM2GEU29)75|Trade Republic40|Cashbee35|Courtier immo200-500=**TOTAL 365-665€/user**. Prime versée 100€. **MARGE:+265-565€/user.**
**CRONS CARTE**:QUOTIDIEN:Nature Score×cashback|réconciliation offline|protection<50€|progression objectifs. HEBDO vendredi 19h:notification gratitude Claude API|Score Santé Financière|rééquilibrage portefeuille. MENSUEL:calcul+versement tontine|rapport valeurs|commission 9% tontine|rapport commerçants 2%.
