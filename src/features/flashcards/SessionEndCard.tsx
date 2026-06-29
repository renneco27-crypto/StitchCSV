'use client'

import { useRouter } from 'next/navigation'

interface SessionEndCardProps {
  knownCount: number
  unknownCount: number
  totalCards: number
  deckId: string
  cycleNumber: number
  hasMoreBatches: boolean
  onNextBatch: () => void
  onResetCycle: () => void
}

export default function SessionEndCard({
  knownCount,
  unknownCount,
  deckId,
  cycleNumber,
  hasMoreBatches,
  onNextBatch,
  onResetCycle,
}: SessionEndCardProps) {
  const router = useRouter()
  const accuracy = knownCount + unknownCount > 0
    ? Math.round((knownCount / (knownCount + unknownCount)) * 100)
    : 0

  const confettiDots = !hasMoreBatches
    ? Array.from({ length: 8 }).map((_, i) => {
        const colors = ['var(--color-know)', 'var(--color-mastered)', 'var(--color-accent)', 'var(--color-new)']
        const color = colors[i % colors.length]
        const angle = (i / 8) * 360
        const distance = 60 + (i * 5)
        return {
          color,
          dx: `${Math.cos((angle * Math.PI) / 180) * distance}px`,
          dy: `${Math.sin((angle * Math.PI) / 180) * distance}px`,
          delay: `${i * 0.05}s`,
        } as const
      })
    : []

  return (
    <div className="relative max-w-sm mx-auto">
      {!hasMoreBatches && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiDots.map((dot, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full top-1/2 left-1/2"
              style={{
                backgroundColor: dot.color,
                animation: `confetti-burst 1.5s ease-out forwards`,
                animationDelay: dot.delay,
                ['--dx' as string]: dot.dx,
                ['--dy' as string]: dot.dy,
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-8 text-center relative z-10">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {hasMoreBatches ? 'Batch complete' : `Cycle ${cycleNumber} complete! 🎉`}
        </h2>

        <div className="flex justify-center gap-6 mt-4">
          <span className="text-[var(--color-know)] font-medium">
            ✓ {knownCount}
          </span>
          <span className="text-[var(--color-dontknow)] font-medium">
            ✕ {unknownCount}
          </span>
          <span className="text-[var(--color-text-muted)]">
            {accuracy}%
          </span>
        </div>

        <hr className="my-6 border-[var(--color-border)]" />

        <div className="flex flex-col gap-3">
          {hasMoreBatches ? (
            <button
              onClick={onNextBatch}
              className="bg-[var(--color-accent)] text-white rounded-xl py-3 font-medium w-full hover:opacity-90 transition-opacity"
            >
              Next batch →
            </button>
          ) : (
            <button
              onClick={onResetCycle}
              className="bg-[var(--color-accent)] text-white rounded-xl py-3 font-medium w-full hover:opacity-90 transition-opacity"
            >
              Start new cycle ↺
            </button>
          )}

          <button
            onClick={() => router.push('/study/' + deckId)}
            className="text-[var(--color-text-secondary)] text-sm hover:underline py-2"
          >
            ← Back to deck
          </button>
        </div>
      </div>

      {!hasMoreBatches && (
        <style>{`
          @keyframes confetti-burst {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
          }
        `}</style>
      )}
    </div>
  )
}
