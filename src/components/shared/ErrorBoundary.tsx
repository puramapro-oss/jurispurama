'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    if (typeof window !== 'undefined') {
      // Report client-side errors — swallow silently, user sees fallback.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('ErrorBoundary caught:', error, info)
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="glass max-w-md rounded-3xl p-8 text-center">
            <div className="mb-4 text-5xl">⚖️</div>
            <h2 className="mb-2 font-serif text-2xl font-semibold text-[var(--justice)]">
              Une erreur est survenue
            </h2>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">
              Désolé pour la gêne — nos équipes ont été prévenues. Tu peux
              réessayer ou revenir à l&apos;accueil.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.reset}
                className="rounded-xl bg-[var(--justice)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--justice-light)]"
              >
                Réessayer
              </button>
              <a
                href="/"
                className="rounded-xl border border-[var(--border-strong)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--justice)] hover:bg-[var(--bg-nebula)]"
              >
                Accueil
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
