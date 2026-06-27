'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDeck } from '@/db/deckRepository'
import { useStudyStats } from '@/hooks/useStudyStats'
import TopBar from '@/components/TopBar'
import SubjectStatsCard from '@/features/stats/SubjectStatsCard'
import CardMasteryList from '@/features/stats/CardMasteryList'
import ExportButton from '@/features/export/ExportButton'
import type { Deck } from '@/lib/zodSchemas'

export default function StatsPage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.deckId as string

  const { stats, cards, masteredCount, learningCount, newCount } = useStudyStats(deckId)
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeck(deckId).then((d) => {
      setDeck(d ?? null)
      setLoading(false)
    })
  }, [deckId])

  const dailyCounts = stats?.dailyCounts ?? {}
  const today = new Date()

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const count = dailyCounts[key] ?? 0
    const dayName = d.toLocaleDateString('en', { weekday: 'short' })
    return { key, count, dayName }
  }).reverse()

  const maxCount = Math.max(...last7Days.map((d) => d.count), 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="h-14 bg-[var(--color-surface)] border-b animate-pulse" />
        <div className="p-4 space-y-4 animate-pulse">
          <div className="h-48 bg-[var(--color-surface-2)] rounded-2xl" />
          <div className="h-32 bg-[var(--color-surface-2)] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!deck || !stats) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Stats not available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopBar
        title="Progress"
        onBack={() => router.push('/study/' + deckId)}
        rightSlot={<ExportButton deckId={deckId} deckTitle={deck?.title ?? ''} variant="icon" />}
      />

      <div className="px-4 py-4 flex flex-col gap-6">
        <SubjectStatsCard
          stats={stats}
          deckTitle={deck.title}
          masteredCount={masteredCount}
          learningCount={learningCount}
          newCount={newCount}
        />

        <CardMasteryList cards={cards} deckId={deckId} />

        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Study history</p>
          <div className="flex items-end gap-1 h-20">
            {last7Days.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-end h-full justify-end">
                <div
                  className="w-full rounded-t bg-[var(--color-accent)] transition-all"
                  style={{
                    height: `${Math.max((d.count / maxCount) * 80, 4)}px`,
                    opacity: 0.7,
                  }}
                />
                <span className="text-[10px] text-[var(--color-text-muted)] mt-1">{d.dayName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
