'use client'

import { FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface SendRecommandeFormProps {
  recName: string
  recStreet: string
  recZip: string
  recCity: string
  recCountry: string
  recEmailOpt: string
  onRecNameChange: (value: string) => void
  onRecStreetChange: (value: string) => void
  onRecZipChange: (value: string) => void
  onRecCityChange: (value: string) => void
  onRecCountryChange: (value: string) => void
  onRecEmailOptChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
}

export default function SendRecommandeForm({
  recName,
  recStreet,
  recZip,
  recCity,
  recCountry,
  recEmailOpt,
  onRecNameChange,
  onRecStreetChange,
  onRecZipChange,
  onRecCityChange,
  onRecCountryChange,
  onRecEmailOptChange,
  onSubmit,
  onCancel,
  loading,
}: SendRecommandeFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        label="Nom du destinataire"
        value={recName}
        onChange={(e) => onRecNameChange(e.target.value)}
        placeholder="Maître Dupont / Société XYZ"
        required
      />
      <Input
        label="Adresse (rue, numéro)"
        value={recStreet}
        onChange={(e) => onRecStreetChange(e.target.value)}
        placeholder="12 rue de la Paix"
        required
      />
      <div className="grid gap-3 sm:grid-cols-[120px_1fr_120px]">
        <Input
          label="Code postal"
          value={recZip}
          onChange={(e) => onRecZipChange(e.target.value)}
          placeholder="75001"
          required
        />
        <Input
          label="Ville"
          value={recCity}
          onChange={(e) => onRecCityChange(e.target.value)}
          placeholder="Paris"
          required
        />
        <Input
          label="Pays"
          value={recCountry}
          onChange={(e) => onRecCountryChange(e.target.value)}
          placeholder="FR"
        />
      </div>
      <Input
        label="Email (facultatif, pour notification AR)"
        type="email"
        value={recEmailOpt}
        onChange={(e) => onRecEmailOptChange(e.target.value)}
        placeholder="destinataire@exemple.fr"
      />
      <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3 text-xs text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--gold-dark)]">
          ✉ Recommandé électronique AR — 5,99 €
        </p>
        <p className="mt-1">
          Le dépôt et la remise sont confirmés uniquement à partir du suivi
          fournisseur. Ce service ne confirme pas l&apos;archivage d&apos;une
          preuve d&apos;accusé de réception. Inclus dans les forfaits Pro
          (3/mois) et Premium (illimité). Le paiement hors forfait est indisponible.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="gold"
          size="md"
          loading={loading}
        >
          Déposer le recommandé
        </Button>
      </div>
    </form>
  )
}
