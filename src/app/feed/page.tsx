'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Download, BookOpen, ArrowLeft,
  Folder, FolderOpen, Plus, X, ChevronDown, Trash2,
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
      if (!res.ok) throw new Error('Failed to categorize')
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

  const displayDecks = activeFolder ? folderDecks : decks

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
          <div className="flex-1">
            <h1 className="text-2xl font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">Public Feed</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Community-shared decks</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
            <p className="text-sm text-[var(--color-text-muted)] mt-3">Loading feed…</p>
          </div>
        ) : (
          <>
             <div className="flex items-center gap-2 mb-4 flex-wrap">
               <button
                 onClick={() => setActiveFolder(null)}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors squishy-btn ${
                   activeFolder === null
                     ? 'bg-[var(--color-accent)] text-white cyber-glow'
                     : 'glass-panel text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] border border-[var(--color-border)]'
                 }`}
               >
                 <BookOpen size={14} />
                 All
               </button>
               {folders.map((f) => (
                 <div key={f.id} className="relative group">
                   <button
                     onClick={() => setActiveFolder(f.id)}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors squishy-btn ${
                       activeFolder === f.id
                         ? 'bg-[var(--color-accent)] text-white cyber-glow'
                         : 'glass-panel text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] border border-[var(--color-border)]'
                     }`}
                   >
                     <FolderOpen size={14} />
                     {f.name}
                     <span className="text-xs opacity-60">({f.deck_count})</span>
                   </button>
                   <button
                     onClick={() => handleDeleteFolder(f.id)}
                     className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-dontknow)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                     title="Delete folder"
                   >
                     <X size={10} />
                   </button>
                 </div>
               ))}
               <button
                 onClick={() => setShowNewFolder(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium glass-panel text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] border border-dashed border-[var(--color-accent)] transition-colors squishy-btn"
               >
                 <Plus size={14} />
                 New Folder
               </button>
             </div>

             {showNewFolder && (
               <div className="flex items-center gap-2 mb-4 p-3 glass-panel rounded-xl border border-[var(--color-border)]">
                 <input
                   type="text"
                   value={newFolderName}
                   onChange={(e) => setNewFolderName(e.target.value)}
                   placeholder="Folder name…"
                   maxLength={40}
                   className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.18)] transition-shadow"
                   onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
                   autoFocus
                 />
                 <button
                   onClick={handleCreateFolder}
                   disabled={creating || !newFolderName.trim()}
                   className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity squishy-btn cyber-glow-hover"
                 >
                   {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                 </button>
                 <button
                   onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                   className="px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] transition-colors squishy-btn"
                 >
                   Cancel
                 </button>
               </div>
             )}

            {displayDecks.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen size={48} className="mx-auto text-[var(--color-text-muted)]" />
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  {activeFolder ? 'This folder is empty' : 'No decks published yet'}
                </p>
              </div>
            ) : (
               <div className="flex flex-col gap-3">
                 {displayDecks.map((deck) => (
                   <div
                     key={deck.id}
                     className="glass-panel rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-neon)] transition cyber-glow-hover"
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
                       <div className="flex items-center gap-2 shrink-0">
                         {activeFolder ? (
                           <button
                             onClick={() => handleRemoveFromFolder(deck.id)}
                             disabled={categorizingId === deck.id}
                             className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-dontknow-soft)] hover:text-[var(--color-dontknow)] border border-[var(--color-border)] disabled:opacity-50 transition-colors squishy-btn"
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
                               className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] border border-[var(--color-border)] disabled:opacity-50 transition-colors squishy-btn"
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
                               <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover/cat:block min-w-40">
                                 <div className="glass-panel border border-[var(--color-border)] rounded-xl shadow-lg py-1">
                                   {folders.map((f) => (
                                     <button
                                       key={f.id}
                                       onClick={() => handleAddToFolder(f.id, deck.id)}
                                       className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] flex items-center gap-2 transition-colors"
                                     >
                                       <FolderOpen size={13} />
                                       {f.name}
                                     </button>
                                   ))}
                                   <button
                                     onClick={() => { setShowNewFolder(true); setCategorizingId(null) }}
                                     className="w-full text-left px-3 py-2 text-sm text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] flex items-center gap-2 border-t border-[var(--color-border)] transition-colors"
                                   >
                                     <Plus size={13} />
                                     New Folder…
                                   </button>
                                 </div>
                               </div>
                             )}
                             {folders.length === 0 && (
                               <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover/cat:block min-w-40">
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
                         <button
                           onClick={() => handleDeleteDeck(deck.id)}
                           className="flex items-center gap-2 text-[var(--color-dontknow)] px-4 py-2 rounded-xl font-medium hover:bg-[var(--color-dontknow-soft)] border border-[var(--color-border)] transition-colors text-sm shrink-0 squishy-btn"
                           title="Delete deck"
                         >
                           <Trash2 size={14} />
                         </button>
{addedIds.has(deck.id) ? (
                            <button
                              onClick={() => addedDeckIds[deck.id] && router.push('/study/' + addedDeckIds[deck.id])}
                              className="flex items-center gap-2 bg-[var(--color-know)] text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity text-sm shrink-0 squishy-btn cyber-glow-hover"
                            >
                              <BookOpen size={14} />
                              Open project
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddToApp(deck)}
                              disabled={addingId === deck.id}
                              className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm shrink-0 squishy-btn cyber-glow-hover"
                            >
                              {addingId === deck.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              Add to My App
                            </button>
                          )}
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