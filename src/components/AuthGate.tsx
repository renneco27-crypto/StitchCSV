'use client'

import { useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function AuthGate() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createBrowserSupabase()

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[var(--color-bg)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-accent-soft)] flex items-center justify-center">
            <Shield size={28} className="text-[var(--color-accent)]" />
          </div>
        </div>

        <h1 className="text-2xl font-['DM_Serif_Display'] text-[var(--color-text-primary)]">StitchAI</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {mode === 'signin' ? 'Sign in to continue' : 'Create an account to get started'}
        </p>

        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] text-sm"
        />

        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-3 w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] text-sm"
        />

        {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
        {message && <p className="text-sm text-green-500 mt-3 text-center">{message}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setMessage('')
          }}
          className="mt-3 text-sm text-[var(--color-accent)] hover:underline"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}