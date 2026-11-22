'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'
import { generateReferralCode } from '@/lib/utils'
import type { JurisUser } from '@/types'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<JurisUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(createClient)

  useEffect(() => {
    let active = true
    let authRevision = 0
    let profileRevision = 0
    let profileUserId: string | null = null
    let currentProfile: JurisUser | null = null
    let loadingProfile = false
    let profileTimer: ReturnType<typeof setTimeout> | null = null

    const readProfile = (userId: string) => supabase
      .from('jurispurama_users')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()

    const fetchOrCreateProfile = async (u: User, revision: number) => {
      const isCurrent = () => active && revision === profileRevision && profileUserId === u.id
      try {
        const { data, error } = await readProfile(u.id)
        if (!isCurrent() || error) return
        if (data) {
          currentProfile = data as JurisUser
          setProfile(currentProfile)
          return
        }

        // Create only after a successful empty read, never after a read failure.
        const fullName =
          (u.user_metadata?.full_name as string | undefined) ??
          (u.user_metadata?.name as string | undefined) ??
          (u.email ? u.email.split('@')[0] : null)
        const { data: created, error: createError } = await supabase
          .from('jurispurama_users')
          .insert({
            auth_user_id: u.id,
            email: u.email ?? '',
            full_name: fullName,
            referral_code: generateReferralCode(),
            subscription_plan: 'free',
            language: 'fr',
            role: u.email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'user',
          })
          .select('*')
          .maybeSingle()
        if (!isCurrent()) return
        if (!createError && created) {
          currentProfile = created as JurisUser
          setProfile(currentProfile)
        } else if (createError?.code === '23505') {
          // The auth trigger or another mounted consumer may have created it.
          const { data: existing, error: readError } = await readProfile(u.id)
          if (isCurrent() && !readError && existing) {
            currentProfile = existing as JurisUser
            setProfile(currentProfile)
          }
        }
      } catch {
        // Keep the current identity without inventing a profile on transport failure.
      } finally {
        if (isCurrent()) {
          loadingProfile = false
          setLoading(false)
        }
      }
    }

    const acceptSession = (s: Session | null) => {
      if (!active) return
      setSession(s)
      setUser(s?.user ?? null)
      const nextUserId = s?.user.id ?? null
      if (nextUserId !== profileUserId) {
        profileUserId = nextUserId
        profileRevision++
        currentProfile = null
        loadingProfile = false
        if (profileTimer !== null) clearTimeout(profileTimer)
        profileTimer = null
        setProfile(null)
      }
      if (!s?.user || currentProfile) {
        setLoading(false)
        return
      }
      if (loadingProfile) return
      loadingProfile = true
      setLoading(true)
      const revision = ++profileRevision
      const authUser = s.user
      // Supabase auth notifications run under its auth lock. Return first,
      // then start profile I/O without holding that lock or awaiting it there.
      profileTimer = setTimeout(() => {
        profileTimer = null
        if (active && revision === profileRevision) void fetchOrCreateProfile(authUser, revision)
      }, 0)
    }

    const initialRevision = authRevision
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (active && authRevision === initialRevision) acceptSession(error ? null : data.session)
      } catch {
        if (active && authRevision === initialRevision) acceptSession(null)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return
      authRevision++
      acceptSession(s)
    })
    void init()

    return () => {
      active = false
      profileRevision++
      if (profileTimer !== null) clearTimeout(profileTimer)
      subscription.unsubscribe()
    }
  }, [supabase])

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [supabase]
  )

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { error }
    },
    [supabase]
  )

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    try {
      localStorage.clear()
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(
            /=.*/,
            '=;expires=' + new Date().toUTCString() + ';path=/'
          )
      })
    } catch {
      // noop
    }
    window.location.href = '/login'
  }, [supabase])

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })
      return { error }
    },
    [supabase]
  )

  return {
    user,
    profile,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
    isSuperAdmin: user?.email === SUPER_ADMIN_EMAIL,
    isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
  }
}
