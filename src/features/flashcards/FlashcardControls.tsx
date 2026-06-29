'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface FlashcardControlsProps {
  isFlipped: boolean
  isFirst: boolean
  isLast: boolean
  isAnimating: boolean
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
          className="flex-1 border border-[var(--color-dontknow)] text-[var(--color-dontknow)] px-4 py-3 rounded-xl font-medium hover:bg-[var(--color-dontknow-soft)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="I don't know this card"
        >
          I Don&apos;t Know
        </button>

        <button
          onClick={onKnow}
          disabled={!isFlipped || isAnimating}
          className="flex-1 bg-[var(--color-know)] text-white px-4 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-opacity"
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
