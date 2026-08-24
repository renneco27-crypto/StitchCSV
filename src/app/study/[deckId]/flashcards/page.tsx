'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { X, Layers, List } from 'lucide-react'
import { getCardsByDeck, getCardsForReview } from '@/db/cardRepository'
import { useFlashcardSession } from '@/hooks/useFlashcardSession'
import TopBar from '@/components/TopBar'
import FlashcardProgress from '@/features/flashcards/FlashcardProgress'
import FlashcardDeck from '@/features/flashcards/FlashcardDeck'
import FlashcardControls from '@/features/flashcards/FlashcardControls'
import SessionEndCard from '@/features/flashcards/SessionEndCard'
import FlashcardListView from '@/features/flashcards/FlashcardListView'
import type { Card } from '@/lib/zodSchemas'

export default function FlashcardsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const deckId = params.deckId as string
  const modeReview = searchParams.get('mode') === 'review'

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'stack' | 'list'>('stack')

  useEffect(() => {
    const load = async () => {
      const allCards = (await getCardsByDeck(deckId)).filter((c) => (c.type as string) !== 'tf' && c.type !== 'keyword')
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
  const [isDragging, setIsDragging] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [exitReset, setExitReset] = useState(false)
  const historyStack = useRef<number[]>([]) // stores cardIndex values going back

  const pushHistory = useCallback((idx: number) => {
    historyStack.current = [...historyStack.current, idx]
  }, [])

  const handleSwipeRight = useCallback(() => {
    pushHistory(session.cardIndex)
    session.handleNext()
  }, [session, pushHistory])

  const handleSwipeLeft = useCallback(() => {
    if (historyStack.current.length === 0) return
    historyStack.current = historyStack.current.slice(0, -1)
    session.handlePrev()
  }, [session])

  const flyOut = useCallback(
    (x: number, y: number, action: () => void) => {
      setIsExiting(true)
      setDragX(x)
      setDragY(y)
      action()
      setTimeout(() => {
        setExitReset(true)
        setIsExiting(false)
        setDragX(0)
        setDragY(0)
        setTimeout(() => setExitReset(false), 100)
      }, 330)
    },
    []
  )

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(false)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    e.preventDefault() // prevent page scroll during card drag
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 8) setIsDragging(true)
    // Allow full diagonal drag — both axes move simultaneously
    const dampX = dx * 0.4
    const dampY = dy * 0.4
    // Block left drag if no history
    setDragX(dx < 0 && historyStack.current.length === 0 ? 0 : dampX)
    setDragY(dampY)
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    setIsDragging(false)
    touchStartX.current = null
    touchStartY.current = null

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const threshold = 60

    const reset = () => {
      setDragX(0)
      setDragY(0)
    }

    // Pick the dominant axis — whichever had more movement wins
    if (absDx >= absDy) {
      if (absDx > threshold) {
        if (dx > 0) {
          if (!session.isAnimating) {
            flyOut(window.innerWidth * 1.05, 0, () => handleSwipeRight())
          } else {
            reset()
          }
        } else if (historyStack.current.length > 0 && !session.isAnimating) {
          flyOut(-window.innerWidth * 1.05, 0, () => handleSwipeLeft())
        } else {
          reset()
        }
      } else {
        reset()
      }
    } else if (absDy > threshold) {
      if (session.isFlipped && !session.isAnimating) {
        if (dy < 0) {
          pushHistory(session.cardIndex)
          flyOut(0, -window.innerHeight * 1.05, () => session.handleKnow())
        } else {
          pushHistory(session.cardIndex)
          flyOut(0, window.innerHeight * 1.05, () => session.handleDontKnow())
        }
      } else {
        reset()
      }
    } else {
      reset()
    }
  }, [handleSwipeLeft, handleSwipeRight, pushHistory, session, flyOut])

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
    <div className="h-[calc(100dvh_-_57px)] lg:h-[100dvh] overflow-hidden bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title={viewMode === 'list' ? 'All Cards (' + cards.length + ')' : 'Batch ' + (session.batchIndex + 1) + ' of ' + session.totalBatches}
        onBack={handleBack}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'stack' ? 'list' : 'stack')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition-colors"
              title={viewMode === 'stack' ? 'Switch to scrollable list' : 'Switch to flashcard stack'}
            >
              {viewMode === 'stack' ? <List size={14} /> : <Layers size={14} />}
              <span className="hidden sm:inline">{viewMode === 'stack' ? 'List View' : 'Card View'}</span>
            </button>
            <button
              onClick={session.handleEndSession}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
              aria-label="End session"
            >
              <X size={20} />
            </button>
          </div>
        }
      />

      {viewMode === 'list' ? (
        <FlashcardListView
          cards={cards}
          onCardDeleted={(deletedId) => setCards(prev => prev.filter(c => c.id !== deletedId))}
        />
      ) : (
        <>
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
            style={{ touchAction: 'none' }}
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
                key={session.currentCard.id}
                style={{
                  transform: `translateX(${dragX}px) translateY(${dragY}px) rotate(${dragX * 0.04}deg) scale(${isDragging ? 1.03 : 1})`,
                  transition: exitReset
                    ? 'none'
                    : isExiting
                      ? 'transform 0.32s cubic-bezier(0.33, 0.6, 0.44, 1), box-shadow 0.3s ease'
                      : dragX === 0 && dragY === 0
                        ? 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.3s ease'
                        : 'none',
                  width: '100%',
                  boxShadow: isDragging ? '0 24px 48px rgba(0,0,0,0.35)' : undefined,
                  borderRadius: '1rem',
                  willChange: 'transform',
                }}
              >
                <FlashcardDeck
                  key={session.currentCard.id}
                  card={session.currentCard}
                  isFlipped={session.isFlipped}
                  animationClass={isExiting ? 'none' : session.animationClass}
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
        </>
      )}
    </div>
  )
}
