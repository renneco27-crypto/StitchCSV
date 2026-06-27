'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDeck } from '@/db/deckRepository'
import { useQuizSession } from '@/hooks/useQuizSession'
import { shuffleSeeded } from '@/lib/shuffleSeeded'
import TopBar from '@/components/TopBar'
import QuizProgressBar from '@/features/quiz/QuizProgressBar'
import EnumerationCard from '@/features/quiz/EnumerationCard'
import QuizSummary from '@/features/quiz/QuizSummary'
import type { EnumerationItem } from '@/lib/zodSchemas'

export default function EnumerationPage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const session = useQuizSession(deckId, 'enumeration')

  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [itemPage, setItemPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeck(deckId).then(() => setLoading(false))
  }, [deckId])

  const currentItem = session.currentQuestion as EnumerationItem | null

  const resetAndNext = useCallback(() => {
    setUserAnswers(Array(currentItem?.items.length ?? 0).fill(''))
    setItemPage(0)
    session.handleNext()
  }, [session, currentItem])

  const handleReveal = useCallback(() => {
    if (!currentItem) return
    const items = currentItem.items
    let correct = 0
    for (let i = 0; i < items.length; i++) {
      const user = userAnswers[i]?.toLowerCase().trim()
      const expected = items[i]?.toLowerCase().trim()
      if (user && user === expected) correct++
    }
    session.handleAnswer(correct === items.length ? 'got_it' : 'missed')
    setTimeout(resetAndNext, 800)
  }, [session, userAnswers, resetAndNext, currentItem])

  const shuffledItems = useMemo(() => {
    if (!currentItem) return []
    return shuffleSeeded([...currentItem.items], session.currentIndex)
  }, [currentItem, session.currentIndex])

  const handleAnswerChange = useCallback((index: number, value: string) => {
    setUserAnswers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (session.showSummary) return
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleReveal()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session.showSummary, handleReveal])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading…</div>
      </div>
    )
  }

  if (session.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-text-muted)]">No enumeration questions in this deck</p>
        <button onClick={() => router.push('/study/' + deckId)} className="text-[var(--color-accent)] text-sm hover:underline">
          ← Back to deck
        </button>
      </div>
    )
  }

  if (session.showSummary) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] p-4 flex items-center">
        <QuizSummary
          correct={session.correct}
          wrong={session.wrong}
          total={session.questions.length}
          mode="Enumeration"
          deckId={deckId}
          onRetry={session.handleRestart}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title="Enumeration"
        onBack={() => router.push('/study/' + deckId)}
        rightSlot={
          <button onClick={() => session.handleRestart()} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm">
            ✕
          </button>
        }
      />

      <QuizProgressBar
        current={session.currentIndex + 1}
        total={session.questions.length}
        correct={session.correct}
        wrong={session.wrong}
      />

      <div className="flex-1 p-4 flex flex-col gap-4">
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          Set {session.currentIndex + 1} of {session.questions.length}
        </p>

        <EnumerationCard
          topic={currentItem?.topic ?? ''}
          items={shuffledItems}
          userAnswers={userAnswers}
          currentPage={itemPage}
          onReveal={handleReveal}
          onPageChange={setItemPage}
          onAnswerChange={handleAnswerChange}
          chapter={currentItem?.chapter ?? ''}
          subject={currentItem?.subject ?? ''}
        />
      </div>
    </div>
  )
}