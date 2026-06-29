'use client'

import { useEffect, useState } from 'react'
import { getCardsByDeck, getCardsForReview } from '@/db/cardRepository'
import { useStatsStore } from '@/store/statsStore'
import {
  computeAccuracy,
  computeProgress,
  getCardsByMastery,
} from '@/features/stats/statsCalculator'
import type { Card } from '@/lib/zodSchemas'

export function useStudyStats(deckId: string) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const stats = useStatsStore((s) => s.stats[deckId])
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const allCards = await getCardsByDeck(deckId)
      if (cancelled) return
      setCards(allCards)

      const dueCards = await getCardsForReview(deckId, new Date())
      if (cancelled) return
      setDueCount(dueCards.length)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [deckId])

  const { mastered, learning, new: newCards } = getCardsByMastery(cards)

  const accuracy = computeAccuracy(
    stats?.correct ?? 0,
    stats?.wrong ?? 0
  )

  const progress = computeProgress(
    stats?.masteredCount ?? 0,
    cards.length
  )

  return {
    stats,
    cards,
    masteredCount: mastered.length,
    learningCount: learning.length,
    newCount: newCards.length,
    accuracy,
    progress,
    dueCount,
    loading,
  }
}
