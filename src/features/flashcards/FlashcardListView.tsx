'use client'

import { useState } from 'react'
import { Search, Eye, EyeOff } from 'lucide-react'
import type { Card } from '@/lib/zodSchemas'

interface FlashcardListViewProps {
  cards: Card[]
}

export default function FlashcardListView({ cards }: FlashcardListViewProps) {
  const [search, setSearch] = useState('')
  const [hideAnswers, setHideAnswers] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  const toggleAnswer = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = cards.filter(c =>
    !search ||
    c.front.toLowerCase().includes(search.toLowerCase()) ||
    c.back.toLowerCase().includes(search.toLowerCase()) ||
    c.chapter.toLowerCase().includes(search.toLowerCase())
  )

  // Group by chapter
  const grouped = filtered.reduce<Record<string, Card[]>>((acc, card) => {
    const ch = card.chapter || 'General'
    if (!acc[ch]) acc[ch] = []
    acc[ch].push(card)
    return acc
  }, {})

  const chapters = Object.keys(grouped)

  return (
    <div className="flex-1 overflow-auto flex flex-col w-full">
      {/* Search & Answer Toggle Controls */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cards, questions, answers…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          <button
            onClick={() => {
              setHideAnswers(!hideAnswers)
              setRevealedIds(new Set())
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors shrink-0 ${
              hideAnswers
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-2)]'
            }`}
            title="Toggle hide answers to test your recall"
          >
            {hideAnswers ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{hideAnswers ? 'Answers Hidden' : 'Hide Answers'}</span>
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-auto px-4 pb-12 pt-4 max-w-2xl mx-auto w-full">
        {chapters.map(chapter => (
          <div key={chapter} className="mb-6">
            {chapters.length > 1 && (
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3 px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                {chapter}
              </h3>
            )}
            <div className="flex flex-col gap-3">
              {grouped[chapter].map((card, i) => {
                const isHidden = hideAnswers && !revealedIds.has(card.id)

                return (
                  <div
                    key={card.id}
                    className="glass-panel rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm hover:border-[var(--color-border-neon)] transition-all"
                  >
                    {/* Question / front */}
                    <div className="p-4 bg-[var(--color-surface)]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                          #{i + 1} • {card.type}
                        </span>
                        {card.lesson && (
                          <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[150px]">
                            {card.lesson}
                          </span>
                        )}
                      </div>
                      <p className="font-['Playfair_Display'] text-base sm:text-lg text-[var(--color-text-primary)] leading-snug">
                        {card.front}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[var(--color-border)]" />

                    {/* Answer / back */}
                    <div
                      onClick={() => isHidden && toggleAnswer(card.id)}
                      className={`p-4 bg-[var(--color-surface-2)] transition-colors ${
                        isHidden ? 'cursor-pointer hover:bg-[var(--color-surface-3)]' : ''
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-wider text-[var(--color-know)] mb-1 font-semibold flex items-center justify-between">
                        <span>Answer</span>
                        {isHidden && (
                          <span className="text-xs text-[var(--color-accent)] font-normal">
                            Click to reveal
                          </span>
                        )}
                      </p>

                      {isHidden ? (
                        <p className="text-sm text-transparent select-none blur-[6px]">
                          {card.back}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line font-medium">
                          {card.back}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--color-text-muted)] text-sm">
            No cards found matching "{search}"
          </div>
        )}
      </div>
    </div>
  )
}
