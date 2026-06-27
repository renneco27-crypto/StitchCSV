'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { getCardsByDeck, getCardsForReview } from '@/db/cardRepository'
import { useFlashcardSession } from '@/hooks/useFlashcardSession'
import TopBar from '@/components/TopBar'
import FlashcardProgress from '@/features/flashcards/FlashcardProgress'
import FlashcardDeck from '@/features/flashcards/FlashcardDeck'
import FlashcardControls from '@/features/flashcards/FlashcardControls'
import SessionEndCard from '@/features/flashcards/SessionEndCard'
import type { Card } from '@/lib/zodSchemas'

export default function FlashcardsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const deckId = params.deckId as string
  const modeReview = searchParams.get('mode') === 'review'

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const allCards = await getCardsByDeck(deckId)
      if (allCards.length === 0) {
        setLoading(false)
        return
      }
      if (modeReview) {
        const dueCards = await getCardsForReview(deckId, new Date())
        setCards(dueCards.length > 0 ? dueCards : allCards)
      } else {
        setCards(allCards)
      }
      setLoading(false)
    }
    load()
  }, [deckId, modeReview])

  const session = useFlashcardSession(deckId, cards)

  const handleBack = useCallback(() => {
    session.handleEndSession()
    router.push('/study/' + deckId)
  }, [session, router, deckId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        session.handleFlip()
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        session.handleKnow()
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        session.handleDontKnow()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        session.handlePrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        session.handleNext()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        handleBack()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session, handleBack])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading cards…</div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-text-muted)]">No cards in this deck</p>
        <button
          onClick={() => router.push('/study/' + deckId)}
          className="text-[var(--color-accent)] text-sm font-medium hover:underline"
        >
          ← Back to deck
        </button>
      </div>
    )
  }

  const isFirst = session.cardIndex === 0 && session.batchIndex === 0
  const isLastCardInBatch = session.cardIndex >= session.currentBatch.length - 1
  const isLastOverall = isLastCardInBatch && session.batchIndex >= session.totalBatches - 1

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title={'Batch ' + (session.batchIndex + 1) + ' of ' + session.totalBatches}
        onBack={handleBack}
        rightSlot={
          <button
            onClick={session.handleEndSession}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
            aria-label="End session"
          >
            <X size={20} />
          </button>
        }
      />

      <FlashcardProgress
        cardIndex={session.cardIndex}
        batchSize={session.currentBatch.length}
        batchIndex={session.batchIndex}
        totalBatches={session.totalBatches}
      />

      <div className="flex-1 p-4 overflow-hidden flex items-center">
        {session.showSessionEnd ? (
          <SessionEndCard
            knownCount={session.cycleKnownIds.length}
            unknownCount={session.cycleUnknownIds.length}
            totalCards={cards.length}
            deckId={deckId}
            cycleNumber={session.cycleNumber}
            hasMoreBatches={session.batchIndex < session.totalBatches - 1}
            onNextBatch={session.handleNextBatch}
            onResetCycle={session.handleResetCycle}
          />
        ) : session.currentCard ? (
          <FlashcardDeck
            card={session.currentCard}
            isFlipped={session.isFlipped}
            animationClass={session.animationClass}
            onFlip={session.handleFlip}
          />
        ) : null}
      </div>

      {!session.showSessionEnd && (
        <FlashcardControls
          isFlipped={session.isFlipped}
          isFirst={isFirst}
          isLast={isLastOverall}
          isAnimating={session.isAnimating}
          onPrev={session.handlePrev}
          onNext={session.handleNext}
          onKnow={session.handleKnow}
          onDontKnow={session.handleDontKnow}
        />
      )}
    </div>
  )
}
