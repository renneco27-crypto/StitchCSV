'use client'

import StatBadge from '@/components/StatBadge'
import type { DeckStats } from '@/lib/zodSchemas'

interface SubjectStatsCardProps {
  stats: DeckStats
  deckTitle: string
  masteredCount: number
  learningCount: number
  newCount: number
}

export default function SubjectStatsCard({
  stats,
  deckTitle,
  masteredCount,
  learningCount,
  newCount,
}: SubjectStatsCardProps) {
  const total = stats.totalCards

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{deckTitle}</h2>
        <StatBadge label="" value="" color="accent" />
      </div>

      <div className="flex gap-6 text-sm mt-3">
        <span className="text-[var(--color-text-muted)]">Flashcards: {total}</span>
        <span className="text-[var(--color-know)]">Correct: {stats.correct}</span>
        <span className="text-[var(--color-dontknow)]">Wrong: {stats.wrong}</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-[var(--color-border)] mt-4 flex">
        {total > 0 && (
          <>
            <div
              className="h-full bg-[var(--color-know)] transition-all"
              style={{ width: `${(masteredCount / total) * 100}%` }}
            />
            <div
              className="h-full bg-[var(--color-mastered)] transition-all"
              style={{ width: `${(learningCount / total) * 100}%` }}
            />
          </>
        )}
      </div>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="text-[var(--color-know)]">■ Mastered {masteredCount}</span>
        <span className="text-[var(--color-mastered)]">■ Learning {learningCount}</span>
        <span className="text-[var(--color-new)]">■ New {newCount}</span>
      </div>

      <hr className="my-4 border-[var(--color-border)]" />

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-['DM_Serif_Display'] text-[var(--color-text-primary)]">
          {stats.accuracy}
        </span>
        <span className="text-sm text-[var(--color-text-muted)]">% accuracy</span>
      </div>

      <div className="mt-2 flex gap-4 text-sm text-[var(--color-text-muted)]">
        {stats.lastStudied && (
          <span>Last studied: {new Date(stats.lastStudied).toLocaleDateString()}</span>
        )}
        <span>🔥 {stats.studyStreak} day streak</span>
      </div>

      <div className="flex gap-4 text-xs text-[var(--color-text-muted)] mt-2">
        <span>MC: {stats.mcScore}%</span>
        <span>ID correct: {stats.identificationCorrect}</span>
        <span>Enum: {stats.enumerationCompleted}</span>
      </div>
    </div>
  )
}
