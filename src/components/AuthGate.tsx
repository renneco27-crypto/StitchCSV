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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#f4f7fb] overflow-y-auto">
      {welcome && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full border border-slate-200 px-6 py-3 shadow-lg">
          <p className="text-[#0057ff] font-semibold">{welcome}</p>
        </div>
      )}

      {/* Auth Form Card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-[28px] bg-white border border-slate-200 shadow-xl overflow-hidden p-6 text-center"
      >
        <div className="relative -mx-6 -mt-6 bg-gradient-to-b from-[#0052cc] to-[#0047b3] pt-8 pb-10 px-6 text-center overflow-hidden mb-6">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-2xl rotate-45 pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#002f80]/50 pointer-events-none" />
          <div className="relative z-10 flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white text-[#0057ff] flex items-center justify-center font-bold text-2xl shadow-md">
              S
            </div>
          </div>
          <h1 className="relative z-10 text-2xl font-bold text-white tracking-tight">
            StudyUp
          </h1>
          <p className="relative z-10 text-xs text-white/80 mt-1">
            {mode === 'signin' ? 'Sign in to continue your mastery' : 'Create an account to get started'}
          </p>
        </div>

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

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-[var(--color-border)] w-full" />
          <span className="bg-[var(--color-surface-2)] px-2 text-[10px] text-[var(--color-text-muted)] absolute uppercase tracking-wider">or</span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('stitch-guest-access', 'true')
              window.dispatchEvent(new Event('auth-status-change'))
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors"
        >
          Continue as Guest / Student Mode →
        </button>
      </form>
    </div>
  )
}