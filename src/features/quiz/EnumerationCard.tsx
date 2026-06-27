'use client'

import { useState } from 'react'
import { Check, X, Eye, RotateCcw } from 'lucide-react'
import { ITEMS_PER_ENUM_PAGE } from '@/lib/constants'

interface EnumerationCardProps {
  topic: string
  items: string[]
  userAnswers: string[]
  currentPage: number
  onReveal: () => void
  onPageChange: (page: number) => void
  onAnswerChange: (index: number, value: string) => void
  chapter: string
  subject: string
}

export default function EnumerationCard({
  topic,
  items,
  userAnswers,
  currentPage,
  onReveal,
  onPageChange,
  onAnswerChange,
  chapter,
  subject,
}: EnumerationCardProps) {
  const totalPages = Math.ceil(items.length / ITEMS_PER_ENUM_PAGE)
  const pageItems = items.slice(
    currentPage * ITEMS_PER_ENUM_PAGE,
    (currentPage + 1) * ITEMS_PER_ENUM_PAGE
  )
  const startIndex = currentPage * ITEMS_PER_ENUM_PAGE

  const [isRevealed, setIsRevealed] = useState(false)

  const getAnswerStatus = (index: number) => {
    if (!isRevealed) return 'pending'
    const userAnswer = userAnswers[startIndex + index]?.toLowerCase().trim()
    const correctAnswer = items[startIndex + index]?.toLowerCase().trim()
    if (!userAnswer) return 'empty'
    return userAnswer === correctAnswer ? 'correct' : 'incorrect'
  }

  if (!isRevealed) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-8">
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] mb-4">
          <span>{chapter}</span>
          <span>·</span>
          <span>{subject}</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Type each item, then reveal to check</p>
        <p className="font-['DM_Serif_Display'] text-2xl text-center mb-6 text-[var(--color-text-primary)]">
          {topic}
        </p>
        <div className="mx-auto w-full max-w-md border-b-2 border-[var(--color-border-strong)]" />
        <p className="text-xs text-[var(--color-text-muted)] text-center mb-6">
          {items.length} items · {totalPages} page(s)
        </p>
        <div className="space-y-3 max-w-md mx-auto">
          {pageItems.map((item, i) => {
            const globalIndex = startIndex + i
            const answer = userAnswers[globalIndex] ?? ''
            return (
              <div key={globalIndex} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-sm font-medium flex items-center justify-center flex-shrink-0">
                  {globalIndex + 1}
                </span>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => onAnswerChange(globalIndex, e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            )
          })}
        </div>

        {items.length > ITEMS_PER_ENUM_PAGE && (
          <div className="flex gap-2 justify-center mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentPage
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-[var(--color-border)]'
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex justify-between mt-3">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-30 disabled:pointer-events-none"
          >
            ← Prev
          </button>
          <button
            onClick={onReveal}
            className="bg-[var(--color-accent)] text-white rounded-xl py-3 px-6 font-medium hover:opacity-90 transition-opacity"
          >
            <Eye size={18} className="inline-block mr-2" />
            Check Answers
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-30 disabled:pointer-events-none"
          >
            Next →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>{chapter}</span>
          <span>·</span>
          <span>{subject}</span>
        </div>
        <button
          onClick={() => setIsRevealed(false)}
          className="text-sm text-[var(--color-accent)] hover:underline flex items-center gap-1"
        >
          <RotateCcw size={16} />
          Retry
        </button>
      </div>

      <p className="text-lg font-medium text-center text-[var(--color-text-primary)] mb-4">{topic}</p>

      <div className="flex flex-col divide-y divide-[var(--color-border)]">
        {pageItems.map((item, i) => {
          const globalIndex = startIndex + i
          const status = getAnswerStatus(i)
          const userAnswer = userAnswers[globalIndex] ?? ''
          const isCorrect = status === 'correct'

          return (
            <div
              key={globalIndex}
              className="flex items-center gap-3 py-3"
              style={{
                animation: 'stagger-fade-in 300ms ease forwards',
                opacity: 0,
                animationDelay: `${i * 50}ms`,
              }}
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium"
                style={{
                  backgroundColor: isCorrect ? 'var(--color-know-soft)' : 'var(--color-dontknow-soft)',
                  color: isCorrect ? 'var(--color-know)' : 'var(--color-dontknow)',
                }}
              >
                {isCorrect ? <Check size={16} /> : <X size={16} />}
              </span>
              <span className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-sm font-medium flex items-center justify-center flex-shrink-0">
                {globalIndex + 1}
              </span>
              <span className="flex-1 text-base text-[var(--color-text-primary)]">{item}</span>
              {userAnswer && (
                <span className="text-sm px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: isCorrect ? 'var(--color-know-soft)' : 'var(--color-dontknow-soft)',
                    color: isCorrect ? 'var(--color-know)' : 'var(--color-dontknow)',
                  }}
                >
                  {isCorrect ? 'Correct' : 'Wrong'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {items.length > ITEMS_PER_ENUM_PAGE && (
        <div className="flex gap-2 justify-center mt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentPage
                  ? 'bg-[var(--color-accent)]'
                  : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex justify-between mt-3">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-30 disabled:pointer-events-none"
        >
          ← Prev
        </button>
        <button
          onClick={() => setIsRevealed(false)}
          className="bg-[var(--color-accent)] text-white rounded-xl py-3 px-6 font-medium hover:opacity-90 transition-opacity"
        >
          <RotateCcw size={18} className="inline-block mr-2" />
          Retry
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-30 disabled:pointer-events-none"
        >
          Next →
        </button>
      </div>
    </div>
  )
}