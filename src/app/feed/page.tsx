'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Download, BookOpen, ArrowLeft } from 'lucide-react'
import { parseCSVFile } from '@/features/upload/csvParser'
import { createDeck, getAllDecks } from '@/db/deckRepository'
import { createCards } from '@/db/cardRepository'
import { useToastStore } from '@/store/toastStore'

interface FeedDeck {
  id: string
  title: string
  subject: string
  author_name: string
  published_at: string
  download_count: number
}

export default function FeedPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const [decks, setDecks] = useState<FeedDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch('/api/feed')
        if (!res.ok) throw new Error('Failed to load feed')
        const data = await res.json()
        setDecks(data)

        const localDecks = await getAllDecks()
        const localTitles = new Set(localDecks.map((d) => d.title))
        const preAdded = new Set<string>(
          data.filter((d: FeedDeck) => localTitles.has(d.title)).map((d: FeedDeck) => d.id)
        )
        setAddedIds(preAdded)
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Failed to load feed', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchFeed()
  }, [addToast])

  const handleAddToApp = async (feedDeck: FeedDeck) => {
    setAddingId(feedDeck.id)
    try {
      const res = await fetch(`/api/feed/${feedDeck.id}`)
      if (!res.ok) throw new Error('Deck not found')
      const data = await res.json()

      const parsed = parseCSVFile(data.csv_content, data.title)

      const deckId = await createDeck(parsed.deck)
      const cardsWithDeckId = parsed.cards.map((c) => ({ ...c, deckId }))
      await createCards(cardsWithDeckId)

      setAddedIds((prev) => new Set(prev).add(feedDeck.id))
      addToast('Deck added to your app!', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add deck', 'error')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ArrowLeft size={20} className="text-[var(--color-text-secondary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Public Feed</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Community-shared decks</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
            <p className="text-sm text-[var(--color-text-muted)] mt-3">Loading feed…</p>
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} className="mx-auto text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-muted)] mt-4">No decks published yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-[var(--color-text-primary)] truncate">
                      {deck.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
                        {deck.subject}
                      </span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        by {deck.author_name}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(deck.published_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {deck.download_count} downloads
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToApp(deck)}
                    disabled={addingId === deck.id || addedIds.has(deck.id)}
                    className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm shrink-0"
                  >
                    {addingId === deck.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {addedIds.has(deck.id) ? 'Added' : 'Add to My App'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
