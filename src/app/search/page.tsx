'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon, SearchX, BookOpen, FolderOpen, Layers,
} from 'lucide-react'
import { getAllDecks } from '@/db/deckRepository'
import { getCardsByDeck } from '@/db/cardRepository'
import Fuse, { type FuseResult } from 'fuse.js'
import {
  buildSearchIndex,
  searchCards,
  buildDeckSearchIndex,
  buildFolderSearchIndex,
  type SearchableDeck,
  type SearchableFolder,
} from '@/features/search/searchIndex'
import SearchBar from '@/features/search/SearchBar'
import SearchResult from '@/features/search/SearchResult'
import TopBar from '@/components/TopBar'
import StatBadge from '@/components/StatBadge'
import type { Card } from '@/lib/zodSchemas'
import { SEARCH_MIN_CHARS, SEARCH_MAX_RESULTS } from '@/lib/constants'

type FilterCategory = 'all' | 'decks' | 'folders' | 'cards'

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FilterCategory>('all')

  const [cardResults, setCardResults] = useState<FuseResult<Card>[]>([])
  const [deckResults, setDeckResults] = useState<FuseResult<SearchableDeck>[]>([])
  const [folderResults, setFolderResults] = useState<FuseResult<SearchableFolder>[]>([])

  const [deckMap, setDeckMap] = useState<Record<string, string>>({})
  const [filterDeckId, setFilterDeckId] = useState<string>('all')

  const cardFuseRef = useRef<Fuse<Card> | null>(null)
  const deckFuseRef = useRef<Fuse<SearchableDeck> | null>(null)
  const folderFuseRef = useRef<Fuse<SearchableFolder> | null>(null)

  useEffect(() => {
    const build = async () => {
      const localDecks = await getAllDecks()
      const map: Record<string, string> = {}
      const allCards: Card[] = []
      const searchableDecks: SearchableDeck[] = []

      for (const deck of localDecks) {
        map[deck.id] = deck.title
        const cards = await getCardsByDeck(deck.id)
        allCards.push(...cards)
        searchableDecks.push({
          id: deck.id,
          title: deck.title,
          subject: deck.subject,
          cardCount: cards.length,
          isFeed: false,
        })
      }

      // Fetch public feed decks and campus folders
      try {
        const [feedRes, foldersRes] = await Promise.all([
          fetch('/api/feed'),
          fetch('/api/folders'),
        ])

        if (feedRes.ok) {
          const feedData = await feedRes.json()
          for (const d of feedData.decks ?? []) {
            if (!map[d.id]) {
              searchableDecks.push({
                id: d.id,
                title: d.title,
                subject: d.subject,
                author_name: d.author_name,
                isFeed: true,
              })
            }
          }
        }

        if (foldersRes.ok) {
          const foldersData: SearchableFolder[] = await foldersRes.json()
          folderFuseRef.current = buildFolderSearchIndex(foldersData)
        }
      } catch (err) {
        console.warn('Could not fetch feed or folders for search index:', err)
      }

      setDeckMap(map)
      cardFuseRef.current = buildSearchIndex(allCards)
      deckFuseRef.current = buildDeckSearchIndex(searchableDecks)
    }
    build()
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length >= SEARCH_MIN_CHARS) {
      if (cardFuseRef.current) {
        setCardResults(searchCards(cardFuseRef.current, trimmed).slice(0, SEARCH_MAX_RESULTS))
      }
      if (deckFuseRef.current) {
        setDeckResults(deckFuseRef.current.search(trimmed).slice(0, 15))
      }
      if (folderFuseRef.current) {
        setFolderResults(folderFuseRef.current.search(trimmed).slice(0, 10))
      }
    } else {
      setCardResults([])
      setDeckResults([])
      setFolderResults([])
    }
  }, [query])

  const filteredCardResults = filterDeckId !== 'all'
    ? cardResults.filter((r) => r.item.deckId === filterDeckId)
    : cardResults

  const totalResultsCount =
    (category === 'all' || category === 'cards' ? filteredCardResults.length : 0) +
    (category === 'all' || category === 'decks' ? deckResults.length : 0) +
    (category === 'all' || category === 'folders' ? folderResults.length : 0)

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <TopBar title="Global Search" onBack={() => router.back()} />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
        />

        {/* Search Category Tabs (All / Decks / Folders / Cards) */}
        <div className="flex gap-2 mt-4 pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCategory('all')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all squishy-btn ${
              category === 'all'
                ? 'bg-[#0052cc] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-[#0052cc] border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCategory('decks')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all squishy-btn ${
              category === 'decks'
                ? 'bg-[#0052cc] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-[#0052cc] border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={13} />
            Decks ({deckResults.length})
          </button>
          <button
            onClick={() => setCategory('folders')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all squishy-btn ${
              category === 'folders'
                ? 'bg-[#0052cc] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-[#0052cc] border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FolderOpen size={13} />
            Folders ({folderResults.length})
          </button>
          <button
            onClick={() => setCategory('cards')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all squishy-btn ${
              category === 'cards'
                ? 'bg-[#0052cc] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-[#0052cc] border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers size={13} />
            Cards ({filteredCardResults.length})
          </button>
        </div>

        {/* ─── Local Deck Filter for Cards ───────────────────────────────── */}
        {(category === 'all' || category === 'cards') && Object.keys(deckMap).length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-1 border-t border-[var(--color-border)] pt-2">
            <button
              onClick={() => setFilterDeckId('all')}
              className={`rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap squishy-btn ${
                filterDeckId === 'all'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium border border-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              All Decks
            </button>
            {Object.entries(deckMap).map(([id, title]) => (
              <button
                key={id}
                onClick={() => setFilterDeckId(id)}
                className={`rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap squishy-btn ${
                  filterDeckId === id
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium border border-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {query.length < SEARCH_MIN_CHARS ? (
            <div className="text-center py-16 glass-panel rounded-2xl border border-[var(--color-border)]">
              <SearchIcon size={44} className="mx-auto text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Search Across All College IT Content
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Type 2 or more characters to search decks, campus folders, and flashcards.
              </p>
            </div>
          ) : totalResultsCount === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl border border-[var(--color-border)]">
              <SearchX size={44} className="mx-auto text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Try checking for typos or searching across all categories.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <p className="text-xs text-[var(--color-text-muted)]">
                Found {totalResultsCount} result{totalResultsCount === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
              </p>

              {/* ─── Folders Section ─────────────────────────────────────── */}
              {(category === 'all' || category === 'folders') && folderResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                    <FolderOpen size={14} />
                    Folders ({folderResults.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {folderResults.map((r) => (
                      <div
                        key={r.item.id}
                        onClick={() => router.push(`/feed?folder=${r.item.id}`)}
                        className="glass-panel rounded-xl border border-[var(--color-border)] p-3.5 flex items-center justify-between cursor-pointer hover:border-[var(--color-accent)] transition-all cyber-glow-hover squishy-btn"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FolderOpen size={18} className="text-[var(--color-accent)] shrink-0" />
                          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {r.item.name}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] shrink-0 ml-2">
                          {r.item.deck_count ?? 0} deck{r.item.deck_count === 1 ? '' : 's'} →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Decks Section ───────────────────────────────────────── */}
              {(category === 'all' || category === 'decks') && deckResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                    <BookOpen size={14} />
                    Decks ({deckResults.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {deckResults.map((r) => (
                      <div
                        key={r.item.id}
                        onClick={() => {
                          if (r.item.isFeed) {
                            router.push(`/feed?q=${encodeURIComponent(r.item.title)}`)
                          } else {
                            router.push(`/study/${r.item.id}`)
                          }
                        }}
                        className="glass-panel rounded-xl border border-[var(--color-border)] p-3.5 flex items-center justify-between cursor-pointer hover:border-[var(--color-accent)] transition-all cyber-glow-hover squishy-btn"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                              {r.item.title}
                            </h4>
                            <StatBadge label={r.item.subject} value="" color="accent" />
                            {r.item.isFeed && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                Feed
                              </span>
                            )}
                          </div>
                          {r.item.author_name && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              by {r.item.author_name}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--color-accent)] ml-3 shrink-0">
                          {r.item.isFeed ? 'View in Feed →' : 'Study →'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Cards Section ───────────────────────────────────────── */}
              {(category === 'all' || category === 'cards') && filteredCardResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                    <Layers size={14} />
                    Cards ({filteredCardResults.length})
                  </div>
                  <div className="flex flex-col gap-3">
                    {filteredCardResults.map((r, i) => (
                      <SearchResult
                        key={r.item.id + '-' + i}
                        result={r}
                        deckTitle={deckMap[r.item.deckId] ?? 'Deck'}
                        onClick={() => router.push('/study/' + r.item.deckId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
