'use client'

import { useEffect, useState } from 'react'
import { useStatsStore } from '@/store/statsStore'
import PastDecks from '@/features/upload/PastDecks'
import { getStreakStatus } from '@/features/stats/statsCalculator'
import { fetchStatsFromSupabase, syncStatsToSupabase } from '@/features/stats/supabaseSync'
import MatrixRainBackground from '@/components/MatrixRainBackground'

export default function Home() {
  const stats = useStatsStore((s) => s.stats)
  const [dbTotalStreak, setDbTotalStreak] = useState<number | null>(null)
  const [dbStudiedToday, setDbStudiedToday] = useState<number | null>(null)

  // Local calculation
  const deckStats = Object.values(stats).filter((s) => s && s.lastStudied)
  const localStudiedToday = deckStats.filter(
    (s) => getStreakStatus(s.lastStudied) === 'today'
  ).length
  const localTotalStreak = deckStats.reduce(
    (max, s) => Math.max(max, s.studyStreak ?? 0),
    0
  )

  useEffect(() => {
    // Sync local stats to supabase, then fetch the latest
    syncStatsToSupabase(stats).then(async () => {
      const dbStats = await fetchStatsFromSupabase()
      if (dbStats) {
        setDbTotalStreak(dbStats.total_streak)
        setDbStudiedToday(dbStats.studied_today)
      }
    })
  }, [stats])

  const totalStreak = dbTotalStreak !== null ? Math.max(dbTotalStreak, localTotalStreak) : localTotalStreak
  const studiedToday = dbStudiedToday !== null ? Math.max(dbStudiedToday, localStudiedToday) : localStudiedToday

  return (
    <div className="min-h-screen relative px-4 py-8">
      {/* Background Matrix Rain */}
      <MatrixRainBackground opacity={0.25} />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-6">
          <h1 className="text-2xl font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
            My Library
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Your decks &amp; study streaks
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="glass-panel rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-4 cyber-glow-hover">
            <div className="text-3xl font-bold text-[var(--color-accent)] font-['Playfair_Display']">
              {totalStreak}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Day streak
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {studiedToday > 0
                  ? `Studied ${studiedToday} deck${studiedToday === 1 ? '' : 's'} today`
                  : 'Study today to keep it alive'}
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-4 cyber-glow-hover">
            <div className="text-3xl font-bold text-[var(--color-know)] font-['Playfair_Display']">
              {studiedToday}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Studied today
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Decks reviewed so far today
              </p>
            </div>
          </div>
        </div>

        <PastDecks />
      </div>
    </div>
  )
}