'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * PuramaErrorBoundary — fallback esthétique FR (V7.1 §12)
 * Class component (requis pour componentDidCatch).
 */
export class PuramaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    // Sentry si configuré
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sentry = (window as any).Sentry
      if (sentry?.captureException) {
        sentry.captureException(_error, { contexts: { react: info } })
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--justice)] mb-2">
            Quelque chose n&apos;a pas marché
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Une erreur technique est survenue. On a été notifiés et on la
            corrige rapidement.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--justice)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--justice-dark)] transition-colors"
          >
            Rafraîchir la page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.message && (
            <pre className="mt-6 text-left text-xs bg-red-50 p-3 rounded-lg overflow-auto text-red-900">
              {this.state.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}

export default PuramaErrorBoundary
