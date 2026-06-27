'use client'

import { useRouter } from 'next/navigation'

interface QuizSummaryProps {
  correct: number
  wrong: number
  total: number
  mode: string
  deckId: string
  onRetry: () => void
}

export default function QuizSummary({
  correct,
  wrong,
  total,
  mode,
  deckId,
  onRetry,
}: QuizSummaryProps) {
  const router = useRouter()
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100)

  const message =
    accuracy >= 90
      ? { text: 'Excellent work! 🎉', color: 'var(--color-know)' }
      : accuracy >= 70
        ? { text: 'Good work! Keep it up.', color: 'var(--color-mastered)' }
        : { text: "Keep practicing — you've got this.", color: 'var(--color-text-secondary)' }

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 max-w-sm mx-auto text-center">
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{mode}</p>

      <p
        className="text-5xl font-['DM_Serif_Display'] text-[var(--color-text-primary)] mt-2"
      >
        {accuracy}%
      </p>
      <p className="text-sm text-[var(--color-text-muted)] mt-2">
        {correct} correct out of {total}
      </p>

      <div className="h-3 rounded-full overflow-hidden bg-[var(--color-border)] mt-4 flex">
        <div
          className="h-full bg-[var(--color-know)] transition-all"
          style={{ width: `${(correct / total) * 100}%` }}
        />
        <div
          className="h-full bg-[var(--color-dontknow)] transition-all"
          style={{ width: `${(wrong / total) * 100}%` }}
        />
      </div>

      <p className="mt-4 text-sm font-medium" style={{ color: message.color }}>
        {message.text}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={onRetry}
          className="bg-[var(--color-accent)] text-white rounded-xl py-3 font-medium w-full hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <button
          onClick={() => router.push('/study/' + deckId)}
          className="text-[var(--color-text-secondary)] text-sm hover:underline py-2"
        >
          Back to deck
        </button>
      </div>
    </div>
  )
}
