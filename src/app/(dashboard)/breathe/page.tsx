'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale'

const TECHNIQUES = [
  {
    id: 'coherence',
    label: 'Cohérence cardiaque',
    description: '5 sec inspirer, 5 sec expirer. 5 minutes = 30 cycles.',
    inhale: 5,
    hold: 0,
    exhale: 5,
    cycles: 30,
  },
  {
    id: '478',
    label: 'Respiration 4-7-8',
    description: '4 sec inspirer, 7 sec retenir, 8 sec expirer. Apaise le stress.',
    inhale: 4,
    hold: 7,
    exhale: 8,
    cycles: 4,
  },
  {
    id: 'box',
    label: 'Respiration carrée',
    description: '4 sec chaque phase. Utilisée par les avocats avant plaidoirie.',
    inhale: 4,
    hold: 4,
    exhale: 4,
    cycles: 8,
  },
]

export default function BreathePage() {
  const [technique, setTechnique] = useState(TECHNIQUES[0])
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [timer, setTimer] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setPhase('idle')
    setTimer(0)

    if (totalSeconds > 10) {
      fetch('/api/breathe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: totalSeconds,
          technique: technique.id,
        }),
      }).catch(() => {})
      toast.success(
        `Session terminée ! ${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
      )
    }
    setTotalSeconds(0)
    setCycle(0)
  }, [totalSeconds, technique.id])

  const start = () => {
    setRunning(true)
    setCycle(0)
    setTotalSeconds(0)
    setPhase('inhale')
    setTimer(technique.inhale)
  }

  useEffect(() => {
    if (!running) return

    intervalRef.current = setInterval(() => {
      setTotalSeconds((p) => p + 1)
      setTimer((prev) => {
        if (prev > 1) return prev - 1

        // Next phase
        setPhase((currentPhase) => {
          if (currentPhase === 'inhale') {
            if (technique.hold > 0) {
              setTimer(technique.hold)
              return 'hold'
            }
            setTimer(technique.exhale)
            return 'exhale'
          }
          if (currentPhase === 'hold') {
            setTimer(technique.exhale)
            return 'exhale'
          }
          // exhale -> next cycle
          setCycle((c) => {
            const next = c + 1
            if (next >= technique.cycles) {
              setTimeout(stop, 100)
              return next
            }
            return next
          })
          setTimer(technique.inhale)
          return 'inhale'
        })
        return prev
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, technique, stop])

  const phaseLabel: Record<Phase, string> = {
    idle: 'Prêt',
    inhale: 'Inspire',
    hold: 'Retiens',
    exhale: 'Expire',
  }

  const phaseColor: Record<Phase, string> = {
    idle: 'text-[var(--text-muted)]',
    inhale: 'text-[var(--justice)]',
    hold: 'text-[var(--gold-dark)]',
    exhale: 'text-emerald-600',
  }

  const circleScale =
    phase === 'inhale'
      ? 'scale-110'
      : phase === 'exhale'
        ? 'scale-90'
        : 'scale-100'

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
            Respiration guidée
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Avant une démarche juridique, calme ton esprit. 5 minutes suffisent.
          </p>
        </div>

        {/* Technique selector */}
        <div className="flex flex-wrap gap-2">
          {TECHNIQUES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (!running) setTechnique(t)
              }}
              disabled={running}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                technique.id === t.id
                  ? 'border-[var(--justice)] bg-[var(--justice)]/10 text-[var(--justice)]'
                  : 'border-[var(--border)] bg-white/40 text-[var(--text-secondary)] hover:border-[var(--justice)]/40 disabled:opacity-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Breathing circle */}
        <Card>
          <div className="flex flex-col items-center p-8">
            <p className="mb-2 text-sm text-[var(--text-secondary)]">
              {technique.description}
            </p>

            <div className="relative my-8 flex items-center justify-center">
              <div
                className={`flex h-48 w-48 items-center justify-center rounded-full border-4 border-[var(--justice)]/30 bg-[var(--justice)]/5 transition-transform duration-[3000ms] ease-in-out ${circleScale}`}
              >
                <div className="text-center">
                  <p
                    className={`font-serif text-2xl font-bold transition-colors ${phaseColor[phase]}`}
                  >
                    {phaseLabel[phase]}
                  </p>
                  {running && (
                    <p className="mt-1 font-mono text-3xl font-bold text-[var(--text-primary)]">
                      {timer}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {running && (
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                Cycle {cycle + 1} / {technique.cycles}
              </p>
            )}

            <Button onClick={running ? stop : start} fullWidth>
              {running ? 'Arrêter' : 'Commencer'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
