interface QuizProgressBarProps {
  current: number
  total: number
  correct: number
  wrong: number
}

export default function QuizProgressBar({
  current,
  total,
  correct,
  wrong,
}: QuizProgressBarProps) {
  const percent = total > 0 ? (current / total) * 100 : 0
  const accuracy = correct + wrong === 0 ? 0 : Math.round((correct / (correct + wrong)) * 100)

  return (
    <div>
      <div className="w-full bg-[var(--color-border)] h-1">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--color-text-muted)] px-4 py-1">
        <span>Question {current} of {total}</span>
        <span>
          <span className="text-[var(--color-know)]">✓ {correct}</span>
          <span className="mx-1">·</span>
          <span className="text-[var(--color-dontknow)]">✕ {wrong}</span>
        </span>
        <span>{accuracy}%</span>
      </div>
    </div>
  )
}
