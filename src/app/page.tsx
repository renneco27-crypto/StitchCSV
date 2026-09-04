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
    <div className="min-h-screen bg-[#f4f7fb] pb-16">
      <div className="w-full max-w-5xl mx-auto px-4 pt-4 sm:pt-6">
        {/* T4CBS Signature Hero Header */}
        <header
          id="t4cbs-header"
          className="relative rounded-3xl bg-gradient-to-b from-[#0052cc] to-[#0047b3] pt-8 pb-16 px-6 sm:px-10 text-center overflow-hidden shrink-0 shadow-lg"
        >
          {/* Top Left Rotated Diamond Accent */}
          <div
            id="decor-diamond"
            aria-hidden="true"
            className="absolute -top-10 -left-10 w-36 h-36 bg-white/10 rounded-2xl rotate-45 pointer-events-none"
          />

          {/* Top Right Dark Glow Circle Accent */}
          <div
            id="decor-circle"
            aria-hidden="true"
            className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#002f80]/50 pointer-events-none"
          />

          <h1 id="brand-title" className="relative z-10 text-white font-bold text-2xl sm:text-3xl leading-tight tracking-tight">
            StudyUp
          </h1>
          <h2 id="brand-subtitle" className="relative z-10 text-white/90 font-medium text-base sm:text-lg leading-tight tracking-tight mt-1">
            Personal Study &amp; Active Recall Deck Library
          </h2>
          <p id="brand-tag" className="relative z-10 text-white/80 font-semibold text-xs mt-1 tracking-wider uppercase">
            Campus IT Edition
          </p>
        </header>

        {/* Floating Stat Cards Overlapping Hero */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 -mt-8 px-2 relative z-20 mb-8">
          {/* Streak Stat Card - Yellow/Amber Highlight */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-2xl shrink-0 border border-amber-200/60 shadow-inner">
              {totalStreak}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  Study Streak
                </p>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {studiedToday > 0
                  ? `Reviewed ${studiedToday} deck${studiedToday === 1 ? '' : 's'} today`
                  : 'Review a deck today to preserve your streak'}
              </p>
            </div>
          </div>

          {/* Today's Reviews - Royal Blue Highlight */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center font-bold text-2xl shrink-0 border border-blue-200/60 shadow-inner">
              {studiedToday}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  Studied Today
                </p>
                <span className="bg-blue-100 text-[#0052cc] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Progress
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Decks reviewed so far today
              </p>
            </div>
          </div>
        </div>

        {/* Decks Section */}
        <section className="px-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Your Decks</h3>
              <p className="text-xs text-slate-500">Select a deck to begin flashcard, quiz, or notes recall</p>
            </div>
          </div>
          <PastDecks />
        </section>
      </div>
    </div>
  )
}