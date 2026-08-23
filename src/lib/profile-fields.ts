import type { LegalProfileInput } from './profile-schema'

export interface FieldMeta {
  key: keyof LegalProfileInput
  label: string
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'date'
    | 'number'
    | 'select'
    | 'boolean'
    | 'password'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

export const FIELD_META: Record<keyof LegalProfileInput, FieldMeta> = {
  civility: {
    key: 'civility',
    label: 'Civilité',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'M.', label: 'M.' },
      { value: 'Mme', label: 'Mme' },
      { value: 'Autre', label: 'Autre' },
    ],
  },
  first_name: {
    key: 'first_name',
    label: 'Prénom',
    type: 'text',
    placeholder: 'Jean',
  },
  last_name: {
    key: 'last_name',
    label: 'Nom',
    type: 'text',
    placeholder: 'Dupont',
  },
  birth_date: { key: 'birth_date', label: 'Date de naissance', type: 'date' },
  birth_city: {
    key: 'birth_city',
    label: 'Ville de naissance',
    type: 'text',
    placeholder: 'Paris',
  },
  nationality: {
    key: 'nationality',
    label: 'Nationalité',
    type: 'text',
    placeholder: 'Française',
  },
  phone: {
    key: 'phone',
    label: 'Téléphone',
    type: 'tel',
    placeholder: '06 12 34 56 78',
  },
  email: {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'jean.dupont@example.com',
  },
  address_street: {
    key: 'address_street',
    label: 'Adresse (rue)',
    type: 'text',
    placeholder: '12 rue des Lilas',
  },
  address_zip: {
    key: 'address_zip',
    label: 'Code postal',
    type: 'text',
    placeholder: '75001',
  },
  address_city: {
    key: 'address_city',
    label: 'Ville',
    type: 'text',
    placeholder: 'Paris',
  },
  address_country: {
    key: 'address_country',
    label: 'Pays',
    type: 'text',
    placeholder: 'France',
  },
  license_plate: {
    key: 'license_plate',
    label: 'Plaque d\'immatriculation',
    type: 'text',
    placeholder: 'AB-123-CD',
  },
  vehicle_brand: {
    key: 'vehicle_brand',
    label: 'Marque du véhicule',
    type: 'text',
    placeholder: 'Renault',
  },
  vehicle_model: {
    key: 'vehicle_model',
    label: 'Modèle',
    type: 'text',
    placeholder: 'Clio',
  },
  driver_license_number: {
    key: 'driver_license_number',
    label: 'Numéro de permis',
    type: 'password',
    placeholder: '••••••••',
  },
  employer_name: {
    key: 'employer_name',
    label: 'Employeur',
    type: 'text',
    placeholder: 'Acme SARL',
  },
  employer_address: {
    key: 'employer_address',
    label: 'Adresse employeur',
    type: 'text',
    placeholder: '1 avenue des Champs, 75008 Paris',
  },
  job_title: {
    key: 'job_title',
    label: 'Poste',
    type: 'text',
    placeholder: 'Chef de projet',
  },
  hire_date: { key: 'hire_date', label: 'Date d\'embauche', type: 'date' },
  salary_gross: {
    key: 'salary_gross',
    label: 'Salaire brut (€/mois)',
    type: 'number',
    placeholder: '3500',
  },
  salary_net: {
    key: 'salary_net',
    label: 'Salaire net (€/mois)',
    type: 'number',
    placeholder: '2700',
  },
  contract_type: {
    key: 'contract_type',
    label: 'Type de contrat',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'CDI', label: 'CDI' },
      { value: 'CDD', label: 'CDD' },
      { value: 'Intérim', label: 'Intérim' },
      { value: 'Apprentissage', label: 'Apprentissage' },
      { value: 'Stage', label: 'Stage' },
      { value: 'Autre', label: 'Autre' },
    ],
  },
  is_tenant: {
    key: 'is_tenant',
    label: 'Statut logement',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'true', label: 'Locataire' },
      { value: 'false', label: 'Propriétaire' },
    ],
  },
  landlord_name: {
    key: 'landlord_name',
    label: 'Nom du bailleur',
    type: 'text',
    placeholder: 'SCI ou nom',
  },
  landlord_address: {
    key: 'landlord_address',
    label: 'Adresse bailleur',
    type: 'text',
  },
  rent_amount: {
    key: 'rent_amount',
    label: 'Loyer (€/mois)',
    type: 'number',
    placeholder: '850',
  },
  lease_start_date: {
    key: 'lease_start_date',
    label: 'Début du bail',
    type: 'date',
  },
  bank_name: {
    key: 'bank_name',
    label: 'Banque',
    type: 'text',
    placeholder: 'BNP Paribas',
  },
  iban: {
    key: 'iban',
    label: 'IBAN',
    type: 'password',
    placeholder: 'FR76 ••••',
  },
  social_security_number: {
    key: 'social_security_number',
    label: 'N° de sécurité sociale',
    type: 'password',
    placeholder: '• 15 chiffres',
  },
  tax_number: {
    key: 'tax_number',
    label: 'N° fiscal',
    type: 'password',
    placeholder: '• 13 chiffres',
  },
}
