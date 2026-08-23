import Card from '@/components/ui/Card'

interface StatsCardProps {
  label: string
  value: string | number
  subtitle: string
  valueColor?: string
  loading?: boolean
}

export default function StatsCard({
  label,
  value,
  subtitle,
  valueColor = 'var(--justice)',
  loading = false,
}: StatsCardProps) {
  return (
    <Card padding="md" elevation="raised">
      <p className="text-eyebrow">{label}</p>
      <p
        className="mt-2 font-serif text-3xl font-bold tabular"
        style={{ color: valueColor }}
      >
        {loading ? '…' : value}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
    </Card>
  )
}
