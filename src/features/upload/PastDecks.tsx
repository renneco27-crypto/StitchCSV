'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Trash2 } from 'lucide-react'
import { getAllDecks, deleteDeck } from '@/db/deckRepository'
import { getCardsByDeck } from '@/db/cardRepository'
import StatBadge from '@/components/StatBadge'
import ExportButton from '@/features/export/ExportButton'
import { useStatsStore } from '@/store/statsStore'
import type { Deck } from '@/lib/zodSchemas'

export default function PastDecks() {
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[]>(() => [])
  const stats = useStatsStore((s) => s.stats)

  useEffect(() => {
    getAllDecks().then(setDecks)
  }, [])

  const handleDelete = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation()
    if (window.confirm('Delete this deck?')) {
      await deleteDeck(deckId)
      const allDecks = await getAllDecks()
      setDecks(allDecks)
    }
  }

  const [cardData, setCardData] = useState<Record<string, { total: number; mastered: number }>>({})

  useEffect(() => {
    const fetchCounts = async () => {
      const data: Record<string, { total: number; mastered: number }> = {}
      for (const deck of decks) {
        const cards = await getCardsByDeck(deck.id)
        data[deck.id] = {
          total: cards.length,
          mastered: cards.filter((c) => c.status === 'mastered').length,
        }
      }
      setCardData(data)
    }
    if (decks.length > 0) fetchCounts()
  }, [decks])

  if (decks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen size={48} className="mx-auto text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-muted)] mt-4">
          No decks yet — upload your first notes above
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {decks.map((deck) => {
        const deckStats = stats[deck.id]
        const cd = cardData[deck.id]
        const totalCards = cd?.total ?? 0
        const masteredCount = cd?.mastered ?? 0
        const progress = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0

        return (
          <div
            key={deck.id}
            onClick={() => router.push('/study/' + deck.id)}
            className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-4 cursor-pointer hover:border-[var(--color-accent)] transition"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium truncate">{deck.title}</span>
                <StatBadge label={deck.subject} value={''} color="accent" />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[var(--color-text-muted)]">
                  {totalCards} cards
                </span>
                {deckStats?.lastStudied && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Last studied:{' '}
                    {new Date(deckStats.lastStudied).toLocaleDateString()}
                  </span>
                )}
              </div>
              {totalCards > 0 && (
                <div className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden mt-2 max-w-[200px]">
                  <div
                    className="h-full bg-[var(--color-know)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <ExportButton deckId={deck.id} deckTitle={deck.title} variant="icon" />
              </div>
              <button
                onClick={(e) => handleDelete(e, deck.id)}
                className="text-[var(--color-dontknow)] hover:opacity-80 transition-opacity p-1"
                aria-label="Delete deck"
                title="Delete deck"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <span className="text-[var(--color-accent)] text-sm font-medium hover:underline">
              Resume →
            </span>
          </div>
        )
      })}
    </div>
  )
}
