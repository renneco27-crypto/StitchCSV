'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search as SearchIcon, SearchX } from 'lucide-react'
import { getAllDecks } from '@/db/deckRepository'
import { getCardsByDeck } from '@/db/cardRepository'
import Fuse, { type FuseResult } from 'fuse.js'
import { buildSearchIndex, searchCards } from '@/features/search/searchIndex'
import SearchBar from '@/features/search/SearchBar'
import SearchResult from '@/features/search/SearchResult'
import TopBar from '@/components/TopBar'
import type { Card } from '@/lib/zodSchemas'
import { SEARCH_MIN_CHARS, SEARCH_MAX_RESULTS } from '@/lib/constants'

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FuseResult<Card>[]>([])
  const [deckMap, setDeckMap] = useState<Record<string, string>>({})
  const [filterDeckId, setFilterDeckId] = useState<string>('all')
  const fuseRef = useRef<Fuse<Card> | null>(null)

  useEffect(() => {
    const build = async () => {
      const decks = await getAllDecks()
      const map: Record<string, string> = {}
      const allCards: Card[] = []

      for (const deck of decks) {
        map[deck.id] = deck.title
        const cards = await getCardsByDeck(deck.id)
        allCards.push(...cards)
      }

      setDeckMap(map)
      fuseRef.current = buildSearchIndex(allCards)
    }
    build()
  }, [])

  useEffect(() => {
    if (!fuseRef.current) return
    if (query.length >= SEARCH_MIN_CHARS) {
      setResults(searchCards(fuseRef.current, query).slice(0, SEARCH_MAX_RESULTS))
    } else {
      setResults([])
    }
  }, [query])

  const filteredResults = filterDeckId !== 'all'
    ? results.filter((r) => r.item.deckId === filterDeckId)
    : results

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopBar title="Search" onBack={() => router.back()} />

      <div className="px-4 py-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
        />

        {Object.keys(deckMap).length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
            <button
              onClick={() => setFilterDeckId('all')}
              className={`rounded-full px-3 py-1 text-sm whitespace-nowrap ${
                filterDeckId === 'all'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] cursor-pointer'
              }`}
            >
              All decks
            </button>
            {Object.entries(deckMap).map(([id, title]) => (
              <button
                key={id}
                onClick={() => setFilterDeckId(id)}
                className={`rounded-full px-3 py-1 text-sm whitespace-nowrap ${
                  filterDeckId === id
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] cursor-pointer'
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {query.length < SEARCH_MIN_CHARS ? (
            <div className="text-center py-12">
              <SearchIcon size={48} className="mx-auto text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                Type to search across all your notes
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <SearchX size={48} className="mx-auto text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                No results for &lsquo;{query}&rsquo;
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                {filteredResults.length} results for &lsquo;{query}&rsquo;
              </p>
              <div className="flex flex-col gap-3">
                {filteredResults.map((r, i) => (
                  <SearchResult
                    key={r.item.id + '-' + i}
                    result={r}
                    deckTitle={deckMap[r.item.deckId] ?? ''}
                    onClick={() => router.push('/study/' + r.item.deckId)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
