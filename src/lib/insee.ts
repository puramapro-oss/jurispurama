/**
 * INSEE Sirene API V3.11 — vérification SIRET
 * Voir §36.1 CLAUDE.md. Couvre tout l'écosystème Purama (clé unique).
 *
 * Usage JurisPurama :
 * - Vérif SIRET employeur (dossier droit du travail)
 * - Vérif SIRET bailleur personne morale (dossier logement)
 * - Vérif SIRET entreprise partie adverse (consommation, affaires, impayés)
 * - Auto-complétion adresse siège pour mise en demeure
 *
 * Endpoint : https://api.insee.fr/entreprises/sirene/V3.11/siret/{siret}
 * Header : X-INSEE-Api-Key-Integration: ${INSEE_API_KEY}
 * Coût : gratuit (API Sirene 3.11 Accès public).
 */

export interface SiretInfo {
  siret: string;
  siren: string;
  nic: string;
  denomination: string;
  enseigne: string | null;
  categorieEntreprise: string | null;
  dateCreation: string | null;
  etablissementActif: boolean;
  activitePrincipale: string | null; // Code NAF
  activitePrincipaleLibelle: string | null;
  adresse: {
    numero: string | null;
    typeVoie: string | null;
    libelleVoie: string | null;
    codePostal: string | null;
    commune: string | null;
    pays: string;
  };
  formeJuridique: string | null;
  trancheEffectifs: string | null;
}

export interface SiretLookupError {
  error: string;
  code: 'NOT_FOUND' | 'INVALID_FORMAT' | 'RATE_LIMIT' | 'AUTH' | 'UNKNOWN';
}

/**
 * Vérifie un SIRET (14 chiffres). Retourne SiretInfo ou SiretLookupError.
 */
export async function lookupSiret(
  siret: string
): Promise<SiretInfo | SiretLookupError> {
  const cleaned = siret.replace(/\s+/g, '');
  if (!/^\d{14}$/.test(cleaned)) {
    return { error: 'SIRET invalide : 14 chiffres attendus', code: 'INVALID_FORMAT' };
  }

  const apiKey = process.env.INSEE_API_KEY;
  if (!apiKey) {
    return {
      error: "Clé INSEE non configurée côté serveur. Contacte l'équipe support.",
      code: 'AUTH',
    };
  }

  try {
    const res = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3.11/siret/${cleaned}`,
      {
        headers: {
          'X-INSEE-Api-Key-Integration': apiKey,
          Accept: 'application/json',
        },
        // Cache 24h côté CDN
        next: { revalidate: 86400 },
      }
    );

    if (res.status === 404) {
      return { error: 'SIRET introuvable dans la base INSEE.', code: 'NOT_FOUND' };
    }
    if (res.status === 429) {
      return { error: 'Limite INSEE atteinte. Réessaie dans 1 minute.', code: 'RATE_LIMIT' };
    }
    if (res.status === 401 || res.status === 403) {
      return { error: 'Authentification INSEE échouée.', code: 'AUTH' };
    }
    if (!res.ok) {
      return { error: `INSEE erreur ${res.status}.`, code: 'UNKNOWN' };
    }

    const json = await res.json();
    const etab = json?.etablissement;
    if (!etab) return { error: 'Réponse INSEE vide.', code: 'UNKNOWN' };

    const pu = etab.uniteLegale ?? {};
    const ap = etab.adresseEtablissement ?? {};

    const denomination =
      pu.denominationUniteLegale ||
      [pu.prenom1UniteLegale, pu.nomUniteLegale].filter(Boolean).join(' ') ||
      'Non renseigné';

    return {
      siret: etab.siret,
      siren: etab.siren,
      nic: etab.nic,
      denomination,
      enseigne: etab.enseigne1Etablissement ?? null,
      categorieEntreprise: pu.categorieEntreprise ?? null,
      dateCreation: etab.dateCreationEtablissement ?? null,
      etablissementActif: etab.etatAdministratifEtablissement === 'A',
      activitePrincipale: etab.activitePrincipaleEtablissement ?? null,
      activitePrincipaleLibelle: etab.nomenclatureActivitePrincipaleEtablissement ?? null,
      adresse: {
        numero: ap.numeroVoieEtablissement ?? null,
        typeVoie: ap.typeVoieEtablissement ?? null,
        libelleVoie: ap.libelleVoieEtablissement ?? null,
        codePostal: ap.codePostalEtablissement ?? null,
        commune: ap.libelleCommuneEtablissement ?? null,
        pays: ap.libellePaysEtrangerEtablissement ?? 'France',
      },
      formeJuridique: pu.categorieJuridiqueUniteLegale ?? null,
      trancheEffectifs: etab.trancheEffectifsEtablissement ?? null,
    };
  } catch (err) {
    return {
      error: `Impossible de joindre INSEE. ${err instanceof Error ? err.message : 'Erreur réseau.'}`,
      code: 'UNKNOWN',
    };
  }
}

/**
 * Formatte l'adresse complète d'un établissement pour document juridique.
 */
export function formatSiretAdresse(info: SiretInfo): string {
  const { adresse } = info;
  const ligne1 = [adresse.numero, adresse.typeVoie, adresse.libelleVoie]
    .filter(Boolean)
    .join(' ');
  const ligne2 = [adresse.codePostal, adresse.commune].filter(Boolean).join(' ');
  return [ligne1, ligne2, adresse.pays].filter(Boolean).join(', ');
}

/**
 * Formatte pour usage dans mise en demeure / courrier.
 */
export function formatSiretHeader(info: SiretInfo): string {
  const lines = [
    info.denomination.toUpperCase(),
    info.enseigne ? `(${info.enseigne})` : null,
    `SIRET : ${info.siret}`,
    `SIREN : ${info.siren}`,
    formatSiretAdresse(info),
  ].filter(Boolean);
  return lines.join('\n');
}
