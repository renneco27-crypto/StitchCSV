'use client'

import { useState } from 'react'
import { Loader2, Shield } from 'lucide-react'

interface AccessGateProps {
  onSuccess: () => void
}

export default function AccessGate({ onSuccess }: AccessGateProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await res.json()

      if (data.valid) {
        localStorage.setItem('accessCode', code.trim().toUpperCase())
        localStorage.setItem('accessVerified', 'true')
        onSuccess()
      } else {
        setError(data.reason || 'Invalid code')
      }
    } catch {
      setError('Connection error. Please try again.')
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
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Enter your access code to continue</p>

        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ACCESS CODE"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] text-center text-lg tracking-widest font-mono uppercase"
        />

        {error && (
          <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Verifying…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
