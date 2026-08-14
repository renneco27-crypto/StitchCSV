'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
      const allCards = (await getCardsByDeck(deckId)).filter((c) => (c.type as string) !== 'tf')
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

  // Swipe gesture tracking
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const historyStack = useRef<number[]>([]) // stores cardIndex values going back

  // Track forward navigation into history
  const pushHistory = useCallback((idx: number) => {
    historyStack.current = [...historyStack.current.slice(-2), idx] // max 3 back
  }, [])

  const handleSwipeRight = useCallback(() => {
    pushHistory(session.cardIndex)
    session.handleNext()
  }, [session, pushHistory])

  const handleSwipeLeft = useCallback(() => {
    if (historyStack.current.length === 0) return // nothing to go back to
    historyStack.current = historyStack.current.slice(0, -1)
    session.handlePrev()
  }, [session])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx < 0 && historyStack.current.length === 0) return
      setDragX(dx * 0.35)
      setDragY(0)
    } else {
      // Vertical swipe
      setDragY(dy * 0.35)
      setDragX(0)
    }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    setDragX(0)
    setDragY(0)
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal: left/right navigation
      if (Math.abs(dx) > 60) {
        if (dx > 0) handleSwipeLeft()
        else handleSwipeRight()
      }
    } else {
      // Vertical: know / don't know
      if (Math.abs(dy) > 60) {
        if (dy < 0) {
          // Swipe UP = Know
          pushHistory(session.cardIndex)
          session.handleKnow()
        } else {
          // Swipe DOWN = Don't Know
          pushHistory(session.cardIndex)
          session.handleDontKnow()
        }
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }, [handleSwipeLeft, handleSwipeRight, pushHistory, session])

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

  // Glow hint for buttons during vertical swipe
  const swipeHint = dragY < -30 ? 'know' : dragY > 30 ? 'dontknow' : null

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] flex flex-col">
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

      <div
          className="flex-1 p-4 overflow-hidden flex items-center"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
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
            <div
              style={{
                transform: `translateX(${dragX}px) translateY(${dragY}px)`,
                transition: (dragX === 0 && dragY === 0) ? 'transform 0.25s ease' : 'none',
                width: '100%',
              }}
            >
              <FlashcardDeck
                key={session.currentCard.id}
                card={session.currentCard}
                isFlipped={session.isFlipped}
                animationClass={session.animationClass}
                onFlip={session.handleFlip}
                onVerify={session.handleVerifyAnswer}
              />
            </div>
          ) : null}
        </div>

      {!session.showSessionEnd && (
        <FlashcardControls
          isFlipped={session.isFlipped}
          isFirst={isFirst}
          isLast={isLastOverall}
          isAnimating={session.isAnimating}
          swipeHint={swipeHint}
          onPrev={session.handlePrev}
          onNext={session.handleNext}
          onKnow={session.handleKnow}
          onDontKnow={session.handleDontKnow}
        />
      )}
    </div>
  )
}
