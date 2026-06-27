'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Star } from 'lucide-react'
import type { Card } from '@/lib/zodSchemas'
import { getMasteryStars } from './statsCalculator'

interface CardMasteryListProps {
  cards: Card[]
  deckId: string
  defaultExpanded?: boolean
}

export default function CardMasteryList({ cards, deckId, defaultExpanded = false }: CardMasteryListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAll, setShowAll] = useState(false)
  const router = useRouter()

  const sorted = [...cards].sort((a, b) => a.mastery - b.mastery)
  const display = showAll ? sorted : sorted.slice(0, 10)

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full cursor-pointer"
      >
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Card mastery</span>
        <ChevronDown
          size={16}
          className="text-[var(--color-text-muted)] transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-0">
          {display.map((card, i) => {
            const stars = getMasteryStars(card.mastery)
            return (
              <div
                key={card.id}
                className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate max-w-[180px]">
                  {card.front.length > 36 ? card.front.slice(0, 36) + '…' : card.front}
                </span>
                <span className="flex gap-0.5 text-xs text-[var(--color-mastered)]">
                  {Array.from({ length: stars.filled }).map((_, i) => (
                    <Star key={`f-${i}`} size={12} className="fill-[var(--color-mastered)]" />
                  ))}
                  {Array.from({ length: stars.empty }).map((_, i) => (
                    <Star key={`e-${i}`} size={12} className="text-[var(--color-border)]" />
                  ))}
                </span>
                <span className="text-xs text-[var(--color-know)]">✓{card.correctCount}</span>
                <span className="text-xs text-[var(--color-dontknow)]">✕{card.wrongCount}</span>
              </div>
            )
          })}

          {sorted.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-[var(--color-text-muted)] mt-2 hover:underline"
            >
              Show all {cards.length} cards ↓
            </button>
          )}

          <button
            onClick={() => router.push('/study/' + deckId + '/flashcards')}
            className="text-[var(--color-accent)] text-sm mt-3 hover:underline block"
          >
            Study weak cards →
          </button>
        </div>
      )}
    </div>
  )
}
