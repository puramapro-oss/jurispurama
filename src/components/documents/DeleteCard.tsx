'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface DeleteCardProps {
  onDelete: () => void
}

export default function DeleteCard({ onDelete }: DeleteCardProps) {
  return (
    <Card padding="md">
      <Button
        variant="danger"
        size="sm"
        fullWidth
        onClick={onDelete}
      >
        Supprimer le document
      </Button>
    </Card>
  )
}
