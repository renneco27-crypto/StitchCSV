'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuizSession } from '@/hooks/useQuizSession'
import { checkIdentificationAnswer } from '@/features/identification/answerChecker'
import TopBar from '@/components/TopBar'
import QuizProgressBar from '@/features/quiz/QuizProgressBar'
import QuizSummary from '@/features/quiz/QuizSummary'
import { Check, X } from 'lucide-react'
import type { IdentificationItem } from '@/lib/zodSchemas'

export default function IdentificationPage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const session = useQuizSession(deckId, 'identification')

  const [userAnswer, setUserAnswer] = useState('')
  const [result, setResult] = useState<{ isCorrect: boolean; matchedVariant: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const currentItem = session.currentQuestion as IdentificationItem | null

  const handleCheck = useCallback(() => {
    if (!currentItem || !userAnswer.trim()) return
    const res = checkIdentificationAnswer(userAnswer, currentItem.answer, currentItem.acceptVariants)
    setResult(res)
    session.handleAnswer(userAnswer, res.isCorrect)
  }, [currentItem, userAnswer, session])

  const handleNext = useCallback(() => {
    setUserAnswer('')
    setResult(null)
    session.handleNext()
  }, [session])

  const handleSkip = useCallback(() => {
    if (!currentItem) return
    setResult({ isCorrect: false, matchedVariant: null })
    session.handleAnswer('', false)
  }, [currentItem, session])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (session.showSummary) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!result) {
          handleCheck()
        } else {
          handleNext()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session.showSummary, result, handleCheck, handleNext])

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
        <p className="text-[var(--color-text-muted)]">No identification questions in this deck</p>
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
          mode="Identification"
          deckId={deckId}
          onRetry={session.handleRestart}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title="Identification"
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
          {session.currentIndex + 1} of {session.questions.length}
        </p>

        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8">
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] mb-4">
            <span>{currentItem?.chapter}</span>
            <span>·</span>
            <span>{currentItem?.subject}</span>
          </div>
          <p className="font-['DM_Serif_Display'] text-2xl text-center text-[var(--color-text-primary)]">
            {currentItem?.definition}
          </p>
        </div>

        {!result ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCheck}
                disabled={!userAnswer.trim()}
                className="flex-1 bg-[var(--color-accent)] text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                Check answer
              </button>
              <button
                onClick={handleSkip}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] px-4"
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-3 mb-3">
              {result.isCorrect ? (
                <div className="flex items-center gap-2 text-[var(--color-know)]">
                  <Check size={24} />
                  <span className="font-medium">Correct!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[var(--color-dontknow)]">
                  <X size={24} />
                  <span className="font-medium">Not quite</span>
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">Correct answer:</p>
            <p className="text-lg font-medium text-[var(--color-know)]">{currentItem?.answer}</p>
            {result.matchedVariant && result.matchedVariant !== currentItem?.answer && (
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                Matched variant: {result.matchedVariant}
              </p>
            )}
            <button
              onClick={handleNext}
              className="mt-4 w-full bg-[var(--color-accent)] text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity"
            >
              {session.currentIndex >= session.questions.length - 1 ? 'See results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
