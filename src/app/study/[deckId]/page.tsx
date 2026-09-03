'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Layers,
  ListChecks,
  PenLine,
  ToggleLeft,
  List,
  BarChart2,
  Bell,
  Plus,
  Share2,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react'
import { getDeck, updateDeck } from '@/db/deckRepository'
import { getCardsByDeck } from '@/db/cardRepository'
import { getImagesByDeck } from '@/db/imageRepository'
import { useStudyStats } from '@/hooks/useStudyStats'
import { useStatsStore } from '@/store/statsStore'
import { useToastStore } from '@/store/toastStore'
import { createBrowserSupabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import ProgressRing from '@/components/ProgressRing'
import StatBadge from '@/components/StatBadge'
import ModeCard from '@/components/ModeCard'
import ExportButton from '@/features/export/ExportButton'
import FlashcardCreator from '@/features/flashcards/FlashcardCreator'
import type { Deck } from '@/lib/zodSchemas'

export default function StudyDashboard() {
  const params = useParams()
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const initStats = useStatsStore((s) => s.initStats)
  const deckId = params.deckId as string

  const [deck, setDeck] = useState<Deck | null>(null)
  const [deckLoading, setDeckLoading] = useState(true)
  const [imageCount, setImageCount] = useState(0)
  const { stats, masteredCount, learningCount, newCount, accuracy, progress, dueCount, loading } =
    useStudyStats(deckId)

  const reloadDeck = async () => {
    const [d, imgs] = await Promise.all([getDeck(deckId), getImagesByDeck(deckId)])
    if (!d) {
      router.replace('/')
      addToast('Deck not found', 'error')
      setDeck(null)
      setDeckLoading(false)
      return
    }
    setDeck(d)
    setImageCount(imgs.length)
    initStats(deckId, d.cards.length)
    setDeckLoading(false)
  }

  useEffect(() => {
    reloadDeck()
  }, [deckId, router, addToast, initStats])

  const [showCreator, setShowCreator] = useState(false)
  const [showRepublish, setShowRepublish] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [canPublish, setCanPublish] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const res = await fetch('/api/session')
      const sessionData = await res.json().catch(() => null)
      setCanPublish(sessionData?.canPublish ?? true)
    })
  }, [])

  const handleSaveTitle = async () => {
    const trimmed = editTitle.trim()
    if (!trimmed || !deck) return
    await updateDeck(deckId, { title: trimmed })
    setDeck({ ...deck, title: trimmed })
    setEditingTitle(false)
  }

  const buildDeckCsv = async () => {
    const cards = await getCardsByDeck(deckId)
    const hasCards = cards.length > 0
    const hasQuizItems = (deck?.quizItems?.length ?? 0) > 0
    if (!hasCards && !hasQuizItems) {
      throw new Error('Cannot publish an empty deck')
    }

    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }

    const csvHeaders = 'front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants'
    const csvRows: string[] = []

    for (const c of cards) {
      csvRows.push([
        esc(c.front), esc(c.back), esc(c.chapter), esc(c.subject || deck?.subject), esc(c.lesson), esc(c.type),
        esc(c.mc_correct), esc(c.mc_distractor1), esc(c.mc_distractor2), esc(c.mc_distractor3),
        esc(c.tf_answer), '', esc(c.enum_items), esc(c.id_answer), esc(c.id_variants),
      ].join(','))
    }

    return [csvHeaders, ...csvRows].join('\n')
  }

  const downloadCsvToFolder = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePublish = async (mode: 'overwrite' | 'append') => {
    if (!deck) return
    setPublishing(true)
    try {
      const csvContent = await buildDeckCsv()
      const date = new Date().toISOString().split('T')[0]
      const filename = mode === 'append'
        ? `${deck.title ?? 'Deck'}-updated-${date}.csv`
        : `${deck.title ?? 'Deck'}-${date}.csv`

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: deck.title,
          subject: deck.subject,
          csvContent,
          mode,
        }),
      })

      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(resData.error || `Server error: ${res.status}`)
      }

      downloadCsvToFolder(filename, csvContent)

      if (resData.appended) {
        addToast('Added new cards on top of the published deck. CSV saved to your folder.', 'success')
      } else if (resData.updated) {
        addToast('Overwrote the published deck. CSV saved to your folder.', 'success')
      } else {
        addToast('Published to the feed. CSV saved to your folder.', 'success')
      }
      setShowRepublish(false)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to publish', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const startPublish = async () => {
    if (!deck) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/publish?title=${encodeURIComponent(deck.title ?? 'Deck')}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.existing) {
        setShowRepublish(true)
        setPublishing(false)
        return
      }
      await handlePublish('overwrite')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to publish', 'error')
      setPublishing(false)
    }
  }

  if (deckLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] animate-pulse" />
        <div className="px-4 pt-6 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded" />
          <div className="h-5 w-24 bg-[var(--color-surface-2)] rounded-full" />
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-2)]" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-[var(--color-surface-2)] rounded" />
              <div className="h-4 w-20 bg-[var(--color-surface-2)] rounded" />
              <div className="h-4 w-16 bg-[var(--color-surface-2)] rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-[var(--color-surface-2)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const mcCount = deck?.quizItems.filter((q) => q.mode === 'multiple_choice').length ?? 0
  const tfCount = deck?.quizItems.filter((q) => q.mode === 'true_false').length ?? 0
  const enumCount = deck?.quizItems.filter((q) => q.mode === 'enumeration').length ?? 0
  const keywordCount = deck?.cards.filter((c) => c.type === 'keyword').length ?? 0
  const flashcardCount = deck?.cards.filter((c) => {
    const t = (c.type as string).toLowerCase()
    return t !== 'keyword' && t !== 'tf' && t !== 'true_false'
  }).length ?? 0

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopBar
        title={deck?.title ?? 'Deck'}
        onBack={() => router.push('/')}
        rightSlot={<ExportButton deckId={deckId} deckTitle={deck?.title ?? 'Deck'} variant="icon" />}
      />

      <div className="px-4 pt-6 min-w-0">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
              onBlur={handleSaveTitle}
              autoFocus
               className="text-2xl font-['Playfair_Display'] text-[var(--color-text-primary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1 w-full max-w-md focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        ) : (
          <h1
            className="text-2xl font-['Playfair_Display'] text-[var(--color-text-primary)] break-words cursor-pointer hover:text-[var(--color-accent)] transition-colors"
            onClick={() => { setEditTitle(deck?.title ?? ''); setEditingTitle(true) }}
            title="Click to edit title"
          >
            {deck?.title ?? 'Deck'}
          </h1>
        )}
        <div className="mt-1">
          <StatBadge label={deck?.subject ?? 'General'} value={''} color="accent" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 items-start sm:items-center">
          <div className="flex items-center gap-4 overflow-visible px-1">
            <ProgressRing value={progress} size={72} />
            <div className="flex flex-col gap-1">
              <StatBadge label="Mastered" value={masteredCount} color="know" />
              <StatBadge label="Learning" value={learningCount} color="mastered" />
              <StatBadge label="New" value={newCount} color="new" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 w-full sm:w-auto">
             <button
               onClick={() => setShowCreator(true)}
               className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-4 py-2 rounded-xl font-medium hover:border-[var(--color-border-neon)] border border-[var(--color-border)] transition-colors text-sm w-full sm:w-auto squishy-btn"
             >
               <Plus size={16} /> Edit / Add Cards
             </button>
             {canPublish && (
               <button
                 onClick={startPublish}
                 disabled={publishing}
                 className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-4 py-2 rounded-xl font-medium hover:border-[var(--color-border-neon)] border border-[var(--color-border)] transition-colors text-sm w-full col-span-2 sm:col-span-1 squishy-btn"
               >
                 <Share2 size={16} /> {publishing ? 'Publishing…' : 'Publish'}
               </button>
             )}
           </div>
        </div>

        <div className="mt-2 text-sm text-[var(--color-mastered)] font-medium">
          🔥 {stats?.studyStreak ?? 0} day streak
        </div>
      </div>

      {dueCount > 0 && (
        <div className="mx-4 mt-4 glass-panel border-l-4 border-[var(--color-accent)] rounded-xl p-4 flex justify-between items-center cyber-glow">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[var(--color-accent)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {dueCount} cards due for review today
            </span>
          </div>
          <button
            onClick={() => router.push(`/study/${deckId}/flashcards?mode=review`)}
            className="text-[var(--color-accent)] text-sm font-medium hover:underline"
          >
            Start review →
          </button>
        </div>
      )}

      <div className="px-4 mt-6">
        <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
          Study modes
        </p>
      </div>

      <div className="px-4 pb-8 mt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ModeCard
            icon={Layers}
            label="Flashcards"
            description="Review all cards"
            color="var(--color-accent)"
            href={`/study/${deckId}/flashcards`}
            count={`${flashcardCount} cards`}
            disabled={flashcardCount === 0}
          />
          <ModeCard
            icon={ListChecks}
            label="Multiple Choice"
            description="4-option questions"
            color="var(--color-new)"
            href={`/study/${deckId}/quiz/multiple-choice`}
            count={`${mcCount} questions`}
            disabled={mcCount === 0}
          />
          <ModeCard
            icon={ToggleLeft}
            label="True / False"
            description="True or false?"
            color="var(--color-mastered)"
            href={`/study/${deckId}/quiz/true-false`}
            count={`${tfCount} questions`}
            disabled={tfCount === 0}
          />
          <ModeCard
            icon={List}
            label="Enumeration"
            description="Recall the list"
            color="var(--color-dontknow)"
            href={`/study/${deckId}/quiz/enumeration`}
            count={`${enumCount} sets`}
            disabled={enumCount === 0}
          />
          <ModeCard
            icon={PenLine}
            label="Fill in Blanks"
            description="Interactive reading"
            color="var(--color-accent-soft)"
            href={`/study/${deckId}/blanks`}
            count="Docs"
          />
          <ModeCard
            icon={BookOpen}
            label="Notes"
            description="Key terms & definitions"
            color="var(--color-mastered)"
            href={`/study/${deckId}/notes`}
            count={keywordCount > 0 ? `${keywordCount} terms` : 'No keywords'}
            disabled={keywordCount === 0}
          />
          <ModeCard
            icon={ImageIcon}
            label="Gallery"
            description="Diagrams & visual notes"
            color="var(--color-border-neon)"
            href={`/study/${deckId}/images`}
            count={imageCount > 0 ? `${imageCount} photo${imageCount !== 1 ? 's' : ''}` : 'No photos'}
          />
          <ModeCard
            icon={BarChart2}
            label="Stats"
            description="Your progress"
            color="var(--color-text-secondary)"
            href={`/study/${deckId}/stats`}
            count={`${accuracy}%`}
          />
        </div>
      </div>

      {showCreator && (
        <FlashcardCreator
          deckId={deckId}
          deck={deck}
          onClose={() => setShowCreator(false)}
          onCardsAdded={reloadDeck}
        />
      )}

      {showRepublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !publishing && setShowRepublish(false)}>
          <div
            className="glass-panel rounded-2xl border border-[var(--color-border)] w-full max-w-sm p-6 cyber-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)] mb-2">Republish deck</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              This title is already in the feed. Overwrite the current cards, or add these cards on top? Duplicate flashcard answers are dropped.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => handlePublish('overwrite')}
                disabled={publishing}
                className="flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity squishy-btn cyber-glow-hover"
              >
                {publishing ? 'Publishing…' : 'Overwrite current cards'}
              </button>
              <button
                onClick={() => handlePublish('append')}
                disabled={publishing}
                className="flex items-center justify-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-6 py-3 rounded-xl font-medium border border-[var(--color-border)] hover:border-[var(--color-border-neon)] disabled:opacity-50 transition-colors squishy-btn"
              >
                Add cards on top
              </button>
              <button
                onClick={() => setShowRepublish(false)}
                disabled={publishing}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] py-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}