'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function SignOutButton({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await createBrowserSupabase().auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-50 ${className}`}
      aria-label="Sign out"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      <span>Sign out</span>
    </button>
  )
}