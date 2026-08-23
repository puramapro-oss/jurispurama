// Constants for financial aid search

export const PROFILS = [
  { value: 'salarie', label: 'Salarié(e)' },
  { value: 'chomeur', label: 'Demandeur d\'emploi' },
  { value: 'etudiant', label: 'Étudiant(e)' },
  { value: 'retraite', label: 'Retraité(e)' },
  { value: 'independant', label: 'Indépendant(e)' },
]

export const SITUATIONS = [
  { value: 'litige', label: 'Litige civil' },
  { value: 'travail', label: 'Droit du travail' },
  { value: 'logement', label: 'Logement' },
  { value: 'famille', label: 'Famille / divorce' },
  { value: 'consommation', label: 'Consommation' },
  { value: 'penal', label: 'Pénal / victime' },
  { value: 'administration', label: 'Administration' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'surendettement', label: 'Surendettement' },
  { value: 'numerique', label: 'Numérique / RGPD' },
]

export const TYPE_LABELS: Record<string, { label: string; variant: 'justice' | 'green' | 'gold' | 'blue' | 'purple' }> = {
  aide_etat: { label: 'Aide de l\'État', variant: 'justice' },
  assurance: { label: 'Assurance', variant: 'blue' },
  consultation: { label: 'Consultation gratuite', variant: 'green' },
  mediation: { label: 'Médiation', variant: 'gold' },
  association: { label: 'Association', variant: 'purple' },
}

export const STEP_LABELS = ['Ton profil', 'Aides disponibles', 'Ton dossier', 'Suivi']
