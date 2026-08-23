'use client'

import CookieConsentBanner from '@/lib/legal/components/CookieConsentBanner'
import { APP_NAME } from '@/lib/constants'
import type { CookieConsent } from '@/lib/legal/hooks/useCookieConsent'

function syncConsent(consent: CookieConsent) {
  fetch('/api/legal/cookie-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mesure: consent.mesure, marketing: consent.marketing }),
  }).catch(() => {
    // Le choix reste valide en localStorage même si la synchro serveur échoue.
  })
}

export default function CookieBanner() {
  return <CookieConsentBanner appName={APP_NAME} onConsent={syncConsent} />
}
