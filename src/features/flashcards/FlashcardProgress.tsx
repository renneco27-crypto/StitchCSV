interface FlashcardProgressProps {
  cardIndex: number
  batchSize: number
  batchIndex: number
  totalBatches: number
}

export default function FlashcardProgress({
  cardIndex,
  batchSize,
  batchIndex,
  totalBatches,
}: FlashcardProgressProps) {
  const percent = batchSize > 0 ? ((cardIndex + 1) / batchSize) * 100 : 0

  return (
    <div>
      <div className="w-full bg-[var(--color-border)] h-1">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)] text-center py-1">
        Batch {batchIndex + 1} of {totalBatches} · Card {cardIndex + 1} of {batchSize}
      </p>
    </div>
  )
}
