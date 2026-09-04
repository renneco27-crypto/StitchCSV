'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { BookOpen, Trash2, Star } from 'lucide-react'
import { getAllDecks, deleteDeck } from '@/db/deckRepository'
import { getCardsByDeck } from '@/db/cardRepository'
import StatBadge from '@/components/StatBadge'
import ExportButton from '@/features/export/ExportButton'
import { useStatsStore } from '@/store/statsStore'
import type { Deck } from '@/lib/zodSchemas'

export default function PastDecks() {
  const router = useRouter()
  const pathname = usePathname()
  const [decks, setDecks] = useState<Deck[]>(() => [])
  const stats = useStatsStore((s) => s.stats)

  useEffect(() => {
    getAllDecks().then(setDecks)
  }, [pathname])

  const handleDelete = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation()
    if (window.confirm('Delete this deck?')) {
      await deleteDeck(deckId)
      const allDecks = await getAllDecks()
      setDecks(allDecks)
    }
  }

  const [cardData, setCardData] = useState<Record<string, { total: number; mastered: number }>>({})

  useEffect(() => {
    const fetchCounts = async () => {
      const data: Record<string, { total: number; mastered: number }> = {}
      for (const deck of decks) {
        const cards = await getCardsByDeck(deck.id)
        data[deck.id] = {
          total: cards.length,
          mastered: cards.filter((c) => c.status === 'mastered').length,
        }
      }
      setCardData(data)
    }
    if (decks.length > 0) fetchCounts()
  }, [decks])

  if (decks.length === 0) {
    return (
      <div className="text-center py-16 glass-card rounded-3xl p-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-[#003bb3] flex items-center justify-center mx-auto mb-4 border border-blue-300 shadow-sm">
          <BookOpen size={32} />
        </div>
        <h4 className="text-base font-black text-slate-950">No decks yet</h4>
        <p className="text-xs text-slate-700 mt-1 max-w-sm mx-auto font-bold">
          Upload your lecture notes, documents, or CSV to start active recall practice
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {decks.map((deck) => {
        const deckStats = stats[deck.id]
        const cd = cardData[deck.id]
        const totalCards = cd?.total ?? 0
        const masteredCount = cd?.mastered ?? 0
        const progress = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0

        return (
          <div
            key={deck.id}
            onClick={() => router.push('/study/' + deck.id)}
            className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:border-[#0052cc] glass-card-hover transition-all group"
          >
            {/* Color Accent Indicator Strip */}
            <div className="w-1.5 bg-[#0052cc] h-12 rounded-full hidden sm:block shrink-0 shadow-sm" />
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-black text-slate-950 group-hover:text-[#0052cc] transition-colors break-words">
                  {deck.title}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100/90 text-[#003bb3] border border-blue-300 shadow-xs">
                  {deck.subject || 'General'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-bold text-slate-700">
                <span className="text-slate-900">{totalCards} cards</span>
                {deckStats?.lastStudied && (
                  <span className="text-slate-600">
                    Last studied: {new Date(deckStats.lastStudied).toLocaleDateString()}
                  </span>
                )}
                {masteredCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-black text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                    <Star size={12} className="fill-amber-500 text-amber-600" />
                    {masteredCount} mastered
                  </span>
                )}
              </div>

              {totalCards > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-slate-200/90 border border-slate-300/60 overflow-hidden max-w-[240px]">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-[#0052cc] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <div onClick={(e) => e.stopPropagation()}>
                  <ExportButton deckId={deck.id} deckTitle={deck.title} variant="icon" />
                </div>
                <button
                  onClick={(e) => handleDelete(e, deck.id)}
                  className="text-slate-600 hover:text-red-700 hover:bg-red-100/80 transition-colors p-2 rounded-xl"
                  aria-label="Delete deck"
                  title="Delete deck"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <button className="flex items-center gap-1.5 text-xs font-black text-white bg-[#0052cc] hover:bg-[#003bb3] px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer">
                Study →
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
