import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

const ADMIN_NAV = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: '📊' },
  { href: '/admin/users', label: 'Utilisateurs', icon: '👥' },
  { href: '/admin/cases', label: 'Dossiers', icon: '📁' },
  { href: '/admin/payments', label: 'Paiements', icon: '💰' },
  { href: '/admin/ambassadeurs', label: 'Ambassadeurs', icon: '⭐' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Administration
        </p>
        <h1 className="font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          JurisPurama Admin
        </h1>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white hover:text-[var(--justice)]"
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
