'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function SignOutButton({ className = '', iconOnly = false }: { className?: string; iconOnly?: boolean }) {
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
      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors disabled:opacity-50 squishy-btn ${className}`}
      aria-label="Sign out"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      <span className={iconOnly ? 'hidden lg:inline' : ''}>Sign out</span>
    </button>
  )
}