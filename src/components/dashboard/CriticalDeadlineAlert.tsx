import Link from 'next/link'
import { formatDeadline } from '@/lib/case-helpers'

interface DeadlineItem {
  caseId: string
  caseSummary: string
  date: string
  description: string
  critical: boolean
  days: number
}

interface CriticalDeadlineAlertProps {
  deadlines: DeadlineItem[]
}

export default function CriticalDeadlineAlert({
  deadlines,
}: CriticalDeadlineAlertProps) {
  if (deadlines.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex-1">
          <p className="font-semibold text-red-800">
            {deadlines.length} échéance
            {deadlines.length > 1 ? 's' : ''} critique
            {deadlines.length > 1 ? 's' : ''}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-red-700">
            {deadlines.slice(0, 3).map((d, i) => (
              <li key={`${d.caseId}-${i}`}>
                <Link
                  href={`/dossiers/${d.caseId}`}
                  className="hover:underline"
                >
                  <strong>{formatDeadline(d.date)}</strong> — {d.description}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
