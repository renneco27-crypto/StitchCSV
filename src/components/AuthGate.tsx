'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function AuthGate() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [welcome, setWelcome] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const script = document.createElement('script')
    script.src = 'https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js'
    script.onload = () => {
      const THREE = (window as unknown as { THREE: { Scene: new () => any; PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => any; WebGLRenderer: new (opts: any) => any; Group: new () => any; SphereGeometry: new (r: number, w: number, h: number) => any; MeshPhongMaterial: new (opts: any) => any; Mesh: new (geo: any, mat: any) => any; AmbientLight: new (c: number, i: number) => any; PointLight: new (c: number, i: number) => any } }).THREE
      if (!THREE) return

      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
      camera.position.z = 5

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio || 1)
      renderer.domElement.style.position = 'absolute'
      renderer.domElement.style.top = '0'
      renderer.domElement.style.left = '0'
      container.appendChild(renderer.domElement)

      const flowers: any[] = []
      const flowerCount = 20

      const createFlower = () => {
        const flowerGroup = new THREE.Group()
        const centerGeo = new THREE.SphereGeometry(0.1, 8, 8)
        const centerMat = new THREE.MeshPhongMaterial({ color: 0xffd1dc })
        flowerGroup.add(new THREE.Mesh(centerGeo, centerMat))

        const petalGeo = new THREE.SphereGeometry(0.15, 8, 8)
        petalGeo.scale(1, 0.5, 2)
        const petalMat = new THREE.MeshPhongMaterial({ color: 0xff4d94 })

        for (let i = 0; i < 5; i++) {
          const petal = new THREE.Mesh(petalGeo, petalMat)
          const angle = (i / 5) * Math.PI * 2
          petal.position.x = Math.cos(angle) * 0.2
          petal.position.y = Math.sin(angle) * 0.2
          petal.rotation.z = angle
          flowerGroup.add(petal)
        }
        return flowerGroup
      }

      for (let i = 0; i < flowerCount; i++) {
        const flower = createFlower()
        flower.position.set((Math.random() - 0.5) * 10, Math.random() * 10 - 5, (Math.random() - 0.5) * 5)
        flower.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
        flower.userData = { speed: 0.01 + Math.random() * 0.02, rotSpeed: (Math.random() - 0.5) * 0.02 }
        scene.add(flower)
        flowers.push(flower)
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.8))
      const pointLight = new THREE.PointLight(0xffffff, 0.5)
      pointLight.position.set(5, 5, 5)
      scene.add(pointLight)

      const animate = () => {
        requestAnimationFrame(animate)
        flowers.forEach((f: any) => {
          f.position.y -= f.userData.speed
          f.rotation.x += f.userData.rotSpeed
          f.rotation.y += f.userData.rotSpeed
          if (f.position.y < -5) { f.position.y = 5; f.position.x = (Math.random() - 0.5) * 10 }
        })
        renderer.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        const nw = container.clientWidth || window.innerWidth
        const nh = container.clientHeight || window.innerHeight
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        renderer.dispose()
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
      }
    }
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [])

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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/study',
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#050505]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {welcome && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full border border-[var(--color-border)] px-6 py-3 cyber-glow">
          <p className="text-[var(--color-accent)] font-medium">{welcome}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative z-10 glass-panel w-full max-w-sm rounded-2xl border border-[var(--color-border)] p-8 text-center cyber-border"
      >
        <div className="flex justify-center mb-4">
          <img src="/logo.jpg" alt="MaeAI" className="w-14 h-14 rounded-xl object-cover cyber-glow" />
        </div>

        <h1 className="text-2xl font-['Playfair_Display'] text-[var(--color-text-primary)]">Mae<span className="text-[var(--color-accent)]">AI</span></h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {mode === 'signin' ? 'Sign in to continue' : 'Create an account to get started'}
        </p>

        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.18)] text-sm transition-shadow"
        />

        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-3 w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.18)] text-sm transition-shadow"
        />

        {error && <p className="text-sm text-[var(--color-dontknow)] mt-3 text-center">{error}</p>}
        {message && <p className="text-sm text-[var(--color-know)] mt-3 text-center">{message}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity squishy-btn cyber-glow-hover"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
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

        {/* Temporarily disabled Google Auth
        <div className="relative mt-6 mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[var(--color-surface)] px-2 text-[var(--color-text-muted)]">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-6 py-3 rounded-xl font-medium hover:bg-[var(--color-surface-3)] disabled:opacity-50 transition-colors squishy-btn"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
        */}
      </form>
    </div>
  )
}