'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import { COMPANY_INFO } from '@/lib/constants'
import LocaleSwitcher from '@/components/shared/LocaleSwitcher'
import ThemeToggle from '@/components/shared/ThemeToggle'

export default function LandingFooter() {
  const { t } = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-white/10 bg-[#05070F]">
      <div className="container-wide py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-white"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xl"
                style={{
                  background:
                    'linear-gradient(135deg, #1E3A5F 0%, #2A5384 50%, #C9A84C 120%)',
                }}
              >
                ⚖️
              </span>
              <span className="font-serif text-xl font-semibold">
                JurisPurama
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              {t.footer.tagline}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-1 font-medium text-[var(--gold-light)]">
                ✓ {t.footer.gdpr}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/75">
                {t.footer.france}
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t.footer.product}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="text-white/70 hover:text-[var(--gold)]">
                  {t.nav.howItWorks}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-white/70 hover:text-[var(--gold)]">
                  {t.nav.pricing}
                </Link>
              </li>
              <li>
                <Link href="/ecosystem" className="text-white/70 hover:text-[var(--gold)]">
                  {t.nav.ecosystem}
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-white/70 hover:text-[var(--gold)]">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-white/70 hover:text-[var(--gold)]">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t.footer.resources}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/aide" className="text-white/70 hover:text-[var(--gold)]">
                  {t.nav.help}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/70 hover:text-[var(--gold)]">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-white/70 hover:text-[var(--gold)]">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/parrainage" className="text-white/70 hover:text-[var(--gold)]">
                  Parrainage
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t.footer.company}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/mentions-legales" className="text-white/70 hover:text-[var(--gold)]">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/apply/influenceur" className="text-white/70 hover:text-[var(--gold)]">
                  Devenir influenceur
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/puramapro-oss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[var(--gold)]"
                >
                  Open source
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t.footer.legal}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/cgu" className="text-white/70 hover:text-[var(--gold)]">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="text-white/70 hover:text-[var(--gold)]">
                  CGV
                </Link>
              </li>
              <li>
                <Link href="/politique-confidentialite" className="text-white/70 hover:text-[var(--gold)]">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-white/70 hover:text-[var(--gold)]">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p>
              © {year} {COMPANY_INFO.name}. {t.footer.allRights}
            </p>
            <p className="text-white/35">
              {COMPANY_INFO.address}. {COMPANY_INFO.taxNote}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
