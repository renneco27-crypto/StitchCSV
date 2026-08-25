'use client'

import { useEffect, useRef } from 'react'

interface MatrixRainBackgroundProps {
  opacity?: number
  speedMultiplier?: number
}

export default function MatrixRainBackground({
  opacity = 0.35,
  speedMultiplier = 0.3,
}: MatrixRainBackgroundProps) {
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

    // Cyber / Matrix Glyphs
    const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜΣΩλπψ§∆∇'
    const fontSize = 15
    let columns = Math.floor(width / fontSize)

    interface Drop {
      y: number
      speed: number
      length: number
      chars: string[]
    }

    let drops: Drop[] = []

    const initColumns = () => {
      columns = Math.floor(width / fontSize)
      drops = []
      for (let i = 0; i < columns; i++) {
        const length = Math.floor(Math.random() * 16) + 8
        const charArr: string[] = []
        for (let j = 0; j < length; j++) {
          charArr.push(chars[Math.floor(Math.random() * chars.length)])
        }
        drops.push({
          y: Math.random() * -height,
          speed: (Math.random() * 0.9 + 0.6) * speedMultiplier,
          length,
          chars: charArr,
        })
      }
    }

    initColumns()

    let lastTime = performance.now()
    const fpsInterval = 1000 / 30 // Smooth 30 FPS gentle rain flow

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render)

      const elapsed = currentTime - lastTime
      if (elapsed < fpsInterval) return
      lastTime = currentTime - (elapsed % fpsInterval)

      // Solid background clear each frame prevents alpha strobe flicker
      ctx.clearRect(0, 0, width, height)

      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns; i++) {
        const drop = drops[i]
        const x = i * fontSize

        for (let j = 0; j < drop.length; j++) {
          const charY = drop.y - j * fontSize
          if (charY < -fontSize || charY > height + fontSize) continue

          // Random character mutation
          if (Math.random() < 0.02) {
            drop.chars[j] = chars[Math.floor(Math.random() * chars.length)]
          }

          if (j === 0) {
            // Bright white/lavender leading drop head
            ctx.fillStyle = '#f5d0fe'
          } else if (j === 1) {
            // Bright neon purple
            ctx.fillStyle = '#c084fc'
          } else {
            // Fading purple trail
            const trailAlpha = 1 - j / drop.length
            ctx.fillStyle = `rgba(168, 85, 247, ${trailAlpha * 0.75})`
          }

          ctx.fillText(drop.chars[j] || '0', x, charY)
        }

        // Advance drop smoothly at slow relaxed speed
        drop.y += drop.speed * (fontSize * 0.4)

        // Reset drop when tail passes bottom
        if (drop.y - drop.length * fontSize > height) {
          drop.y = -Math.random() * 100
          drop.speed = (Math.random() * 0.9 + 0.6) * speedMultiplier
          drop.length = Math.floor(Math.random() * 16) + 8
        }
      }
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [speedMultiplier])

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10"
    />
  )
}
