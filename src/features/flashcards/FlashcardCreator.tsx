'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Plus, X, PenLine } from 'lucide-react'
import { parseCSVFile } from '@/features/upload/csvParser'
import { createCards } from '@/db/cardRepository'
import { updateDeck } from '@/db/deckRepository'
import { useToastStore } from '@/store/toastStore'
import type { Deck } from '@/lib/zodSchemas'

interface FlashcardCreatorProps {
  deckId: string
  deck: Deck | null
  onClose: () => void
  onCardsAdded: () => void
}

type CreatorMode = 'manual' | 'ai'

interface PreviewCard {
  front: string
  back: string
  type: string
}

const CSV_HEADERS = [
  'front', 'back', 'chapter', 'subject', 'lesson', 'type',
  'mc_correct', 'mc_distractor1', 'mc_distractor2', 'mc_distractor3',
  'tf_answer', 'enum_items', 'id_answer', 'id_variants',
]

export default function FlashcardCreator({ deckId, deck, onClose, onCardsAdded }: FlashcardCreatorProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [mode, setMode] = useState<CreatorMode>('manual')

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([])
  const [previewResult, setPreviewResult] = useState<{ cards: any[]; quizItems: any[] } | null>(null)
  const [addingCards, setAddingCards] = useState(false)

  const resetAi = () => {
    setAiText('')
    setPreviewCards([])
    setPreviewResult(null)
  }

  const handleManualSave = async () => {
    if (!front.trim() || !back.trim()) {
      addToast('Both front and back are required', 'error')
      return
    }

    setManualLoading(true)
    try {
      const csvText = `front,back,type\n"${front.trim()}","${back.trim()}",definition`
      const parsed = parseCSVFile(csvText, 'temp')
      const cardsWithDeckId = parsed.cards.map((c) => ({ ...c, deckId }))
      await createCards(cardsWithDeckId)

      if (parsed.deck.quizItems.length > 0 && deck) {
        const merged = [...(deck.quizItems || []), ...parsed.deck.quizItems]
        await updateDeck(deckId, { quizItems: merged })
      }

      addToast('Card added!', 'success')
      setFront('')
      setBack('')
      onCardsAdded()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add card', 'error')
    } finally {
      setManualLoading(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!aiText.trim()) {
      addToast('Please enter some text', 'error')
      return
    }

    const firstLine = aiText.trim().split('\n')[0]
    const isCSV = /^front[,\t]/.test(firstLine) && /type/.test(firstLine)

    setAiLoading(true)
    try {
      let csvText: string

      if (isCSV) {
        csvText = aiText.trim()
      } else {
        const formData = new FormData()
        const file = new File([aiText], 'notes.txt', { type: 'text/plain' })
        formData.append('file', file)

        if (deck && deck.cards.length > 0) {
          formData.append('csvHeaders', JSON.stringify(CSV_HEADERS))
        }

        const res = await fetch('/api/convert-docx', { method: 'POST', body: formData })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Generation failed' }))
          throw new Error(errData.error || `Server error: ${res.status}`)
        }
        csvText = await res.text()
      }

      const parsed = parseCSVFile(csvText, deck?.title ?? 'Notes')

      if (parsed.cards.length === 0 && parsed.deck.quizItems.length === 0) {
        addToast('No flashcards could be generated from this text', 'error')
        return
      }

      setPreviewCards(parsed.cards.map((c) => ({ front: c.front, back: c.back, type: c.type })))
      setPreviewResult({ cards: parsed.cards, quizItems: parsed.deck.quizItems })
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Generation failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleDeletePreviewCard = (index: number) => {
    setPreviewCards((prev) => prev.filter((_, i) => i !== index))
    setPreviewResult((prev) => {
      if (!prev) return null
      return {
        cards: prev.cards.filter((_, i) => i !== index),
        quizItems: prev.quizItems,
      }
    })
  }

  const handleAddAll = async () => {
    if (!previewResult || previewResult.cards.length === 0) return
    setAddingCards(true)
    try {
      const cardsWithDeckId = previewResult.cards.map((c: any) => ({ ...c, deckId }))
      await createCards(cardsWithDeckId)

      if (previewResult.quizItems.length > 0 && deck) {
        const merged = [...(deck.quizItems || []), ...previewResult.quizItems]
        await updateDeck(deckId, { quizItems: merged })
      }

      addToast(`${previewResult.cards.length} cards added!`, 'success')
      resetAi()
      onCardsAdded()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add cards', 'error')
    } finally {
      setAddingCards(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-10">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Add Cards</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 p-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          {(['manual', 'ai'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); resetAi() }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === m
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
              }`}
            >
              {m === 'manual' ? <PenLine size={16} /> : <Sparkles size={16} />}
              {m === 'manual' ? 'Manual' : 'AI Generate'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'manual' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Front</label>
                <input
                  type="text"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="Enter the question or term"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Back</label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="Enter the answer or definition"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
              <button
                onClick={handleManualSave}
                disabled={manualLoading || !front.trim() || !back.trim()}
                className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {manualLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {manualLoading ? 'Saving…' : 'Save Card'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {previewCards.length === 0 ? (
                <>
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="Describe what you want flashcards about, or paste a paragraph of notes"
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
                  />
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiText.trim()}
                    className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {aiLoading ? 'Generating…' : 'Generate Cards'}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Generated {previewCards.length} card{previewCards.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {previewCards.map((card, i) => (
                      <div key={i} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {card.front}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
                              {card.back}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
                              {card.type}
                            </span>
                            <button
                              onClick={() => handleDeletePreviewCard(i)}
                              className="shrink-0 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remove card"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddAll}
                      disabled={addingCards}
                      className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex-1"
                    >
                      {addingCards ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {addingCards ? 'Adding…' : `Add ${previewResult?.cards.length ?? 0} Card${(previewResult?.cards.length ?? 0) !== 1 ? 's' : ''} to Deck`}
                    </button>
                    <button
                      onClick={resetAi}
                      disabled={addingCards}
                      className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-6 py-3 rounded-xl font-medium hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors"
                    >
                      Discard
                    </button>
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
