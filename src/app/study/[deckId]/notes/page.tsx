'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Eye, EyeOff, Search, ChevronDown, ChevronUp, Layers, Tag } from 'lucide-react'
import { getCardsByDeck } from '@/db/cardRepository'
import { getDeck } from '@/db/deckRepository'
import TopBar from '@/components/TopBar'
import type { Card, Deck } from '@/lib/zodSchemas'

function FormattedNoteText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  if (lines.length <= 1 && !text.includes('•') && !text.includes('|') && !text.includes(';')) {
    return <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{text}</p>
  }

  // Split multiple lines or bullet points
  const items: string[] = []
  for (const line of lines) {
    if (line.includes('•')) {
      const parts = line.split('•').map(p => p.trim()).filter(Boolean)
      items.push(...parts)
    } else {
      items.push(line)
    }
  }

  return (
    <div className="space-y-1.5 pt-1">
      {items.map((item, idx) => {
        // Check for key-value pair like "Born: Feb 8, 1890 | Died: Oct 2, 1960"
        const segments = item.split('|').map(s => s.trim()).filter(Boolean)

        return (
          <div key={idx} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="text-[var(--color-accent)] mt-1 select-none">•</span>
            <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1">
              {segments.map((seg, sIdx) => {
                const colonIdx = seg.indexOf(':')
                const dashIdx = seg.indexOf(' – ') !== -1 ? seg.indexOf(' – ') : seg.indexOf(' - ')

                if (colonIdx > 0 && colonIdx < 30) {
                  const label = seg.slice(0, colonIdx).trim()
                  const value = seg.slice(colonIdx + 1).trim()
                  return (
                    <span key={sIdx} className="inline-flex items-baseline gap-1">
                      <span className="font-medium text-[var(--color-text-primary)]">{label}:</span>
                      <span>{value}</span>
                    </span>
                  )
                } else if (dashIdx > 0) {
                  const label = seg.slice(0, dashIdx).trim()
                  const value = seg.slice(dashIdx + 3).trim()
                  return (
                    <span key={sIdx} className="inline-flex items-baseline gap-1">
                      <span className="font-medium text-[var(--color-text-primary)]">{label} –</span>
                      <span>{value}</span>
                    </span>
                  )
                }

                return <span key={sIdx}>{seg}</span>
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NotesContent({ deckId }: { deckId: string }) {
  const router = useRouter()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [keywords, setKeywords] = useState<Card[]>([])
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [revealAll, setRevealAll] = useState(true)
  const [hideKeywords, setHideKeywords] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [d, allCards] = await Promise.all([getDeck(deckId), getCardsByDeck(deckId)])
      setDeck(d ?? null)
      // Look for keyword cards, fallback to definition cards if no keyword cards exist
      const kw = allCards.filter(c => c.type === 'keyword')
      const targetCards = kw.length > 0 ? kw : allCards.filter(c => c.type === 'definition' || c.type === 'concept')
      setKeywords(targetCards)
      setRevealed(new Set(targetCards.map(c => c.id)))
      setLoading(false)
    }
    load()
  }, [deckId])

  const toggleReveal = (id: string) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleNotes = () => {
    if (revealAll) {
      setRevealed(new Set())
      setRevealAll(false)
    } else {
      setRevealed(new Set(keywords.map(k => k.id)))
      setRevealAll(true)
    }
  }

  const filtered = keywords.filter(k =>
    !search ||
    k.front.toLowerCase().includes(search.toLowerCase()) ||
    k.back.toLowerCase().includes(search.toLowerCase()) ||
    k.chapter.toLowerCase().includes(search.toLowerCase())
  )

  // Group by chapter
  const grouped = filtered.reduce<Record<string, Card[]>>((acc, card) => {
    const chapter = card.chapter || 'General'
    if (!acc[chapter]) acc[chapter] = []
    acc[chapter].push(card)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading notes…</div>
      </div>
    )
  }

  if (keywords.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
        <TopBar title="Notes" onBack={() => router.push(`/study/${deckId}`)} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <BookOpen size={48} className="text-[var(--color-text-muted)] mb-4 opacity-40" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No notes found in this deck</h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
            Add rows with <code className="bg-[var(--color-surface-2)] px-1 rounded text-xs">type = keyword</code> or definition cards to see them organized as notes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <TopBar
        title={deck?.title ?? 'Notes'}
        onBack={() => router.push(`/study/${deckId}`)}
        rightSlot={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setHideKeywords(!hideKeywords)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                hideKeywords
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-2)]'
              }`}
              title="Hide keywords to test yourself"
            >
              <Tag size={13} />
              <span className="hidden xs:inline">{hideKeywords ? 'Keywords Hidden' : 'Hide Keywords'}</span>
            </button>
            <button
              onClick={handleToggleNotes}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] rounded-lg transition-colors"
              title={revealAll ? 'Collapse all notes' : 'Expand all notes'}
            >
              {revealAll ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="hidden sm:inline">{revealAll ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        }
      />

      {/* Search bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative max-w-2xl mx-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search keywords, dates, topics, or definitions…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </div>

      {/* Notes grouped by chapter */}
      <div className="flex-1 overflow-auto px-4 pb-8 pt-2 max-w-2xl mx-auto w-full">
        {Object.entries(grouped).map(([chapter, cards]) => (
          <div key={chapter} className="mb-6">
            {Object.keys(grouped).length > 1 && (
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3 px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                {chapter}
              </h3>
            )}
            <div className="flex flex-col gap-3">
              {cards.map(card => {
                const isRevealed = revealed.has(card.id)
                return (
                  <div
                    key={card.id}
                    className="glass-panel rounded-2xl border border-[var(--color-border)] p-4 transition-all duration-200 shadow-sm"
                  >
                    <div
                      onClick={() => toggleReveal(card.id)}
                      className="flex items-start justify-between gap-3 cursor-pointer select-none group"
                    >
                      <div className="flex-1">
                        {hideKeywords ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              // click blurred keyword directly to reveal that specific one
                            }}
                            className="inline-block px-2 py-0.5 rounded bg-[var(--color-surface-3)] text-transparent select-none blur-[5px] hover:blur-none hover:text-[var(--color-text-primary)] transition-all cursor-pointer text-sm font-semibold"
                            title="Hover or click to reveal keyword"
                          >
                            {card.front}
                          </span>
                        ) : (
                          <h4 className="font-['Playfair_Display'] font-semibold text-[var(--color-text-primary)] text-base tracking-wide leading-snug">
                            {card.front}
                          </h4>
                        )}
                      </div>
                      <span className="shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors mt-0.5">
                        {isRevealed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>

                    {isRevealed && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                        <FormattedNoteText text={card.back} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
            No notes matching "{search}"
          </div>
        )}
      </div>
    </div>
  )
}

export default function NotesPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params)
  return <NotesContent deckId={deckId} />
}
