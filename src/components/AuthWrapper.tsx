'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import { createBrowserSupabase } from '@/lib/supabase'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabase()

    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (authenticated === null) return null
  if (!authenticated) return <AuthGate />
  return <>{children}</>
}