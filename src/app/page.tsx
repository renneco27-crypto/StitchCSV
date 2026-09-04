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
    <div className="min-h-screen pb-16">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Sleek Frosted Glassmorphism Header */}
        <header className="glass-card rounded-3xl p-6 sm:p-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle Glow Spheres */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100/80 border border-blue-200/70 text-[#003bb3] text-xs font-black uppercase tracking-wider mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#0052cc] animate-pulse" />
              Campus IT Knowledge Base
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              StudyUp Dashboard
            </h1>
            <p className="text-sm font-semibold text-slate-700 mt-1">
              Active recall momentum &amp; flashcard review deck library
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/80 border border-slate-300/80 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-900 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Active Session
              </span>
            </div>
          </div>
        </header>

        {/* High-Contrast Frosted Glass Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Metric 1: Streak (Yellow/Gold Accent) */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between glass-card-hover transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shadow-sm">
                <Flame size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Study Streak
                </p>
                <h3 className="text-2xl font-black text-slate-950 mt-0.5">
                  {totalStreak} <span className="text-xs font-bold text-slate-700">day{totalStreak === 1 ? '' : 's'}</span>
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
              Active
            </span>
          </div>

          {/* Metric 2: Today's Reviews (Royal Blue Accent) */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between glass-card-hover transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#003bb3] border border-blue-300 flex items-center justify-center shadow-sm">
                <BookOpen size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Studied Today
                </p>
                <h3 className="text-2xl font-black text-slate-950 mt-0.5">
                  {studiedToday} <span className="text-xs font-bold text-slate-700">deck{studiedToday === 1 ? '' : 's'}</span>
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-[#003bb3] border border-blue-300">
              Today
            </span>
          </div>

          {/* Metric 3: Target Goal (Clean Slate/Emerald Accent) */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between glass-card-hover transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shadow-sm">
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Daily Goal
                </p>
                <h3 className="text-2xl font-black text-slate-950 mt-0.5">
                  {studiedToday > 0 ? '100%' : 'Pending'}
                </h3>
              </div>
            </div>
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${
              studiedToday > 0
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-slate-200/80 text-slate-800 border-slate-300'
            }`}>
              {studiedToday > 0 ? 'Achieved' : '1 Deck Target'}
            </span>
          </div>
        </div>

        {/* Decks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Your Decks</h2>
              <p className="text-xs font-bold text-slate-700">Choose a deck to review flashcards, quiz questions, or study notes</p>
            </div>
          </div>
          <PastDecks />
        </section>
      </div>
    </div>
  )
}