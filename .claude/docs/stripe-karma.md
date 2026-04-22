# PURAMA — STRIPE + KARMA MODULE (chargé à la demande)
Module paiement/économie complet : Wealth Engine (split 50/10/40), Stripe Connect Embedded, Paiement & Abonnement, Notification Fiscale, Phases Treezor, OpenTimestamps. Chargé quand Claude Code touche aux paiements, au wallet, au Stripe, aux webhooks, ou aux règles économiques.

## WEALTH ENGINE
RÈGLE:Lire cette section+BRIEF avant toute implémentation. Tout automatique,zéro intervention.

**SPLIT IMMUABLE**:50% pool users|10% Association PURAMA(mécénat→réduction IS 60%)|40% SASU PURAMA. Sur abos uniquement. Reste(CPAs,carte,marketplace,micro-commissions)=100% SASU. JAMAIS modifier sans Tissma.

**ABO**:9,99€/mois/app|carte 0,99€. Gratuit=Points verrouillés FOMO. **PRIMES**:100€/app(1-100 sans plafond)+100€ carte(1×). J1→25€|J30→25€|J60→50€. KYC 1id=1prime/app. Résil<J60=récup prorata AUTO. Anti-fraude Guardian:même device/IP=blocage. Sources primes:1.CPA app 2.Pool péréquation surplus 3.Float Treezor 4.Abos 3m avant J60 5.Subventions Asso. PRIME_MODE=phase1→3paliers|phase2→100€ J1(après 1K users). CPA_POOL=true→MOKSHA+75|KASH+50|MIDAS+25=~150€/user.

**PRIME ANTI-FRAUDE — UX CHECKOUT(15/04/2026)**:UN SEUL bouton,ZÉRO friction,ZÉRO double option,ZÉRO checkbox visible. Affichage checkout:`"Ta prime de bienvenue t'attend. Elle est créditée sur ton compte Purama dès aujourd'hui." [Démarrer & recevoir ma prime] "En démarrant maintenant, tu bénéficies d'un accès immédiat à ton abonnement (art. L221-28 Code conso)."` Mention légale en petit sous bouton(font-size small,couleur muted,NON mise en avant). Base légale:Art.L221-28 3° Code conso→accès immédiat service numérique=renonciation rétractation 14j. Le waiver est implicitement activé par le clic. Pas besoin checkbox séparée.

**RÈGLES TECHNIQUES PRIME**:Prime versée en WALLET PURAMA uniquement(jamais virement bancaire direct). Retrait wallet bloqué 30 jours calendaires après souscription. Tranche1=J+0(au clic)|Tranche2=M+1|Tranche3=M+2. Annulation<30j=prime intégralement déduite du remboursement. Flag `subscription_started_at` en DB pour calcul 30j. Retrait conditionné:`subscription_started_at + 30 jours <= now()`.

**CLAUSE CGU PRIME(copier-coller dans chaque app)**:"Article X — Prime de bienvenue et droit de rétractation. En choisissant un accès immédiat à son abonnement Purama, l'utilisateur reconnaît et accepte expressément, conformément à l'article L221-28 3° du Code de la consommation, que l'exécution immédiate du service numérique entraîne la renonciation à son droit de rétractation de 14 jours. La prime de bienvenue est versée sous forme de crédits sur le wallet Purama de l'utilisateur, en trois tranches mensuelles à compter de la date de souscription. Ces crédits ne sont disponibles au retrait qu'après 30 jours calendaires consécutifs d'abonnement actif. En cas d'annulation de l'abonnement dans les 30 premiers jours, PURAMA se réserve le droit de déduire le montant des tranches de prime déjà versées de tout remboursement éventuellement accordé à titre commercial."

**CHECKLIST CLAUDE CODE PRIME**:Chaque app avec prime DOIT:bouton wording exact "Démarrer & recevoir ma prime"|mention L221-28 sous bouton(small,muted)|crédit wallet auto J+0 au paiement confirmé|CRON M+1 M+2 tranches 2+3|flag subscription_started_at en DB|retrait conditionné subscription_started_at+30j<=now()|CGU article prime dans onboarding|AUCUNE double option,AUCUN choix "accès standard" affiché.

**CPA INVISIBLES**:Universels~250-265€/user(Treezor IBAN35|carte70|dépôt20|domicil80|1ère tx10|Tink10-15|Synaps5-8). Spécifiques:MIDAS→Binance(CPA_00BM2GEU29)+Coinbase75-100|MOKSHA→Qonto+Pennylane115-175|KASH→Pennylane+Yomoni100-150|SUTRA→YT15-30|LUMIOS→Udemy20-40|LINGORA→Busuu15-25|VIDA→Withings10-20|MANA→Fiverr25-50|AKASHA→Notion15-25. Partenaires 100% invisibles,user voit que PURAMA. Contacter à partir de 1000 users payants.

**ENGAGEMENT**:Standard×1 mois/mois|Power12m×1,5 prime150€|Titan24m×2 prime250€|Éternel36m×3 prime400€. Multiplicateurs cumulables:streak_30j+×0,2|streak_90j+×0,3 PERMANENT|filleuls_3+×0,3|filleuls_10+×0,5 PERMANENT|nature_80+×0,2. ETERNAL RULE:×2 plancher PERMANENT après 36m. Compteur affiche gains réels VS sans multiplicateur. Switching cost:"Si tu pars tu perds X€". Table:`engagement_modes(user_id,app_id,mode,multiplicateur,debut,fin,prime_versee)`

**STRUCTURE FINANCIÈRE**:IBAN FR76/user Treezor invisible. Nom:"Mon Compte Purama"(jamais Treezor). Domiciliation salaire→CPA80€. 6 sous-wallets Smart Split(auto chaque entrée):Principal55%→dispo carte/retrait|Boost15%→bloqué30j+2%/mois→retour Principal|Emergency10%→plafonné 3mois dépenses|Dream10%→objectif visuel confettis|Pending5%→gains vérification|Solidaire5%→virement mensuel auto Asso PURAMA. Cagnotte Rémunérée:3%/an(bons Trésor4%-marge1%). Terme:"Cagnotte Rémunérée"(jamais "compte épargne"/"investissement"). Mention:"Pas un produit bancaire. Pas garanti. Modifiable 30j préavis." Tables:`wallets(user_id,balance,sub_wallets jsonb,iban_verified,domiciliation_active)` `cards(user_id,status,nature_score,mode_nature_categories,mindful_pay_threshold)`

**MICRO-COMMISSIONS(invisibles)**:Retrait IBAN0,5%|P2P0,3%|Points→€1%|Coffre5%|Marketplace9%(vendeur91%)|Missions/Défis/Jeux-concours9%. COMMISSION_TIERS_UNIVERSELLE=9%. COMMISSION_AFFICHAGE=false.

**GAINS DIRECTS**:Revenu quotidien(20%pool÷users actifs CRON minuit). Nature Rewards(12%pool)APIs HealthKit/Health Connect:5K pas=0,25€|10K=0,75€|sport30min=0,50€|1h=1,50€|Méditation=0,30€|sommeil7-8h=0,20€|<2h écran=0,50€|Cuisine=0,20€|2L eau=0,10€|vélo=0,50€|don×1,1. Plafond10€/jour|Combo5+catégories=×1,5|Nuit=×1,5. Missions marques(10%pool autofinancé). Classement top10(5%pool)→terme "Jeu-concours" participation gratuite obligatoire. Coffre Découverte(3%pool)1/user/semaine 0,50-5€. RÈGLE:chaque gain=versement immédiat wallet. 0 délai. 0 minimum.

**PARRAINAGE V4 — 3 NIVEAUX**:N1 filleul direct=50% abo+carte à vie|N2=15% à vie|N3=7% à vie. Versement auto J facturation filleul. Anti-fraude:30j activité réelle avant commission. Dashboard:arbre visuel 3 niveaux,gains temps réel,lien unique+QR code. Bonus filleul(vs inscription seule):+25€ prime app+25€ prime carte+1 mois offert+×2 tous gains 30j. Table:`referrals(parrain_id,filleul_id,level,monthly_commission,total_earned,active)`

**PALIERS AMBASSADEUR**:Bronze(10)=200€|Argent(25)=500€|Or(50)=1000€|Platine(100)=2500€|Diamant(250)=6000€|Légende(500)=12000€|Titan(1000)=25000€|Dieu(5000)=100000€|Éternel(10000)=200000€. Badge visible. Notification+animation. 1 versement/palier. LÉGENDE+:transmission héréditaire(Purama Legacy). Table:`ambassador_tiers(user_id,tier_name,achieved_at,prime_paid)`

**PURAMA SCORE(0-1000)**:Nature30%|Streak20%|Filleuls20%|Marketplace15%|Missions15%. Détermine:rang classement|cashback carte|accès exclusifs|priorité missions.

**SEASONS(trimestriel auto)**:Éveil(Jan-Mar)|Puissance(Avr-Jun)|Abondance(Jul-Sep)|Légende(Oct-Déc). CRON trimestriel:classement final→primes top1%=500€|top5%=200€|top10%=100€. Badges exclusifs+nouveau thème UI+règlement huissier(pré-signé 300€/règlement)+notification+email Resend+Social Feed. Financé 5% pool trimestriel.

**MAGIC MOMENT(premier retrait)**:Animation plein écran 3s+son cristallin+message perso Claude API+badge "Premier Retrait"+Story auto SUTRA+notification Social Feed(événement sans montant). ZÉRO intervention.

**SOCIAL FEED**:"[Prénom] palier Or"|"Mode Titan"|"a retiré ses gains"|"Nature Score 94/100". JAMAIS montants exacts→TOUJOURS événements. FOMO naturel→viralité organique.

**IMPACT DASHBOARD**:Onglet "Mon Impact" chaque app:CO2 évité(kg)|Éducation financée(heures)|Arbres plantés|Producteurs locaux soutenus. Calcul auto basé Nature Rewards.

**FLYWHEEL VISIBLE**:Homepage temps réel:"X users actifs→Pool Y€→Chaque user gagne +Z€"+"Plus on est nombreux, plus chacun gagne"+"[Inviter ami→+0,02€/jour]".

**CRONS OBLIGATOIRES**:QUOTIDIEN minuit:pool÷users→versement|nature rewards|streak+1 ou reset|cagnotte intérêts|vérif filleuls 30j|SEPA batch retraits|audit anti-fraude Guardian. HEBDO lundi:classement top10 remis à 0|pool distribué|coffre surprise/user|social feed maj. MENSUEL J facturation:commissions N1/N2/N3|prime trimestrielle|virement auto optionnel|email récap Resend|float IBAN→revenue. TRIMESTRIEL:changement season complet.

**7 AGENTS IA 24/7**:A1 GUARDIAN anti-fraude(fingerprint,bots,GPS,gel>80%,déblocage24h+10%)|A2 CURATOR modération marketplace(>70=publié|40-70=review|<40=rejet)|A3 MATCHER smart matching action rentable/user|A4 FINANCE versements,commissions,SEPA,FEC Pennylane,micro-commissions|A5 CLONE MASTER personnalisation/user|A6 GUIDE 7modes(Zen/Focus/Energy/Data/Mentor/Nature/Silencieux)|A7 GROWTH ADYA 12 plateformes,A/B test,CAC optimisation. TISSMA DASHBOARD:<30min/semaine alertes uniquement.

**PURAMA CARD**:Virtuelle brandée Purama(Treezor invisible). Apple Pay/Google Pay natif. Cashback 0-20% selon Nature Score. Don auto 0,5% chaque tx→wallet Asso. Suggestion IA alternative moins chère+éthique. Mode Nature:blocage volontaire/catégorie. Mindful Pay:pause 3s avant>50€. Carte Junior 13-17 supervision parentale. Retrait→IBAN 30s. Cashback:Bio/local/marchés=8%|Herboristerie=8%|Livres/formation=7%|Sport/yoga=7%|Artisans=6%|Transport écolo=6%|Culture=5%|Vêtements éthiques=5%|Courses=3%|Fast-food/alcool/fast-fashion=0%.

**MARKETPLACE**:User crée contenu/template/preset→vend. Commission 9% Purama|91% vendeur. Paiement immédiat. 0 minimum retrait. Table:`marketplace_items(id,seller_id,title,price,category,sales_count)`

**TERMES LÉGAUX**:Staking→Boost Fidélité|Dividende→Prime Trimestrielle|Compte épargne→Cagnotte Rémunérée|Micro-prêt→Entraide Purama(plafonné50€,0%,volontaire)|Investissement→Soutien Créateur|Salaire→Récompenses bien-être|Loterie→Jeu-concours(participation gratuite+règlement huissier)|Crypto/token→Purama Points(1pt=0,01€)|MLM→Parrainage Actif(conditionné 30j). IA=NOM_APP jamais Claude. Treezor/Swan invisibles=tout "Purama". Mentions UI:prime "3 paliers 90j. Récupérée prorata. CGU"|classement "Jeu-concours gratuit. Règlement huissier"|carte "Émise par Treezor SAS, EME agréé ACPR"|cagnotte "Pas produit bancaire. Pas garanti. Modifiable 30j"|parrainage "Commission après 30j activité réelle filleul."

**FISCALITÉ SASU**:ZFRR0%IS5ans→JEI→CIR30%R&D→IPBox10%→Mécénat Asso60%→Holding mère-fille0,75%. IS cible:0-3% à vie. Tissma:CCA1500€/m+IK667€/m=2058€ net(non imposable). 0€ URSSAF(0 salaire). 0€ IR.

**PRÉREQUIS LANCEMENT**:Bloquants:SIREN SASU+Contrat Treezor+ORIAS~300€/an. Avant:CGU/CGV auto+règlement huissier Season1 300€+RNA Asso confirmé. Après:Pennylane dès SIREN+DPO+registre RGPD.

**PROCÉDURE CLAUDE CODE NOUVELLE APP**:1.Lire BRIEF+section Wealth Engine entier 2.Activer UNIVERSELS:wallet 6 sub-wallets|compteur gains temps réel|Guide IA|carte Purama(onboarding étape2 OBLIGATOIRE)|parrainage|streak|milestones|Purama Score|magic moment|social feed|impact dashboard|flywheel|CGU/CGV auto|mentions légales 3.CONDITIONNELS selon BRIEF:Nature Rewards si bien-être(via HealthKit/Health Connect)|Marketplace si assets créables|Missions B2B si thème|CPA spécifique BRIEF 4.Personnalité Guide:finance→mentor|santé→coach|éducation→prof|juridique→conseiller|tech→partenaire|social→animateur 5.Filtre 3P:JAMAIS pub/promo/lien/ciblage/données tiers 6.CRONS quotidien+hebdo+mensuel+trimestriel 7.7 agents IA actifs dès premier deploy

## PAIEMENT & ABONNEMENT
JAMAIS in-app purchase. TOUJOURS Stripe web. Stripe1,5% vs Apple/Google30%=+28,5% marge. IN_APP_PURCHASE=false 100% apps.

**FLOW 4 ÉTAPES**:1.Bouton in-app→`window.open('https://purama.dev/subscribe?app=SLUG&user=UUID&return=purama://activate','_blank')` Safari/Chrome auto(jamais WebView). 2.Stripe Checkout hosted+bouton "Démarrer & recevoir ma prime"+mention légale L221-28 en petit sous bouton(ZÉRO checkbox→Art.L221-28 3° Code conso=waiver implicite par le clic)+3D Secure. 3.Webhook→Supabase is_subscribed=true+subscription_started_at=now()→page confirmation→deep link purama://activate→confettis+son+compteur grisé→or+25€ prime J1 créditée wallet. 4.Email Resend<24h(confirmation+date+prix+CGV+clause prime L221-28+contact).

**RÉTRACTATION — Art.L221-28 3°**:L'utilisateur accepte l'accès immédiat au service numérique=renonciation rétractation 14j. Waiver activé par le clic sur "Démarrer & recevoir ma prime". Mention discrète sous bouton suffit légalement. Prime versée wallet uniquement. Retrait bloqué 30j. Annulation<30j=prime déduite du remboursement. Table:`retractions(user_id,app_id,requested_at,amount_refunded,processed)`

**PAGE /settings/abonnement(OBLIGATOIRE)**:Afficher:plan+prix+date prochain prélèvement|statut Actif/Pause/Résilié|mode engagement+multiplicateur|bouton Passer Mode Power. Actions:[Pause 1 mois]→Stripe pause|[Changer plan]→redirect engagement|[Résilier]→flow 3 étapes. Infos:"Accès immédiat activé(art.L221-28)"|"Résiliation effective fin période"|"Données conservées 3 ans RGPD"

**RÉSILIATION 3 ÉTAPES**:1.Afficher pertes:"Tu vas perdre:→XX€ gains en attente→streak N jours→multiplicateur ×N→N filleuls(pertes commissions)". Boutons:[Annuler][Continuer] 2.Proposer pause:"Et si tu mettais en pause 1 mois? Tu gardes tout." Boutons:[Pause][Résilier quand même] 3.Feedback(Trop cher|Pas assez gains|Autre app|Autre)+[Confirmer]→Stripe cancel_at_period_end=true→email→"On espère te revoir. Compte actif jusqu'au [DATE]." Post-résiliation:accès fin période|données 3 ans|wallet+gains 12 mois|email J+7 "Tu nous manques"|email J+30 offre -50%.

**WEBHOOK STRIPE**:checkout.session.completed→activer abo+prime J1+email|subscription.created→Supabase|subscription.updated→maj|subscription.deleted→désactiver+email|invoice.payment_succeeded→enregistrer+email reçu|invoice.payment_failed→email relance 3 tentatives(J+1,J+3,J+7)|charge.refunded→rétractation+accès coupé. Table:`subscriptions(user_id,app_id,stripe_subscription_id,status,plan,started_at,ends_at,cancelled_at)`

**DEEP LINKS**:iOS Info.plist URL Scheme purama Identifier dev.purama.[SLUG]|Android AndroidManifest.xml intent VIEW+DEFAULT+BROWSABLE scheme purama. Links:purama://activate→confirmation+confettis+prime|purama://wallet|purama://retractation|purama://dashboard|purama://profile. Universal links:purama.dev/.well-known/apple-app-site-association+assetlinks.json. Gestion Expo:`Linking.addEventListener('url',({url})=>{const{path}=Linking.parse(url);if(path==='activate') triggerSubscriptionActivation()})`

**RÉSUMÉ AUTO**:Chaque app Claude Code crée:page /subscribe Stripe+bouton "Démarrer & recevoir ma prime"+mention L221-28|page /confirmation deep link|page /settings/abonnement|flow résiliation 3 étapes|webhook 7 events|deep links iOS+Android|email confirmation+CGV+clause prime Resend|email relance 3 tentatives|email retour J+7/J+30|tables subscriptions+retractions|flag subscription_started_at|retrait wallet conditionné 30j|mentions légales. JAMAIS:IAP,WebView,formulaire custom,checkbox rétractation(remplacée par L221-28).

## STRIPE CONNECT EMBEDDED COMPONENTS (19/04/2026)
- **Configuré le 19/04/2026** via https://dashboard.stripe.com/connect
- **Configuration choisie** :
  - Funds flow : "Buyers will purchase from you" + "Payouts can be split between sellers"
  - Industry : Other
  - Account creation : Embedded onboarding components
  - Account management : Embedded account components
  - Liability acknowledgé, identité Matiss DORNIER soumise et vérifiée
- **⚠️ IMPORTANT — PAS besoin de STRIPE_CONNECT_CLIENT_ID (ca_...)** : ce paramètre est UNIQUEMENT pour OAuth/Standard accounts. Les Embedded Components utilisent `AccountSession` créée côté serveur avec la `STRIPE_SECRET_KEY`.
- **Création AccountSession côté serveur** :
```typescript
// src/app/api/stripe/connect/account-session/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { accountId } = await req.json();
  const session = await stripe.accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true },
      account_management: { enabled: true },
      notification_banner: { enabled: true },
      payouts: { enabled: true },
      payments: { enabled: true },
      balances: { enabled: true },
      documents: { enabled: true },
    },
  });
  return Response.json({ client_secret: session.client_secret });
}
```
- **Site links configurés** (dashboard.stripe.com/settings/connect/emails) — 7 URLs Purama toutes en "Oui" :
  - Bannière notification → https://purama.dev/compte/notifications
  - Gestion comptes → https://purama.dev/compte/gestion
  - Virements → https://purama.dev/compte/virements
  - Paiements → https://purama.dev/compte/paiements
  - Soldes → https://purama.dev/compte/soldes
  - Documents → https://purama.dev/compte/documents
  - Configuration → https://purama.dev/compte/configuration
- **Universal links** : ces URLs fonctionnent web + iOS/Android via `.well-known/apple-app-site-association` et `assetlinks.json`.

## NOTIFICATION FISCALE
Automatique. Zéro intervention Tissma.

**RÈGLE**:Seuil déclaration 3000€ gains cumulés/an. En dessous=aucune obligation user. Au-dessus=user déclare. Purama émet DAS2 auto chaque user>3000€ via Pennylane dès SIREN.

**4 PALIERS AUTO**(1 seule notification/palier):
Palier1(1500€):push+email amical "Tu as gagné 1500€. À 3000€ tu devras déclarer. Aucune action requise."
Palier2(2500€):push+email "Plus que 500€ avant le seuil. Comment:impots.gouv.fr→case 5NG→montant Purama."
Palier3(3000€):push+email+banner in-app "Tu dois déclarer. Abattement 34% auto=imposé sur 66%. Purama t'envoie récapitulatif PDF en janvier."
Palier4(1er janvier):email auto TOUS users>0€. PDF joint:nom+total gains+détail source+mention légale.

**BANNER IN-APP**:Fond doré si>3000€:"Tu as gagné plus de 3000€. Pense à déclarer. [En savoir plus][J'ai compris]". Disparaît au clic. Réapparaît 1er avril. Disparaît définitivement 15 juin.

**PAGE /fiscal**:URL [app].purama.dev/fiscal. Contenu:seuils|3 étapes déclaration(impots.gouv.fr→case 5NG→montant)|abattement 34%(5000€→3300€ imposable)|récapitulatif janvier|questions→conseiller fiscal. Bouton [Télécharger récapitulatif annuel].

**RÉCAPITULATIF PDF**:Généré auto 1er janvier. En-tête Purama+logo|nom+prénom+email|période|tableau(primes/parrainage/Nature/marketplace/missions)|TOTAL|mention légale. PDF jsPDF/Puppeteer. Envoi Resend+dashboard Mes documents.

**DAS2**:Auto Pennylane 31 janvier pour chaque user>3000€/an. CRON. Zéro action Tissma.

**MENTION CGU**:"Les gains perçus via Purama peuvent être soumis à l'impôt sur le revenu selon votre situation fiscale et le montant perçu. En France, un seuil de déclaration s'applique à partir de 3 000€ de revenus annuels via des plateformes numériques. Purama vous informera automatiquement lorsque vous approchez de ce seuil. Purama ne saurait être tenu responsable des obligations fiscales individuelles de ses utilisateurs. Consultez un conseiller fiscal pour votre situation personnelle."

**TABLES**:`fiscal_notifications(id uuid,user_id uuid,palier integer,sent_at timestamptz,email_sent boolean,push_sent boolean,acknowledged boolean)` `annual_summaries(id uuid,user_id uuid,year integer,total_primes decimal,total_parrainage decimal,total_nature decimal,total_marketplace decimal,total_missions decimal,total_annuel decimal,pdf_url text,generated_at timestamptz)`

**CRONS FISCAUX**:QUOTIDIEN:vérifier franchissement 1500/2500/3000→notification(1 seule fois). 1er JANVIER:PDF+email Resend+dashboard. 31 JANVIER:DAS2 Pennylane users>3000€. 1er AVRIL:réafficher banner+email rappel. 15 JUIN:masquer banner.

## PHASES DE DÉPLOIEMENT — TREEZOR
Claude Code adapte AUTO le code selon la phase active.

**VARIABLE MAÎTRESSE**:`PURAMA_PHASE=1` dans chaque .env.local. Changer à 2 quand Treezor signé. SEULE variable→zéro redéploiement.

**PHASE 1(maintenant)**:CONDITION PURAMA_PHASE=1. ACTIF:abo 9,99€|prime 100€ 3 paliers|toutes fonctionnalités|wallet Points(pas IBAN)|parrainage|Nature Rewards,marketplace,missions|gains Purama Points(1pt=0,01€). PAS ACTIF:Purama Card|prime carte|IBAN user|retrait IBAN|Apple/Google Pay|CPA Treezor|Binance Earn. AFFICHAGE CARTE:CardTeaser "Purama Card—Bientôt disponible"+compteur "X personnes attendent"+"Me notifier en premier"→Supabase card_waitlist(user_id,app_id,notified,created_at). RETRAITS:"Disponible très bientôt"→engagement. PRIME:PRIME_MODE=phase1 J1→25€wallet|J30→25€|J60→50€. Message:"Tes 100€ t'attendent. La carte arrive bientôt."

**PHASE 2(après Treezor)**:CONDITION PURAMA_PHASE=2. COMMENT:1.Treezor envoie accès API 2.1 session Claude Code intègre 3.Tissma change PURAMA_PHASE=2 4.Tous users voient carte 5.Wallets basculent euros Treezor. S'ACTIVE:Purama Card virtuelle Apple/Google Pay|Prime carte 100€ auto|IBAN FR/user|Retrait IBAN 10s|CPA Treezor 215€/user|Domiciliation salaire|6 sous-wallets|Cagnotte 3%/an|Binance Earn/Trade Republic(si accords). MIGRATION:points→euros(1pt=0,01€)|100€ prime→wallet Treezor|email "Ta Purama Card est arrivée!"|notification push|animation confettis+son cristallin.

**VARIABLES .env.local**:PHASE 1:PURAMA_PHASE=1|CARD_AVAILABLE=false|IBAN_AVAILABLE=false|WITHDRAWAL_AVAILABLE=false|PRIME_CARD_ACTIVE=false|TREEZOR_ACTIVE=false|WALLET_MODE=points. PHASE 2:PURAMA_PHASE=2|CARD_AVAILABLE=true|IBAN_AVAILABLE=true|WITHDRAWAL_AVAILABLE=true|PRIME_CARD_ACTIVE=true|TREEZOR_ACTIVE=true|WALLET_MODE=euros|TREEZOR_API_KEY=[sandbox puis prod]|BINANCE_ACTIVE=true/false|TRADE_REPUBLIC_ACTIVE=true/false.

**COMPOSANTS PHASE 1**:CardTeaser(card grisée+cadenas doré+"Bientôt disponible"+"X attendent"+"Me notifier"). WalletPhase1(solde points|converti "=X€"|"Disponible au retrait dès carte"|barre progression). PrimePhase1(100€ accumulés|"Tes 100€ t'attendent"|"Disponibles dès carte activée").

**COMPOSANTS PHASE 2**:CardActivation(onboarding étape obligatoire→"Active ta carte"→API Treezor→carte virtuelle→CPA déclenché→prime carte planifiée). WalletPhase2(solde euros Treezor|6 sous-wallets|retrait IBAN 1 tap|historique). Migration CRON:PURAMA_PHASE 1→2→convertit points→euros|notifie users|déclenche prime carte existants.

**RÈGLE CLAUDE CODE**:Lire PURAMA_PHASE AVANT tout composant paiement/carte/retrait/prime carte. PURAMA_PHASE=1→version sans carte. PURAMA_PHASE=2→version complète. Code supporte 2 phases DÈS LE DÉPART. Commenter `// PHASE 1:points uniquement` `// PHASE 2:euros réels via Treezor(TREEZOR_ACTIVE=true)`. Chaque partenaire=variable indépendante activable sans redéploiement(TREEZOR_ACTIVE|BINANCE_ACTIVE|TRADE_REPUBLIC_ACTIVE|CASHBEE_ACTIVE|TINK_ACTIVE|SYNAPS_ACTIVE).

## OPENTIMESTAMPS (remplace OriginStamp)
- **Raison remplacement** : OriginStamp a fermé son Timestamp Dashboard le 31 mai 2025 (recentrage B2B OriginVault payant). Signup impossible.
- **Solution** : OpenTimestamps — open source, gratuit, blockchain Bitcoin native, zéro API key
- **Install** : `npm install javascript-opentimestamps` (déjà ajouté dans `npm i` pipeline P1)
- **Lib Purama** : `src/lib/opentimestamps.ts`
```typescript
import OpenTimestamps from 'javascript-opentimestamps';
import crypto from 'crypto';

export async function stampHash(data: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(data).digest();
  const detachedFile = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hash);
  await OpenTimestamps.stamp(detachedFile);
  return Buffer.from(detachedFile.serializeToBytes()).toString('base64');
}

export async function verifyProof(data: string, proofBase64: string): Promise<{ verified: boolean; blockHeight?: number; timestamp?: Date }> {
  const hash = crypto.createHash('sha256').update(data).digest();
  const detachedOriginal = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hash);
  const detachedProof = OpenTimestamps.DetachedTimestampFile.deserialize(Buffer.from(proofBase64, 'base64'));
  const result = await OpenTimestamps.verify(detachedProof, detachedOriginal);
  return result.bitcoin ? { verified: true, blockHeight: result.bitcoin.height, timestamp: new Date(result.bitcoin.timestamp * 1000) } : { verified: false };
}
```
- **Usage Purama** : horodatage règlements jeux-concours, preuves Nature Rewards, signatures KARMA, audit trail Wealth Engine
- **Terme UI** : "Preuve blockchain Purama" (jamais "OpenTimestamps" ni "Bitcoin")
- **Règle Claude Code** : `grep -r "originstamp" src/` = 0. Si trouvé → remplacer par `opentimestamps`.
