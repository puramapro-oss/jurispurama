export interface TeleserviceLink {
  label: string
  url: string
  description: string
  copy: string[]
}

export function teleservicesForType(type: string | null): TeleserviceLink[] {
  switch (type) {
    case 'amende':
      return [
        {
          label: 'ANTAI — Contestation amende',
          url: 'https://www.antai.gouv.fr/',
          description:
            'Téléservice officiel pour contester une amende ou un avis de contravention.',
          copy: [
            "Numéro d'avis",
            'Immatriculation',
            'Motif de contestation (issu du document)',
          ],
        },
        {
          label: 'Telerecours citoyens',
          url: 'https://www.telerecours.fr/',
          description: 'Recours devant les juridictions administratives.',
          copy: ['Identité complète', 'Objet du recours', 'Pièces justificatives'],
        },
      ]
    case 'fiscal':
      return [
        {
          label: 'impots.gouv.fr — Messagerie sécurisée',
          url: 'https://www.impots.gouv.fr/accueil',
          description:
            'Réclamation fiscale, remise gracieuse, contestation taxe.',
          copy: [
            'Numéro fiscal',
            'Référence de l\'avis',
            'Texte de la réclamation',
          ],
        },
      ]
    case 'administratif':
      return [
        {
          label: 'Telerecours citoyens',
          url: 'https://www.telerecours.fr/',
          description:
            'Dépôt direct auprès des tribunaux administratifs et cours.',
          copy: ['Objet', 'Moyens', 'Pièces jointes signées'],
        },
        {
          label: 'Service-public.fr',
          url: 'https://www.service-public.fr/particuliers/vosdroits/N367',
          description: 'Portail de recours gracieux auprès de l\'administration.',
          copy: ['Identité', 'Référence', 'Courrier joint'],
        },
      ]
    default:
      return [
        {
          label: 'Service-public.fr',
          url: 'https://www.service-public.fr/',
          description: 'Portail des démarches administratives françaises.',
          copy: ['Identité complète', 'Objet', 'Pièces jointes'],
        },
      ]
  }
}
