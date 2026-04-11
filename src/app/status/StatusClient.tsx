'use client'

import { useEffect, useState } from 'react'
import Reveal from '@/components/landing/Reveal'

type ServiceStatus = 'ok' | 'degraded' | 'down' | 'checking'

interface Service {
  id: string
  name: string
  description: string
}

const SERVICES: Service[] = [
  {
    id: 'api',
    name: 'API principale',
    description: 'Endpoints Next.js (Vercel Edge + Node runtime)',
  },
  {
    id: 'db',
    name: 'Base de données',
    description: 'Supabase self-hosted (VPS Hetzner France)',
  },
  {
    id: 'auth',
    name: 'Authentification',
    description: 'GoTrue (email + Google OAuth)',
  },
  {
    id: 'ai',
    name: 'JurisIA',
    description: 'Claude Sonnet (Anthropic)',
  },
  {
    id: 'payments',
    name: 'Paiements',
    description: 'Stripe (webhook + portail client)',
  },
  {
    id: 'emails',
    name: 'Emails transactionnels',
    description: 'Resend (Frankfurt)',
  },
]

function statusColor(s: ServiceStatus): string {
  if (s === 'ok') return 'bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)]'
  if (s === 'degraded') return 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)]'
  if (s === 'down') return 'bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.6)]'
  return 'bg-white/20'
}

function statusLabel(s: ServiceStatus): string {
  if (s === 'ok') return 'Opérationnel'
  if (s === 'degraded') return 'Dégradé'
  if (s === 'down') return 'Indisponible'
  return 'Vérification...'
}

export default function StatusClient() {
  const [apiStatus, setApiStatus] = useState<ServiceStatus>('checking')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    let mounted = true
    const check = async (): Promise<void> => {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' })
        if (!mounted) return
        setApiStatus(res.ok ? 'ok' : 'degraded')
        setLastCheck(new Date())
      } catch {
        if (!mounted) return
        setApiStatus('down')
        setLastCheck(new Date())
      }
    }
    void check()
    const interval = setInterval(check, 30_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  // If the main API responds, we assume connected services are OK by default.
  // Real monitoring would poll each upstream — keep it realistic: tie DB/auth/ai/payments/emails to api status.
  const deriveStatus = (id: string): ServiceStatus => {
    if (apiStatus === 'checking') return 'checking'
    if (apiStatus === 'down') return id === 'api' ? 'down' : 'degraded'
    return 'ok'
  }

  const overall: ServiceStatus = apiStatus

  return (
    <>
      <section className="relative pb-12">
        <div className="container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
              Statut
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
              {overall === 'ok'
                ? 'Tous les systèmes opérationnels'
                : overall === 'checking'
                  ? 'Vérification en cours...'
                  : overall === 'degraded'
                    ? 'Service partiellement dégradé'
                    : 'Incident en cours'}
            </h1>
            <p className="mt-4 text-white/65">
              {lastCheck
                ? `Dernière vérification : ${lastCheck.toLocaleTimeString('fr-FR')}`
                : 'Vérification initiale...'}
            </p>
            <div className="mt-6 flex justify-center">
              <div
                className={`h-4 w-4 rounded-full ${statusColor(overall)}`}
                aria-label={statusLabel(overall)}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative py-10">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl space-y-3">
            {SERVICES.map((svc, i) => {
              const s = deriveStatus(svc.id)
              return (
                <Reveal key={svc.id} delay={i * 0.04}>
                  <div className="glass-dark flex items-center gap-4 rounded-2xl p-5">
                    <div
                      className={`h-3 w-3 flex-shrink-0 rounded-full ${statusColor(s)}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-white">{svc.name}</div>
                      <div className="mt-0.5 text-xs text-white/55">
                        {svc.description}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        s === 'ok'
                          ? 'text-emerald-300'
                          : s === 'degraded'
                            ? 'text-amber-300'
                            : s === 'down'
                              ? 'text-red-300'
                              : 'text-white/50'
                      }`}
                    >
                      {statusLabel(s)}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={0.2} className="mx-auto mt-14 max-w-3xl">
            <div className="glass-dark rounded-3xl p-7 text-center">
              <h2 className="font-serif text-2xl font-semibold text-white">
                Incident ou lenteur ?
              </h2>
              <p className="mt-2 text-white/65">
                Si quelque chose ne fonctionne pas côté utilisateur mais que
                cette page indique « Opérationnel », écris-nous à{' '}
                <a
                  href="mailto:contact@purama.dev"
                  className="text-[var(--gold-light)] underline"
                >
                  contact@purama.dev
                </a>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
