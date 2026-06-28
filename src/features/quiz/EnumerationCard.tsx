'use client'

import { useState } from 'react'
import { Eye, Check, X } from 'lucide-react'
import { ITEMS_PER_ENUM_PAGE } from '@/lib/constants'

interface EnumerationCardProps {
  topic: string
  items: string[]
  userAnswers: string[]
  currentPage: number
  onCheckAnswers: () => void
  onAdvance: () => void
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
  onCheckAnswers,
  onAdvance,
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

  const [checked, setChecked] = useState(false)

  const results = pageItems.map((item, i) => {
    const globalIndex = startIndex + i
    const user = (userAnswers[globalIndex] ?? '').toLowerCase().trim()
    const expected = item.toLowerCase().trim()
    return { globalIndex, user, expected, correct: user === expected }
  })

  const allCorrect = results.every((r) => r.correct)

  const handleCheck = () => {
    setChecked(true)
    onCheckAnswers()
  }

  const handleAdvance = () => {
    setChecked(false)
    onAdvance()
  }

  if (!checked) {
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
            onClick={handleCheck}
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
      <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] mb-4">
        <span>{chapter}</span>
        <span>·</span>
        <span>{subject}</span>
      </div>
      <p className="text-lg font-medium text-center text-[var(--color-text-primary)] mb-4">{topic}</p>

      <div className="space-y-3 max-w-md mx-auto">
        {results.map((r) => {
          const answer = userAnswers[r.globalIndex] ?? ''
          return (
            <div key={r.globalIndex}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium"
                  style={{
                    backgroundColor: r.correct ? 'var(--color-know-soft)' : 'var(--color-dontknow-soft)',
                    color: r.correct ? 'var(--color-know)' : 'var(--color-dontknow)',
                  }}
                >
                  {r.correct ? <Check size={16} /> : <X size={16} />}
                </span>
                <span className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-sm font-medium flex items-center justify-center flex-shrink-0">
                  {r.globalIndex + 1}
                </span>
                <input
                  type="text"
                  value={answer}
                  readOnly
                  className={`flex-1 px-4 py-3 rounded-xl border-2 bg-[var(--color-bg)] text-[var(--color-text-primary)] ${
                    r.correct
                      ? 'border-[var(--color-know)]'
                      : 'border-[var(--color-dontknow)]'
                  }`}
                />
              </div>
              {!r.correct && (
                <p className="text-sm text-[var(--color-know)] ml-[4.5rem] mt-1">
                  Correct: {r.expected}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={handleAdvance}
          className="bg-[var(--color-accent)] text-white rounded-xl py-3 px-8 font-medium hover:opacity-90 transition-opacity"
        >
          Next card
        </button>
      </div>
    </div>
  )
}
