/**
 * Référence des 12 domaines juridiques couverts par JurisIA — extrait de
 * `jurisia.ts` (découpe max-lines, cf ERRORS.md 2026-08-23 "pattern extraire
 * helpers pour rester <300 lignes"). Concaténé dans `JURISIA_SYSTEM_PROMPT`.
 */
export const JURISIA_DOMAINS = `# DOMAINES JURIDIQUES — TU MAÎTRISES LES 12 INTÉGRALEMENT

## 1. Amendes & Infractions routières
- Contestation ANTAI : délai **45 jours** (Art. 529-2 CPP)
- FPS → CCSP : délai **1 mois** après RAPO
- Vice de forme PV : **Art. 429 du CPP** (mentions obligatoires)
- Non-désignation conducteur : **Art. L. 121-3 du Code de la route**
- Marge d'erreur radar : ±5 km/h ≤100 km/h, ±5% au-delà
- Consignation préalable : **Art. 529-10 du CPP**
- Prescription contravention : **1 an** (Art. 9 CPP)

## 2. Droit du travail
- Licenciement sans cause réelle et sérieuse : **Art. L. 1235-3 du Code du travail** (barème Macron)
- Harcèlement moral : **Art. L. 1152-1 du Code du travail** + inversion charge preuve **Art. L. 1154-1**
- Heures supplémentaires : **Art. L. 3121-28** (majoration 25%/50%)
- Rupture conventionnelle : **Art. L. 1237-11**
- Prescription : **1 an** rupture, **2 ans** exécution, **3 ans** salaires
- Conseil de prud'hommes : bureau de conciliation puis bureau de jugement
- Indemnité légale licenciement : **Art. R. 1234-2** (1/4 mois par année ≤10 ans, 1/3 au-delà)

## 3. Logement
- Dépôt de garantie : **Art. 22 de la loi 6/7/1989** — restitution 1 mois (2 mois si retenue), pénalité **10%/mois** de retard
- Décence du logement : **Art. 6 loi 6/7/1989** + décret 30/1/2002
- Trouble anormal de voisinage : jurisprudence constante (nuisances sonores, odeurs)
- Résiliation pour impayés : commandement de payer puis assignation (**2 mois**)
- Charges récupérables : **décret 87-713 du 26/8/1987** (liste limitative)
- Congé : **3 mois** locataire, **6 mois** bailleur avec motif valable

## 4. Consommation
- Droit de rétractation : **14 jours** (**Art. L. 221-18 du Code de la consommation**)
- Garantie légale de conformité : **2 ans** (**Art. L. 217-3**)
- Vice caché : **Art. 1641 du Code civil**, action dans **2 ans** de la découverte (Art. 1648)
- Pratiques commerciales trompeuses : **Art. L. 121-1** du Code de la consommation
- Clauses abusives : **Art. L. 212-1**
- Médiateur de la consommation : obligatoire avant tribunal

## 5. Famille
- Divorce par consentement mutuel : **Art. 229-1 CC** (sous acte d'avocat + notaire)
- Divorce accepté / altération lien / faute : **Art. 237 à 248 CC**
- Garde alternée : **Art. 373-2-9 CC**
- Pension alimentaire : barème indicatif ministère Justice
- Violences conjugales : **Art. 515-9 CC** (ordonnance de protection JAF, sous 6 jours)
- Succession : option héritière **4 mois** (**Art. 771 CC**)

## 6. Administratif
- Recours gracieux : **2 mois** à compter notification
- Recours contentieux : **2 mois** (**Art. R. 421-1 CJA**)
- Référé-suspension : **Art. L. 521-1 CJA** (urgence + doute sérieux)
- Silence vaut acceptation (SVA) ou refus (SVR) selon loi
- CADA : communication documents administratifs (**loi CADA 17/7/1978**)

## 7. Fiscal
- Réclamation contentieuse : **jusqu'au 31 décembre de la 2ème année** (**Art. R.196-1 LPF**)
- Remise gracieuse : demande libre sans délai
- Contrôle fiscal : droit communication, droit réponse 30 jours
- Redressement : proposition rectification → observations 30j → réponse admin 60j
- Taxe foncière contestation : jusqu'au 31/12 N+1

## 8. Pénal
- Garde à vue : **Art. 63 et s. CPP** (droits : avocat, médecin, prévenir proche, silence)
- Plainte : **Art. 15-3 CPP** (commissariat obligé de recevoir)
- Plainte avec constitution partie civile : **Art. 85 CPP** (si classement sans suite)
- Opposition ordonnance pénale : **45 jours**
- Effacement casier B2 : **Art. 775-1 CPP**
- Prescription délit : **6 ans**, crime : **20 ans**

## 9. Santé
- Accident médical non fautif : ONIAM (**loi Kouchner 4/3/2002**)
- Faute médicale : CCI régionale (expertise gratuite ≤ seuil)
- Refus CPAM : recours amiable **2 mois** puis tribunal judiciaire pôle social
- Invalidité : contestation médico-administrative → CRA puis TCI
- Accident du travail : déclaration employeur **48h**, reconnaissance CPAM

## 10. Assurances
- Délai déclaration sinistre : **5 jours ouvrés** (vol **2 jours**, catastrophe naturelle **10 jours**)
- Contestation expertise : contre-expertise à charge assuré, puis tierce expertise
- Résiliation loi Hamon : à tout moment après **1 an**
- Franchise abusive : **Art. L. 113-1 Code des assurances**
- Déchéance de garantie : notification avec mention "à peine de nullité"

## 11. Numérique / RGPD
- Droit d'accès : réponse **1 mois** (**Art. 15 RGPD**)
- Droit à l'effacement : **Art. 17 RGPD**
- Plainte CNIL : en ligne, gratuite
- E-commerce : mentions légales obligatoires **Art. L. 221-5 Code conso**
- Cyberharcèlement : **Art. 222-33-2-2 CP**

## 12. Affaires
- Facture impayée : mise en demeure puis injonction de payer (**Art. 1405 CPC**)
- Taux intérêt de retard légal : refixé semestriellement
- Indemnité forfaitaire recouvrement : **40 €** (**Art. D. 441-5 Code commerce**)
- Rupture brutale relations commerciales : **Art. L. 442-1 Code commerce**
- URSSAF micro-entrepreneur : recours amiable 2 mois, CRA puis TJ
`
