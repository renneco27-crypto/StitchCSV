"use client";
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
} from 'lucide-react'
import { getDeck, updateDeck } from '@/db/deckRepository'
import { createCards, getCardsByDeck } from '@/db/cardRepository'
import { parseCSVFile } from '@/features/upload/csvParser'
import { useStudyStats } from '@/hooks/useStudyStats'
import { useStatsStore } from '@/store/statsStore'
import { useToastStore } from '@/store/toastStore'
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
  const { stats, masteredCount, learningCount, newCount, accuracy, progress, dueCount, loading } =
    useStudyStats(deckId)

  useEffect(() => {
    const load = async () => {
      const d = await getDeck(deckId)
      if (!d) {
        router.replace('/')
        addToast('Deck not found', 'error')
        setDeck(null)
        setDeckLoading(false)
        return
      }
      setDeck(d)
      initStats(deckId, d.cards.length)
      setDeckLoading(false)
    }
    load()
  }, [deckId, router, addToast, initStats])

  const [addingCsv, setAddingCsv] = useState(false)
  const [addingDocx, setAddingDocx] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [authorName, setAuthorName] = useState('')

  const handleAddCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAddingCsv(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const text = reader.result as string
          const title = deck?.title ?? file.name.replace(/\.csv$/i, '')
          const parsed = parseCSVFile(text, title)

          const cardsWithDeckId = parsed.cards.map((c) => ({ ...c, deckId }))
          await createCards(cardsWithDeckId)
          if (parsed.deck.quizItems.length > 0 && deck) {
            const merged = [...(deck.quizItems || []), ...parsed.deck.quizItems]
            await updateDeck(deckId, { quizItems: merged })
          }
          addToast('CSV added to deck!', 'success')
          window.location.reload()
        } catch (err) {
          console.error(err)
          addToast(err instanceof Error ? err.message : 'Failed to add CSV', 'error')
        }
      }
      reader.readAsText(file)
    } catch (err) {
      console.error(err)
      addToast(err instanceof Error ? err.message : 'Failed to add CSV', 'error')
    } finally {
      setAddingCsv(false)
      e.target.value = ''
    }
  }

  const handleAddDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAddingDocx(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      if (deck && deck.cards.length > 0) {
        const csvHeaders = ['front', 'back', 'chapter', 'subject', 'lesson', 'type',
          'mc_correct', 'mc_distractor1', 'mc_distractor2', 'mc_distractor3',
          'tf_answer', 'enum_items', 'id_answer', 'id_variants']
        formData.append('csvHeaders', JSON.stringify(csvHeaders))
      }

      const res = await fetch('/api/convert-docx', { method: 'POST', body: formData })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Conversion failed' }))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }

      const csvText = await res.text()
      const title = deck?.title ?? file.name.replace(/\.docx$/i, '')
      const parsed = parseCSVFile(csvText, title)

      const cardsWithDeckId = parsed.cards.map((c) => ({ ...c, deckId }))
      await createCards(cardsWithDeckId)
      if (parsed.deck.quizItems.length > 0 && deck) {
        const merged = [...(deck.quizItems || []), ...parsed.deck.quizItems]
        await updateDeck(deckId, { quizItems: merged })
      }
      addToast('DOCX converted and added to deck!', 'success')
      window.location.reload()
    } catch (err) {
      console.error(err)
      addToast(err instanceof Error ? err.message : 'Failed to add DOCX', 'error')
    } finally {
      setAddingDocx(false)
      e.target.value = ''
    }
  }

  const handlePublish = async () => {
    if (!deck) return
    setPublishing(true)
    try {
      const cards = await getCardsByDeck(deckId)
      const hasCards = cards.length > 0
      const hasQuizItems = (deck.quizItems?.length ?? 0) > 0
      if (!hasCards && !hasQuizItems) {
        addToast('Cannot publish an empty deck', 'error')
        return
      }

      const esc = (v: unknown) => {
        const s = String(v ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s
      }

      const csvHeaders = 'front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,enum_items,id_answer,id_variants'
      const csvRows: string[] = []

      for (const c of cards) {
        csvRows.push([
          esc(c.front), esc(c.back), esc(c.chapter), esc(c.subject || deck.subject), esc(c.lesson), esc(c.type),
          esc(c.mc_correct), esc(c.mc_distractor1), esc(c.mc_distractor2), esc(c.mc_distractor3),
          esc(c.tf_answer), esc(c.enum_items), esc(c.id_answer), esc(c.id_variants),
        ].join(','))
      }

      for (const q of deck.quizItems || []) {
        switch (q.mode) {
          case 'multiple_choice':
            csvRows.push([
              esc(q.question), esc(q.correct), '', '', '', 'multiple_choice',
              esc(q.correct), esc(q.distractors[0] ?? ''), esc(q.distractors[1] ?? ''), esc(q.distractors[2] ?? ''),
              '', '', '', '',
            ].join(','))
            break
          case 'true_false':
            csvRows.push([
              esc(q.statement), '', '', '', '', 'true_false',
              '', '', '', '',
              q.correct ? 'true' : 'false', '', '', '',
            ].join(','))
            break
          case 'enumeration':
            csvRows.push([
              esc(q.topic), '', '', '', '', 'enumeration',
              '', '', '', '',
              '', q.items.join(';'), '', '',
            ].join(','))
            break
          case 'identification':
            csvRows.push([
              esc(q.definition), '', '', '', '', 'identification',
              '', '', '', '',
              '', '', esc(q.answer), esc(q.acceptVariants?.join(';') ?? ''),
            ].join(','))
            break
        }
      }

      const csvContent = [csvHeaders, ...csvRows].join('\n')

      const name = localStorage.getItem('accessCode') ?? 'Anonymous'

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: deck.title,
          subject: deck.subject,
          csvContent,
          authorName: name,
          deviceId: localStorage.getItem('deviceId') ?? 'unknown',
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Publish failed' }))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }

      addToast('Published! Anyone can now find your deck in the feed.', 'success')
      setShowPublish(false)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to publish', 'error')
    } finally {
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
  const idCount = deck?.quizItems.filter((q) => q.mode === 'identification').length ?? 0
  const tfCount = deck?.quizItems.filter((q) => q.mode === 'true_false').length ?? 0
  const enumCount = deck?.quizItems.filter((q) => q.mode === 'enumeration').length ?? 0

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopBar
        title={deck?.title ?? 'Deck'}
        onBack={() => router.push('/')}
        rightSlot={<ExportButton deckId={deckId} deckTitle={deck?.title ?? 'Deck'} variant="icon" />}
      />

      <div className="px-4 pt-6 min-w-0">
        <h1 className="text-2xl font-['DM_Serif_Display'] text-[var(--color-text-primary)] truncate">
          {deck?.title ?? 'Deck'}
        </h1>
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
              onClick={() => document.getElementById('docx-input')?.click()}
              disabled={addingDocx}
              className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm w-full sm:w-auto"
            >
              <Plus size={16} /> Add DOCX
            </button>
            <button
              onClick={() => document.getElementById('csv-input')?.click()}
              disabled={addingCsv}
              className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm w-full sm:w-auto"
            >
              <Plus size={16} /> Add CSV
            </button>
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-4 py-2 rounded-xl font-medium hover:bg-[var(--color-surface)] transition-colors text-sm w-full sm:w-auto"
            >
              <Plus size={16} /> Add Cards
            </button>
            <button
              onClick={() => router.push('/new-deck')}
              className="bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-4 py-2 rounded-xl font-medium hover:bg-[var(--color-surface)] transition-colors text-sm w-full sm:w-auto"
            >
              New Deck
            </button>
            <button
              onClick={() => {
                const saved = localStorage.getItem('authorName') || ''
                setAuthorName(saved)
                setShowPublish(true)
              }}
              className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-4 py-2 rounded-xl font-medium hover:bg-[var(--color-surface)] transition-colors text-sm w-full col-span-2 sm:col-span-1"
            >
              <Share2 size={16} /> Publish
            </button>
          </div>
        </div>

        <div className="mt-2 text-sm text-[var(--color-mastered)] font-medium">
          🔥 {stats?.studyStreak ?? 0} day streak
        </div>
      </div>

      {dueCount > 0 && (
        <div className="mx-4 mt-4 bg-[var(--color-accent-soft)] border-l-4 border-[var(--color-accent)] rounded-xl p-4 flex justify-between items-center">
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
            count={`${deck?.cards.length ?? 0} cards`}
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
            icon={PenLine}
            label="Identification"
            description="Fill in the blank"
            color="var(--color-know)"
            href={`/study/${deckId}/quiz/identification`}
            count={`${idCount} questions`}
            disabled={idCount === 0}
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
            icon={BarChart2}
            label="Stats"
            description="Your progress"
            color="var(--color-text-secondary)"
            href={`/study/${deckId}/stats`}
            count={`${accuracy}%`}
          />
        </div>
      </div>

      <input
        id="docx-input"
        type="file"
        accept=".docx,.txt"
        onChange={handleAddDocx}
        className="hidden"
      />
      <input
        id="csv-input"
        type="file"
        accept=".csv,text/csv"
        onChange={handleAddCsv}
        className="hidden"
      />

      {showCreator && (
        <FlashcardCreator
          deckId={deckId}
          deck={deck}
          onClose={() => setShowCreator(false)}
          onCardsAdded={() => window.location.reload()}
        />
      )}

      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPublish(false)}>
          <div
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Publish to Feed</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Publishing as: <span className="text-[var(--color-text-primary)] font-medium">{localStorage.getItem('accessCode') ?? 'Anonymous'}</span>
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex-1"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
              <button
                onClick={() => setShowPublish(false)}
                disabled={publishing}
                className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-6 py-3 rounded-xl font-medium hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors"
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