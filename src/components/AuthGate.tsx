'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'

// Mountain Matrix Digital Waterfall Rain Canvas
function MountainMatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      initColumns()
    }
    window.addEventListener('resize', handleResize)

    // Characters: Matrix symbols, cyber runes, numbers
    const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜΣΩλπψ§∆∇'
    const fontSize = 14
    let columns = Math.floor(width / fontSize)
    let drops: { y: number; speed: number; chars: string[]; length: number }[] = []

    // Mathematical Mountain Ridge Profile Formula
    const getMountainProfile = (x: number, w: number, h: number) => {
      const nx = x / w
      // Peak 1 (Left Peak)
      const p1 = Math.exp(-Math.pow((nx - 0.28) / 0.16, 2)) * 0.44
      // Main Summit (Center-Right Peak)
      const p2 = Math.exp(-Math.pow((nx - 0.64) / 0.2, 2)) * 0.52
      // Intermediate Ridge (Center)
      const p3 = Math.exp(-Math.pow((nx - 0.46) / 0.14, 2)) * 0.36
      // Far Left & Right Shoulders
      const p4 = Math.exp(-Math.pow((nx - 0.08) / 0.18, 2)) * 0.22
      const p5 = Math.exp(-Math.pow((nx - 0.9) / 0.18, 2)) * 0.25
      // Fractal jaggedness
      const noise =
        Math.sin(nx * 38) * 0.018 +
        Math.cos(nx * 76) * 0.009 +
        Math.sin(nx * 140) * 0.004

      const totalElevation = Math.min(0.68, Math.max(0.06, p1 + p2 + p3 + p4 + p5 + noise))
      const baseGroundY = h * 0.92
      return baseGroundY - totalElevation * h
    }

    const initColumns = () => {
      columns = Math.floor(width / fontSize)
      drops = []
      for (let i = 0; i < columns; i++) {
        const length = Math.floor(Math.random() * 18) + 10
        const charArr: string[] = []
        for (let j = 0; j < length; j++) {
          charArr.push(chars[Math.floor(Math.random() * chars.length)])
        }
        drops.push({
          y: Math.random() * -100 - Math.random() * 50,
          speed: Math.random() * 2.2 + 1.2,
          chars: charArr,
          length,
        })
      }
    }

    initColumns()

    const render = () => {
      // Semi-transparent fade to create fluid motion trails
      ctx.fillStyle = 'rgba(5, 5, 8, 0.2)'
      ctx.fillRect(0, 0, width, height)

      // Draw subtle glowing mountain silhouette wireframe backdrop
      ctx.save()
      ctx.beginPath()
      const step = 4
      for (let x = 0; x <= width; x += step) {
        const my = getMountainProfile(x, width, height)
        if (x === 0) ctx.moveTo(x, my)
        else ctx.lineTo(x, my)
      }
      ctx.lineTo(width, height)
      ctx.lineTo(0, height)
      ctx.closePath()

      // Gradient inside mountain body
      const mountainGrad = ctx.createLinearGradient(0, height * 0.3, 0, height)
      mountainGrad.addColorStop(0, 'rgba(147, 51, 234, 0.08)')
      mountainGrad.addColorStop(0.5, 'rgba(88, 28, 135, 0.14)')
      mountainGrad.addColorStop(1, 'rgba(15, 5, 29, 0.3)')
      ctx.fillStyle = mountainGrad
      ctx.fill()

      // Glowing mountain ridge outline
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#a855f7'
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.restore()

      // Draw Matrix Waterfall Rain
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns; i++) {
        const drop = drops[i]
        const x = i * fontSize
        const mountainY = getMountainProfile(x, width, height)

        for (let j = 0; j < drop.chars.length; j++) {
          const charY = drop.y - j * fontSize
          if (charY < 0 || charY > height) continue

          const isNearRidge = Math.abs(charY - mountainY) < 20
          const isInsideMountain = charY >= mountainY

          // Randomly mutate characters
          if (Math.random() < 0.03) {
            drop.chars[j] = chars[Math.floor(Math.random() * chars.length)]
          }

          if (j === 0) {
            // Head of the drop
            if (isNearRidge) {
              ctx.fillStyle = '#ffffff'
              ctx.shadowColor = '#f0abfc'
              ctx.shadowBlur = 16
            } else if (isInsideMountain) {
              ctx.fillStyle = '#f0abfc'
              ctx.shadowColor = '#a855f7'
              ctx.shadowBlur = 10
            } else {
              ctx.fillStyle = '#d8b4fe'
              ctx.shadowColor = '#9333ea'
              ctx.shadowBlur = 6
            }
          } else {
            // Body / Trail of the drop
            ctx.shadowBlur = 0
            const alpha = 1 - j / drop.chars.length

            if (isNearRidge) {
              // Glowing purple outline at the mountain crest
              ctx.fillStyle = `rgba(232, 121, 249, ${Math.min(1, alpha + 0.3)})`
              ctx.shadowColor = '#a855f7'
              ctx.shadowBlur = 8
            } else if (isInsideMountain) {
              // Rich cyber waterfall inside mountain
              ctx.fillStyle = `rgba(168, 85, 247, ${alpha * 0.85})`
            } else {
              // Faint sky rain above mountain
              ctx.fillStyle = `rgba(147, 51, 234, ${alpha * 0.38})`
            }
          }

          ctx.fillText(drop.chars[j], x, charY)
        }

        // Move rain drop downward
        drop.y += drop.speed

        // Reset drop when past bottom
        if (drop.y - drop.length * fontSize > height) {
          drop.y = Math.random() * -60
          drop.speed = Math.random() * 2.2 + 1.2
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  )
}

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
      {/* Waterfall Matrix Mountain Rain Backdrop */}
      <MountainMatrixCanvas />

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