'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCardsByDeck } from '@/db/cardRepository'
import { useQuizSession } from '@/hooks/useQuizSession'
import { buildMCQuestion } from '@/features/quiz/distractorEngine'
import TopBar from '@/components/TopBar'
import QuizProgressBar from '@/features/quiz/QuizProgressBar'
import MCOption from '@/features/quiz/MCOption'
import QuizSummary from '@/features/quiz/QuizSummary'
import type { Card, MultipleChoiceItem } from '@/lib/zodSchemas'

type MCOptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'reveal'

export default function MultipleChoicePage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const session = useQuizSession(deckId, 'multiple_choice')

  const [allCards, setAllCards] = useState<Card[]>(() => [])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [optionStates, setOptionStates] = useState<MCOptionState[]>(['default', 'default', 'default', 'default'])

  useEffect(() => {
    getCardsByDeck(deckId).then((cards) => {
      setAllCards(cards)
      setLoading(false)
    })
  }, [deckId])

  const mcQuestion = useMemo(() => {
    if (!session.currentQuestion || allCards.length === 0) return null
    const q = session.currentQuestion as MultipleChoiceItem
    const targetCard = allCards.find((c) => c.front === q.question)
    if (!targetCard) return null
    return buildMCQuestion(targetCard, allCards)
  }, [session.currentQuestion, allCards])

  const handleSelect = useCallback(
    (index: number) => {
      if (session.answerState !== 'unanswered') return
      setSelectedIndex(index)
      setOptionStates(
        optionStates.map((s, i) => (i === index ? 'selected' : 'default'))
      )
    },
    [session.answerState, optionStates]
  )

  const handleCheck = useCallback(() => {
    if (selectedIndex === null || !mcQuestion) return
    const selectedText = mcQuestion.options[selectedIndex].text
    const isCorrect = selectedText === mcQuestion.correct
    if (isCorrect) {
      setOptionStates(optionStates.map((s, i) => (i === selectedIndex ? 'correct' : s)))
    } else {
      setOptionStates(optionStates.map((s, i) => {
        if (i === selectedIndex) return 'wrong'
        if (mcQuestion.options[i].text === mcQuestion.correct) return 'reveal'
        return s
      }))
    }
    session.handleAnswer(selectedText, isCorrect)
  }, [selectedIndex, mcQuestion, optionStates, session])

  const handleNext = useCallback(() => {
    setSelectedIndex(null)
    setOptionStates(['default', 'default', 'default', 'default'])
    session.handleNext()
  }, [session])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (session.showSummary) return
      const keyMap: Record<string, number> = {
        '1': 0, 'A': 0, 'a': 0,
        '2': 1, 'B': 1, 'b': 1,
        '3': 2, 'C': 2, 'c': 2,
        '4': 3, 'D': 3, 'd': 3,
      }
      if (keyMap[e.key] !== undefined) {
        handleSelect(keyMap[e.key])
      }
      if (e.key === 'Enter') {
        if (session.answerState === 'unanswered' && selectedIndex !== null) {
          handleCheck()
        } else if (session.answerState !== 'unanswered') {
          handleNext()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session.showSummary, session.answerState, selectedIndex, handleSelect, handleCheck, handleNext])

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
        <p className="text-[var(--color-text-muted)]">No multiple choice questions in this deck</p>
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
          mode="Multiple Choice"
          deckId={deckId}
          onRetry={session.handleRestart}
        />
      </div>
    )
  }

  const currentQuestion = session.currentQuestion as MultipleChoiceItem | null

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title="Multiple Choice"
        onBack={() => router.push('/study/' + deckId)}
        rightSlot={
          <button
            onClick={() => session.handleRestart()}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm"
          >
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

      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{currentQuestion?.chapter}</span>
            <span>&middot;</span>
            <span>{currentQuestion?.subject}</span>
          </div>
          <p className="font-['DM_Serif_Display'] text-2xl mt-2 text-[var(--color-text-primary)]">
            {currentQuestion?.question}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {mcQuestion?.options.map((opt, i) => (
            <MCOption
              key={i}
              label={opt.label}
              text={opt.text}
              state={optionStates[i] ?? 'default'}
              onClick={() => handleSelect(i)}
              disabled={session.answerState !== 'unanswered'}
            />
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4">
        {session.answerState === 'unanswered' ? (
          <button
            onClick={handleCheck}
            disabled={selectedIndex === null}
            className="bg-[var(--color-accent)] text-white rounded-xl py-3 w-full font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
          >
            Check answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="bg-[var(--color-accent)] text-white rounded-xl py-3 w-full font-medium hover:opacity-90 transition-opacity"
          >
            {session.currentIndex >= session.questions.length - 1 ? 'See results' : 'Next \u2192'}
          </button>
        )}
      </div>
    </div>
  )
}
