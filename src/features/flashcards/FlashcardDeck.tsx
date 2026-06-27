'use client'

import { Star } from 'lucide-react'
import type { Card } from '@/lib/zodSchemas'
import StatBadge from '@/components/StatBadge'

interface FlashcardDeckProps {
  card: Card
  isFlipped: boolean
  animationClass: 'none' | 'slide-right' | 'slide-left' | 'slide-in'
  onFlip: () => void
}

export default function FlashcardDeck({
  card,
  isFlipped,
  animationClass,
  onFlip,
}: FlashcardDeckProps) {
  const animClass =
    animationClass === 'none' ? '' : animationClass

  const statusColor =
    card.status === 'new'
      ? 'new'
      : card.status === 'learning'
        ? 'mastered'
        : 'know'

  return (
    <div
      className={`h-72 md:h-96 w-full cursor-pointer ${animClass}`}
      style={{ perspective: '1000px' }}
      onClick={onFlip}
    >
      <div
        className="relative w-full h-full transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-8 flex flex-col"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              {card.chapter}
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < card.mastery ? 'fill-[var(--color-mastered)] text-[var(--color-mastered)]' : 'text-[var(--color-text-muted)]'}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="font-['DM_Serif_Display'] text-3xl md:text-4xl text-center text-[var(--color-text-primary)]">
              {card.front}
            </p>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Tap to reveal answer ↕
          </p>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 bg-[#FAFAF7] dark:bg-[#201F1C] rounded-2xl border border-[var(--color-border)] shadow-lg p-8 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              {card.chapter}
            </span>
            <StatBadge label={card.status} value="" color={statusColor} />
          </div>
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <p className="text-xl font-medium text-center text-[var(--color-text-primary)]">
              {card.back}
            </p>
            {card.type === 'formula' && (
              <>
                <hr className="w-full border-[var(--color-border)]" />
                <p className="font-mono text-sm text-[var(--color-text-muted)]">
                  {card.back}
                </p>
              </>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            ↩ Tap to flip back
          </p>
        </div>
      </div>
    </div>
  )
}
