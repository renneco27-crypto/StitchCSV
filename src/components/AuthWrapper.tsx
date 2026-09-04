'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import { createBrowserSupabase } from '@/lib/supabase'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const isGuest = typeof window !== 'undefined' && localStorage.getItem('stitch-guest-access') === 'true'
      if (isGuest) {
        setAuthenticated(true)
        return
      }
      const supabase = createBrowserSupabase()
      supabase.auth.getSession().then(({ data }) => {
        setAuthenticated(!!data.session || isGuest)
      })
    }

    checkAuth()

    const handleStatusChange = () => checkAuth()
    window.addEventListener('auth-status-change', handleStatusChange)

    const supabase = createBrowserSupabase()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isGuest = typeof window !== 'undefined' && localStorage.getItem('stitch-guest-access') === 'true'
      setAuthenticated(!!session || isGuest)
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('auth-status-change', handleStatusChange)
    }
  }, [])

  if (authenticated === null) return null
  if (!authenticated) return <AuthGate />
  return <>{children}</>
}