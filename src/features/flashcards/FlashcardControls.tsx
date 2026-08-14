'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface FlashcardControlsProps {
  isFlipped: boolean
  isFirst: boolean
  isLast: boolean
  isAnimating: boolean
  swipeHint?: 'know' | 'dontknow' | null
  onPrev: () => void
  onNext: () => void
  onKnow: () => void
  onDontKnow: () => void
}

export default function FlashcardControls({
  isFlipped,
  isFirst,
  isLast,
  isAnimating,
  swipeHint,
  onPrev,
  onNext,
  onKnow,
  onDontKnow,
}: FlashcardControlsProps) {
  return (
    <div className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-4 pb-safe">
      <div className="flex gap-2 items-center">
        <button
          onClick={onPrev}
          disabled={isFirst || isAnimating}
          className="text-[var(--color-text-secondary)] px-4 py-3 rounded-xl hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Previous card"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={onDontKnow}
          disabled={!isFlipped || isAnimating}
          className={`flex-1 border text-[var(--color-dontknow)] px-4 py-3 rounded-xl font-medium disabled:opacity-30 disabled:pointer-events-none transition-all duration-150
            ${swipeHint === 'dontknow'
              ? 'border-[var(--color-dontknow)] bg-[var(--color-dontknow)]/20 shadow-[0_0_20px_var(--color-dontknow)] scale-105'
              : 'border-[var(--color-dontknow)] hover:bg-[var(--color-dontknow-soft)]'
            }`}
          aria-label="I don't know this card"
        >
          I Don&apos;t Know
        </button>

        <button
          onClick={onKnow}
          disabled={!isFlipped || isAnimating}
          className={`flex-1 text-white px-4 py-3 rounded-xl font-medium disabled:opacity-30 disabled:pointer-events-none transition-all duration-150
            ${swipeHint === 'know'
              ? 'bg-[var(--color-know)] shadow-[0_0_24px_var(--color-know)] scale-105 opacity-100'
              : 'bg-[var(--color-know)] hover:opacity-90'
            }`}
          aria-label="I know this card"
        >
          I Know
        </button>

        <button
          onClick={onNext}
          disabled={isLast || isAnimating}
          className="text-[var(--color-text-secondary)] px-4 py-3 rounded-xl hover:bg-[var(--color-surface-2)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Next card"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="hidden md:flex justify-center gap-6 mt-2 text-xs text-[var(--color-text-muted)]">
        <span className="border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[10px]">
          [Space] Flip
        </span>
        <span className="border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[10px]">
          [K] Know
        </span>
        <span className="border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[10px]">
          [D] Don&apos;t Know
        </span>
        <span className="border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[10px]">
          [←] Prev
        </span>
        <span className="border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono text-[10px]">
          [→] Next
        </span>
      </div>
    </div>
  )
}
