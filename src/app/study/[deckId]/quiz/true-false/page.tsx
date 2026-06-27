'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuizSession } from '@/hooks/useQuizSession'
import TopBar from '@/components/TopBar'
import QuizProgressBar from '@/features/quiz/QuizProgressBar'
import TrueFalseCard from '@/features/quiz/TrueFalseCard'
import TrueFalseButtons from '@/features/quiz/TrueFalseButtons'
import ExplanationPanel from '@/features/quiz/ExplanationPanel'
import QuizSummary from '@/features/quiz/QuizSummary'
import type { AnswerState, TrueFalseItem } from '@/lib/zodSchemas'

export default function TrueFalsePage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const session = useQuizSession(deckId, 'true_false')

  const [userAnswer, setUserAnswer] = useState<boolean | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered')
  const [showPanel, setShowPanel] = useState(false)

  const displayVersions = useMemo(() => {
    if (session.questions.length === 0) return []
    return session.questions.map((_, i) => {
      const x = Math.sin(i + 1) * 10000
      return x - Math.floor(x) < 0.5
    })
  }, [session.questions])

  const loading = session.questions.length === 0 || displayVersions.length === 0

  const handleAnswer = useCallback(
    (userBool: boolean) => {
      if (answerState !== 'unanswered') return
      setUserAnswer(userBool)

      const correctAnswer = displayVersions[session.currentIndex] ?? true
      const isCorrect = userBool === correctAnswer

      setAnswerState(isCorrect ? 'correct' : 'wrong')
      setShowPanel(true)
      session.handleAnswer(userBool, isCorrect)
    },
    [answerState, session, displayVersions]
  )

  const handleNext = useCallback(() => {
    setShowPanel(false)
    setUserAnswer(null)
    setAnswerState('unanswered')
    session.handleNext()
  }, [session])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (session.showSummary) return
      if (e.key === 't' || e.key === 'T' || e.key === 'ArrowUp') {
        handleAnswer(true)
      }
      if (e.key === 'f' || e.key === 'F' || e.key === 'ArrowDown') {
        handleAnswer(false)
      }
      if (e.key === 'Enter' && showPanel) {
        handleNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session.showSummary, handleAnswer, handleNext, showPanel])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading&hellip;</div>
      </div>
    )
  }

  if (session.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-text-muted)]">No true/false questions in this deck</p>
        <button onClick={() => router.push('/study/' + deckId)} className="text-[var(--color-accent)] text-sm hover:underline">
          &larr; Back to deck
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
          mode="True / False"
          deckId={deckId}
          onRetry={session.handleRestart}
        />
      </div>
    )
  }

  const currentItem = session.currentQuestion as TrueFalseItem | null
  const showTrueVersion = displayVersions[session.currentIndex] ?? true
  const displayStatement = showTrueVersion ? currentItem?.statement ?? '' : currentItem?.falseVersion ?? ''
  const correctAnswer = showTrueVersion

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title="True / False"
        onBack={() => router.push('/study/' + deckId)}
        rightSlot={
          <button onClick={() => session.handleRestart()} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm">
            &times;
          </button>
        }
      />

      <QuizProgressBar
        current={session.currentIndex + 1}
        total={session.questions.length}
        correct={session.correct}
        wrong={session.wrong}
      />

      <div className="flex-1 p-4 flex flex-col gap-4 relative">
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          Set {session.currentIndex + 1} of {session.questions.length}
        </p>

        <TrueFalseCard
          statement={displayStatement}
          chapter={currentItem?.chapter ?? ''}
          subject={currentItem?.subject ?? ''}
        />

        <TrueFalseButtons
          answerState={answerState}
          userAnswer={userAnswer}
          correctAnswer={correctAnswer}
          onAnswer={handleAnswer}
        />
      </div>

      {showPanel && currentItem && (
        <ExplanationPanel
          isTrue={showTrueVersion}
          statement={currentItem.statement}
          explanation={currentItem.explanation}
          userWasCorrect={answerState === 'correct'}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
