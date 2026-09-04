'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Download, BookOpen, ArrowLeft,
  Folder, FolderOpen, Plus, X, ChevronDown, Trash2,
  Search as SearchIcon, SearchX,
} from 'lucide-react'
import { parseCSVFile } from '@/features/upload/csvParser'
import { auditAndFixCSV } from '@/features/upload/csvFixer'
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

interface Folder {
  id: string
  name: string
  created_by: string
  created_at: string
  deck_count: number
}

export default function FeedPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const [decks, setDecks] = useState<FeedDeck[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addedDeckIds, setAddedDeckIds] = useState<Record<string, string>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const [categorizingId, setCategorizingId] = useState<string | null>(null)
  const [folderDecks, setFolderDecks] = useState<FeedDeck[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current')

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/feed')
      if (!res.ok) throw new Error('Failed to load feed')
      const data = await res.json()
      setDecks(data.decks ?? [])

      const localDecks = await getAllDecks()
      const localByTitle = new Map(localDecks.map((d) => [d.title, d.id]))
      const preAdded = new Set<string>()
      const preAddedDeckIds: Record<string, string> = {}
      for (const d of data.decks ?? []) {
        const localId = localByTitle.get(d.title)
        if (localId) {
          preAdded.add(d.id)
          preAddedDeckIds[d.id] = localId
        }
      }
      setAddedIds(preAdded)
      setAddedDeckIds(preAddedDeckIds)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load feed', 'error')
    }
  }, [addToast])

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders')
      if (!res.ok) throw new Error('Failed to load folders')
      const data = await res.json()
      setFolders(data ?? [])
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load folders', 'error')
    }
  }, [addToast])

  const fetchFolderDecks = useCallback(async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/decks`)
      if (!res.ok) throw new Error('Failed to load folder decks')
      const data = await res.json()
      setFolderDecks(data ?? [])
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load folder decks', 'error')
      setFolderDecks([])
    }
  }, [addToast])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchFeed(), fetchFolders()])
      setLoading(false)
    }
    init()
  }, [fetchFeed, fetchFolders])

  useEffect(() => {
    if (activeFolder) {
      fetchFolderDecks(activeFolder)
    }
  }, [activeFolder, fetchFolderDecks])

  const handleAddToApp = async (feedDeck: FeedDeck) => {
    setAddingId(feedDeck.id)
    try {
      const res = await fetch(`/api/feed/${feedDeck.id}`)
      if (!res.ok) throw new Error('Deck not found')
      const data = await res.json()

      const parsed = parseCSVFile(auditAndFixCSV(data.csv_content), data.title)

      const deckId = await createDeck(parsed.deck)
      const cardsWithDeckId = parsed.cards.map((c) => ({ ...c, deckId }))
      await createCards(cardsWithDeckId)

      setAddedIds((prev) => new Set(prev).add(feedDeck.id))
      setAddedDeckIds((prev) => ({ ...prev, [feedDeck.id]: deckId }))
      addToast('Deck added to your app!', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add deck', 'error')
    } finally {
      setAddingId(null)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreating(true)
    try {
      const sessionRes = await fetch('/api/session')
      const sessionData = await sessionRes.json().catch(() => null)
      const createdBy = sessionData?.user?.id ?? ''

      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), createdBy }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create folder')
      }
      setNewFolderName('')
      setShowNewFolder(false)
      await fetchFolders()
      addToast('Folder created!', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create folder', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleAddToFolder = async (folderId: string, deckId: string) => {
    setCategorizingId(deckId)
    try {
      const res = await fetch(`/api/folders/${folderId}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to categorize')
      }
      if (activeFolder === null) {
        setDecks((prev) => prev.filter((d) => d.id !== deckId))
      }
      await fetchFolders()
      addToast('Deck categorized!', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to categorize deck', 'error')
    } finally {
      setCategorizingId(null)
    }
  }

  const handleRemoveFromFolder = async (deckId: string) => {
    if (!activeFolder) return
    setCategorizingId(deckId)
    try {
      const res = await fetch(`/api/folders/${activeFolder}/decks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      setFolderDecks((prev) => prev.filter((d) => d.id !== deckId))
      await fetchFolders()
      addToast('Deck moved back to feed', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove deck', 'error')
    } finally {
      setCategorizingId(null)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete folder')
      if (activeFolder === folderId) setActiveFolder(null)
      await Promise.all([fetchFeed(), fetchFolders()])
      addToast('Folder deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete folder', 'error')
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (!window.confirm('Delete this deck from the feed?')) return
    try {
      const res = await fetch(`/api/feed/${deckId}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete deck')
      }
      setDecks((prev) => prev.filter((d) => d.id !== deckId))
      setFolderDecks((prev) => prev.filter((d) => d.id !== deckId))
      addToast('Deck deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete deck', 'error')
    }
  }

  const trimmedQuery = searchQuery.trim().toLowerCase()
  const sourceDecks = (activeFolder && searchScope === 'current') ? folderDecks : decks

  const displayDecks = trimmedQuery
    ? sourceDecks.filter((deck) =>
        deck.title.toLowerCase().includes(trimmedQuery) ||
        deck.subject.toLowerCase().includes(trimmedQuery) ||
        deck.author_name.toLowerCase().includes(trimmedQuery)
      )
    : (activeFolder ? folderDecks : decks)

  const matchingFolders = trimmedQuery
    ? folders.filter((f) => f.name.toLowerCase().includes(trimmedQuery))
    : []

  const activeFolderName = activeFolder ? folders.find((f) => f.id === activeFolder)?.name : null

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* T4CBS Signature Feed Header */}
        <div className="flex items-center gap-3 mb-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Public Feed</h1>
            <p className="text-xs text-slate-500">Discover and download decks created by the student community</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
            <p className="text-sm text-[var(--color-text-muted)] mt-3">Loading feed…</p>
          </div>
        ) : (
          <>
            {/* Search Bar for Feed */}
            <div className="relative mb-4">
              <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeFolder ? `Search in "${activeFolderName}" or all decks & folders...` : 'Search decks by title, subject, author, or folders...'}
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-100 shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Matching Folders quick suggestions when searching */}
            {trimmedQuery && matchingFolders.length > 0 && (
              <div className="mb-4 p-3 rounded-xl glass-panel border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Folder size={14} className="text-[var(--color-accent)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Matching Folders ({matchingFolders.length})</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {matchingFolders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setActiveFolder(f.id)
                        setSearchScope('current')
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        activeFolder === f.id
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                          : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                      }`}
                    >
                      <FolderOpen size={12} />
                      {f.name}
                      <span className="opacity-60 text-[10px]">({f.deck_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scope Toggle when inside a folder and searching */}
            {activeFolder && trimmedQuery && (
              <div className="flex items-center justify-between mb-3 text-xs text-[var(--color-text-muted)] px-1">
                <span>
                  Searching in <span className="text-[var(--color-accent)] font-medium">"{activeFolderName}"</span>
                </span>
                <div className="flex items-center gap-1 glass-panel p-1 rounded-lg border border-[var(--color-border)]">
                  <button
                    onClick={() => setSearchScope('current')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      searchScope === 'current'
                        ? 'bg-[var(--color-accent)] text-white font-medium'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    In this folder
                  </button>
                  <button
                    onClick={() => setSearchScope('all')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      searchScope === 'all'
                        ? 'bg-[var(--color-accent)] text-white font-medium'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    Across all folders
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActiveFolder(null)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all squishy-btn ${
                  activeFolder === null
                    ? 'bg-[#0052cc] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-[#0052cc] border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <BookOpen size={14} />
                All Decks
              </button>
              {folders.map((f) => (
                <div key={f.id} className="relative group">
                  <button
                    onClick={() => setActiveFolder(f.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all squishy-btn ${
                      activeFolder === f.id
                        ? 'bg-[#0052cc] text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:text-[#0052cc] border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <FolderOpen size={14} />
                    {f.name}
                    <span className="text-[11px] opacity-70">({f.deck_count})</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(f.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete folder"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#0052cc] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors squishy-btn"
              >
                <Plus size={14} />
                New Folder
              </button>
            </div>

            {showNewFolder && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name…"
                  maxLength={40}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={creating || !newFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#0052cc] text-white text-xs font-bold hover:bg-[#0047b3] disabled:opacity-50 transition-opacity squishy-btn"
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : 'Create'}
                </button>
                <button
                  onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 transition-colors squishy-btn"
                >
                  Cancel
                </button>
              </div>
            )}

            {displayDecks.length === 0 ? (
              <div className="text-center py-20">
                {trimmedQuery ? (
                  <>
                    <SearchX size={48} className="mx-auto text-[var(--color-text-muted)] opacity-60" />
                    <p className="text-base font-medium text-[var(--color-text-primary)] mt-4">
                      No decks found matching "{searchQuery}"
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {activeFolder && searchScope === 'current'
                        ? 'Try expanding search to across all folders or clear your search query.'
                        : 'Try searching with different keywords.'}
                    </p>
                    {activeFolder && searchScope === 'current' && (
                      <button
                        onClick={() => setSearchScope('all')}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        Search across all folders
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <BookOpen size={48} className="mx-auto text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)] mt-4">
                      {activeFolder ? 'This folder is empty' : 'No decks published yet'}
                    </p>
                  </>
                )}
              </div>
            ) : (
                <div className="flex flex-col gap-3.5">
                  {displayDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-slate-800 break-words line-clamp-2">
                            {deck.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052cc] font-semibold border border-blue-100">
                              {deck.subject}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              by {deck.author_name}
                            </span>
                            <span className="text-xs text-slate-400">
                              • {new Date(deck.published_at).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                              ↓ {deck.download_count} downloads
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                          {activeFolder ? (
                            <button
                              onClick={() => handleRemoveFromFolder(deck.id)}
                              disabled={categorizingId === deck.id}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 disabled:opacity-50 transition-colors squishy-btn"
                            >
                              {categorizingId === deck.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <X size={12} />
                              )}
                              Remove
                            </button>
                          ) : (
                            <div className="relative group/cat">
                              <button
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-[#0052cc] border border-slate-200 disabled:opacity-50 transition-colors squishy-btn"
                                disabled={categorizingId === deck.id}
                              >
                                {categorizingId === deck.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Folder size={12} />
                                )}
                                Categorize
                                <ChevronDown size={10} />
                              </button>
                              {folders.length > 0 && (
                                <div className="absolute right-0 top-full pt-1 z-10 hidden group-hover/cat:block min-w-44">
                                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5">
                                    {folders.map((f) => (
                                      <button
                                        key={f.id}
                                        onClick={() => handleAddToFolder(f.id, deck.id)}
                                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0052cc] flex items-center gap-2 transition-colors font-medium"
                                      >
                                        <Folder size={12} className="text-slate-400" />
                                        <span className="truncate">{f.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {folders.length === 0 && (
                                <div className="absolute right-0 top-full pt-1 z-10 hidden group-hover/cat:block min-w-40">
                                  <div className="glass-panel border border-[var(--color-border)] rounded-xl shadow-lg py-3 px-3 text-center">
                                    <p className="text-xs text-[var(--color-text-muted)]">No folders yet</p>
                                    <button
                                      onClick={() => setShowNewFolder(true)}
                                      className="mt-1 text-xs text-[var(--color-accent)] font-medium hover:underline"
                                    >
                                      Create one
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                         )}

                         {addedIds.has(deck.id) ? (
                            <button
                              onClick={() => addedDeckIds[deck.id] && router.push('/study/' + addedDeckIds[deck.id])}
                              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-xs shrink-0 squishy-btn shadow-sm"
                            >
                              <BookOpen size={13} />
                              Open Deck
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddToApp(deck)}
                              disabled={addingId === deck.id}
                              className="flex items-center gap-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50 transition-all text-xs shrink-0 squishy-btn shadow-sm cursor-pointer"
                            >
                              {addingId === deck.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Download size={13} />
                              )}
                              Download
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteDeck(deck.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete deck"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}