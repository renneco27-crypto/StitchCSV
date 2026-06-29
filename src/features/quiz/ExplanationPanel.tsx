'use client'

import { useEffect, useState } from 'react'

interface ExplanationPanelProps {
  isTrue: boolean
  statement: string
  explanation: string
  userWasCorrect: boolean
  onNext: () => void
}

export default function ExplanationPanel({
  isTrue,
  statement,
  explanation,
  userWasCorrect,
  onNext,
}: ExplanationPanelProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      } ${userWasCorrect ? 'bg-[var(--color-know-soft)]' : 'bg-[var(--color-dontknow-soft)]'}`}
      style={{ borderTop: `3px solid ${userWasCorrect ? 'var(--color-know)' : 'var(--color-dontknow)'}` }}
    >
      <div className="p-6 pb-safe">
        <p className="font-semibold text-lg text-[var(--color-text-primary)]">
          {userWasCorrect ? '✓ Correct!' : '✕ Not quite'}
        </p>

        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {isTrue ? 'The statement was true.' : 'The statement was false.'}
        </p>

        <p className="text-sm text-[var(--color-text-secondary)] mt-2">{explanation}</p>

        <button
          onClick={onNext}
          className="bg-[var(--color-accent)] text-white rounded-xl py-3 w-full font-medium mt-4 hover:opacity-90 transition-opacity"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
