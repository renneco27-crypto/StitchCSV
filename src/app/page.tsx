'use client'

import { useEffect, useState } from 'react'
import { Flame, BookOpen, CheckCircle2, Award } from 'lucide-react'
import { useStatsStore } from '@/store/statsStore'
import PastDecks from '@/features/upload/PastDecks'
import { getStreakStatus } from '@/features/stats/statsCalculator'
import { fetchStatsFromSupabase, syncStatsToSupabase } from '@/features/stats/supabaseSync'

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
    <div className="min-h-screen bg-[#eaeff5] pb-16">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Sleek High-Contrast Dashboard Greeting Header */}
        <header className="bg-white rounded-3xl border border-slate-300/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] p-6 sm:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle Background Accent Gradient */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl pointer-events-none opacity-60" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#0047b3] text-xs font-extrabold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#0052cc] animate-pulse" />
              Campus IT Knowledge Base
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              StudyUp Dashboard
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-1">
              Active recall momentum &amp; flashcard review deck library
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Active Session
              </span>
            </div>
          </div>
        </header>

        {/* High-Contrast Compact Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Metric 1: Streak (Yellow/Gold Accent) */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.04)] p-5 flex items-center justify-between hover:border-slate-400 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center shadow-sm">
                <Flame size={24} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Study Streak
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {totalStreak} <span className="text-xs font-semibold text-slate-600">day{totalStreak === 1 ? '' : 's'}</span>
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
              Active
            </span>
          </div>

          {/* Metric 2: Today's Reviews (Royal Blue Accent) */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.04)] p-5 flex items-center justify-between hover:border-slate-400 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0052cc] border border-blue-300 flex items-center justify-center shadow-sm">
                <BookOpen size={24} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Studied Today
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {studiedToday} <span className="text-xs font-semibold text-slate-600">deck{studiedToday === 1 ? '' : 's'}</span>
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#0047b3] border border-blue-300/60">
              Today
            </span>
          </div>

          {/* Metric 3: Target Goal (Clean Slate/Emerald Accent) */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.04)] p-5 flex items-center justify-between hover:border-slate-400 transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shadow-sm">
                <CheckCircle2 size={24} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Daily Goal
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {studiedToday > 0 ? '100%' : 'Pending'}
                </h3>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              studiedToday > 0
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300/60'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {studiedToday > 0 ? 'Achieved' : '1 Deck Target'}
            </span>
          </div>
        </div>

        {/* Decks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Your Decks</h2>
              <p className="text-xs font-medium text-slate-600">Choose a deck to review flashcards, quiz questions, or study notes</p>
            </div>
          </div>
          <PastDecks />
        </section>
      </div>
    </div>
  )
}