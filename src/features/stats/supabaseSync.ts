import { createBrowserSupabase } from '@/lib/supabase'
import { getStreakStatus } from './statsCalculator'
import type { DeckStats } from '@/lib/zodSchemas'

export async function syncStatsToSupabase(stats: Record<string, DeckStats>) {
  const supabase = createBrowserSupabase()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return // User not logged in, only track locally

  const deckStats = Object.values(stats).filter((s) => s && s.lastStudied)
  const studiedToday = deckStats.filter(
    (s) => getStreakStatus(s.lastStudied) === 'today'
  ).length
  const totalStreak = deckStats.reduce(
    (max, s) => Math.max(max, s.studyStreak ?? 0),
    0
  )

  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  try {
    const { error } = await supabase
      .from('user_stats')
      .upsert({ 
        user_id: userId,
        total_streak: totalStreak,
        studied_today: studiedToday,
        last_studied: today
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error syncing stats to Supabase:', error)
    }
  } catch (err) {
    console.error('Error in syncStatsToSupabase:', err)
  }
}

export async function fetchStatsFromSupabase() {
  const supabase = createBrowserSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error) {
       if (error.code !== 'PGRST116') { // PGRST116 means no rows found
           console.error('Error fetching stats from Supabase:', error)
       }
       return null
    }
    return data
  } catch (err) {
    console.error('Error in fetchStatsFromSupabase:', err)
    return null
  }
}
