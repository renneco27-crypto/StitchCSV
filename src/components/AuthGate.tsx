'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'
import MatrixRainBackground from '@/components/MatrixRainBackground'

export default function AuthGate() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [welcome, setWelcome] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createBrowserSupabase()

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        const name = email.trim().split('@')[0]
        setWelcome(`Hi ${name}`)
        setTimeout(() => setWelcome(''), 3000)
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#050508] overflow-hidden">
      {/* Smooth Matrix Rain Background */}
      <MatrixRainBackground opacity={0.4} />

      {welcome && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full border border-[var(--color-border)] px-6 py-3 cyber-glow">
          <p className="text-[var(--color-accent)] font-medium">{welcome}</p>
        </div>
      )}

      {/* Auth Form Card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 glass-panel w-full max-w-sm rounded-2xl border border-[var(--color-border)] p-8 text-center cyber-border shadow-2xl backdrop-blur-xl"
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)] text-white flex items-center justify-center font-['Playfair_Display'] font-bold text-2xl cyber-glow shadow-[0_0_25px_rgba(168,85,247,0.5)]">
            S
          </div>
        </div>

        <h1 className="text-2xl font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
          Study<span className="text-[var(--color-accent)]">Up</span>
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {mode === 'signin' ? 'Sign in to continue your mastery' : 'Create an account to get started'}
        </p>

        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-sm transition-all"
        />

        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-3 w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-sm transition-all"
        />

        {error && <p className="text-xs sm:text-sm text-[var(--color-dontknow)] mt-3 text-center">{error}</p>}
        {message && <p className="text-xs sm:text-sm text-[var(--color-know)] mt-3 text-center">{message}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity squishy-btn cyber-glow-hover shadow-lg"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setMessage('')
          }}
          className="mt-4 text-xs sm:text-sm text-[var(--color-accent)] hover:underline block w-full"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}