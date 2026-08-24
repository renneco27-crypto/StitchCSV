'use client'

import { useState, useEffect } from 'react'
import { Loader2, Sparkles, Plus, X, PenLine, Check, Trash2, Search, ListFilter } from 'lucide-react'
import { parseCSVFile } from '@/features/upload/csvParser'
import { auditAndFixCSV, isCSVInput } from '@/features/upload/csvFixer'
import { createCards, deleteCard, getCardsByDeck } from '@/db/cardRepository'
import { updateDeck } from '@/db/deckRepository'
import { useToastStore } from '@/store/toastStore'
import type { Card, Deck } from '@/lib/zodSchemas'

interface FlashcardCreatorProps {
  deckId: string
  deck: Deck | null
  onClose: () => void
  onCardsAdded: () => void
}

type CreatorMode = 'manual' | 'ai' | 'manage'

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
  const [cardType, setCardType] = useState('definition')
  const [mcQuestion, setMcQuestion] = useState('')
  const [mcCorrect, setMcCorrect] = useState('')
  const [mcDistractors, setMcDistractors] = useState(['', '', ''])
  const [tfStatement, setTfStatement] = useState('')
  const [tfCorrect, setTfCorrect] = useState(true)
  const [enumTopic, setEnumTopic] = useState('')
  const [enumItems, setEnumItems] = useState(['', '', ''])
  const [idDescription, setIdDescription] = useState('')
  const [idAnswer, setIdAnswer] = useState('')
  const [idVariants, setIdVariants] = useState([''])

  const resetManualForm = () => {
    setFront(''); setBack(''); setMcQuestion(''); setMcCorrect(''); setMcDistractors(['', '', ''])
    setTfStatement(''); setTfCorrect(true); setEnumTopic(''); setEnumItems(['', '', ''])
    setIdDescription(''); setIdAnswer(''); setIdVariants([''])
  }

  useEffect(() => {
    resetManualForm()
  }, [cardType])

  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([])
  const [previewResult, setPreviewResult] = useState<{ cards: any[]; quizItems: any[] } | null>(null)
  const [addingCards, setAddingCards] = useState(false)

  const [existingCards, setExistingCards] = useState<Card[]>([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [existingSearch, setExistingSearch] = useState('')

  const loadExistingCards = async () => {
    setExistingLoading(true)
    try {
      const all = await getCardsByDeck(deckId)
      setExistingCards(all)
    } finally {
      setExistingLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'manage') {
      loadExistingCards()
    }
  }, [mode, deckId])

  const handleDeleteExistingCard = async (cardId: string) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return
    try {
      await deleteCard(cardId)
      setExistingCards((prev) => prev.filter((c) => c.id !== cardId))
      addToast('Card deleted', 'success')
      onCardsAdded()
    } catch (err) {
      addToast('Failed to delete card', 'error')
    }
  }

  const resetAi = () => {
    setAiText('')
    setPreviewCards([])
    setPreviewResult(null)
  }

  const handleManualSave = async () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }

    let csvText: string

    switch (cardType) {
      case 'multiple_choice': {
        if (!mcQuestion.trim() || !mcCorrect.trim()) {
          addToast('Question and correct answer are required', 'error'); return
        }
        if (mcDistractors.some(d => !d.trim())) {
          addToast('All 3 distractors are required', 'error'); return
        }
        const headers = ['front', 'back', 'type', 'mc_correct', 'mc_distractor1', 'mc_distractor2', 'mc_distractor3']
        const row = [esc(mcQuestion), esc(mcCorrect), 'multiple_choice', esc(mcCorrect), ...mcDistractors.map(esc)].join(',')
        csvText = [headers.join(','), row].join('\n')
        break
      }
      case 'true_false': {
        if (!tfStatement.trim()) {
          addToast('Statement is required', 'error'); return
        }
        const tfAnswer = tfCorrect ? 'true' : 'false'
        const headers = ['front', 'back', 'type', 'tf_answer']
        const row = [esc(tfStatement), tfCorrect ? 'True' : 'False', 'true_false', tfAnswer].join(',')
        csvText = [headers.join(','), row].join('\n')
        break
      }
      case 'enumeration': {
        if (!enumTopic.trim()) {
          addToast('Topic is required', 'error'); return
        }
        const validItems = enumItems.filter(i => i.trim())
        if (validItems.length < 3) {
          addToast('At least 3 items are required', 'error'); return
        }
        const itemsStr = validItems.join(';')
        const headers = ['front', 'back', 'type', 'enum_items']
        const row = [esc(enumTopic), esc(validItems.join(', ')), 'enumeration', esc(itemsStr)].join(',')
        csvText = [headers.join(','), row].join('\n')
        break
      }
      case 'identification': {
        if (!idDescription.trim() || !idAnswer.trim()) {
          addToast('Description and answer are required', 'error'); return
        }
        const validVariants = idVariants.filter(v => v.trim())
        const variantsStr = validVariants.length > 0 ? validVariants.join(';') : idAnswer.trim().toLowerCase()
        const headers = ['front', 'back', 'type', 'id_answer', 'id_variants']
        const row = [esc(idDescription), esc(idAnswer), 'identification', esc(idAnswer), esc(variantsStr)].join(',')
        csvText = [headers.join(','), row].join('\n')
        break
      }
      case 'keyword': {
        if (!front.trim() || !back.trim()) {
          addToast('Both keyword and notes content are required', 'error'); return
        }
        const headers = ['front', 'back', 'type']
        const row = [esc(front), esc(back), 'keyword'].join(',')
        csvText = [headers.join(','), row].join('\n')
        break
      }
      default: {
        if (!front.trim() || !back.trim()) {
          addToast('Both front and back are required', 'error'); return
        }
        const headers = ['front', 'back', 'type']
        const row = [esc(front), esc(back), 'definition'].join(',')
        csvText = [headers.join(','), row].join('\n')
      }
    }

    setManualLoading(true)
    try {
      const parsed = parseCSVFile(auditAndFixCSV(csvText), 'temp')
      const cardsWithDeckId = parsed.cards.map((c) => ({ ...c, deckId }))
      await createCards(cardsWithDeckId)

      if (parsed.deck.quizItems.length > 0 && deck) {
        const merged = [...(deck.quizItems || []), ...parsed.deck.quizItems]
        await updateDeck(deckId, { quizItems: merged })
      }

      addToast('Card added!', 'success')
      resetManualForm()
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
    const isCSV = isCSVInput(aiText)

    setAiLoading(true)
    try {
      let csvText: string

      if (isCSV) {
        csvText = auditAndFixCSV(aiText.trim())
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
        csvText = auditAndFixCSV(await res.text())
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel rounded-2xl border border-[var(--color-border)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col cyber-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 z-10">
          <h2 className="text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">Add Cards</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 p-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
          {(['manual', 'ai', 'manage'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); resetAi() }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0 ${
                mode === m
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
              }`}
            >
              {m === 'manual' ? <PenLine size={16} /> : m === 'ai' ? <Sparkles size={16} /> : <ListFilter size={16} />}
              {m === 'manual' ? 'Manual' : m === 'ai' ? 'AI Generate' : `Manage (${existingCards.length || deck?.cards.length || 0})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'manual' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {(['definition', 'keyword', 'multiple_choice', 'true_false', 'enumeration', 'identification'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCardType(t)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      cardType === t
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
                    }`}
                  >
                    {t === 'definition' ? 'Definition' : t === 'keyword' ? 'Notes / Key' : t === 'multiple_choice' ? 'MC' : t === 'true_false' ? 'T/F' : t === 'enumeration' ? 'Enum' : 'ID'}
                  </button>
                ))}
              </div>

              {cardType === 'keyword' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Topic / Keyword</label>
                    <input type="text" value={front} onChange={(e) => setFront(e.target.value)} placeholder="e.g. CLARO M. RECTO or RIZAL BILL"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Notes / Bullet Points / Dates</label>
                    <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder={`e.g.\n• Born: Feb 8, 1890 | Died: Oct 2, 1960\n• Parents: Claro Recto Sr. & Micaela Mayo\n• Authored by Senator Claro M. Recto`}
                      rows={5} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none font-sans" />
                  </div>
                </div>
              )}

              {cardType === 'definition' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Front</label>
                    <input type="text" value={front} onChange={(e) => setFront(e.target.value)} placeholder="Enter the question or term"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Back</label>
                    <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Enter the answer or definition"
                      rows={3} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none" />
                  </div>
                </div>
              )}

              {cardType === 'multiple_choice' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Question</label>
                    <input type="text" value={mcQuestion} onChange={(e) => setMcQuestion(e.target.value)} placeholder="Enter the question"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Correct Answer</label>
                    <input type="text" value={mcCorrect} onChange={(e) => setMcCorrect(e.target.value)} placeholder="The correct answer"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Distractors</label>
                    <div className="space-y-2">
                      {mcDistractors.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[var(--color-text-muted)] w-4">{['A','B','C'][i]}</span>
                          <input type="text" value={d} onChange={(e) => {
                            const next = [...mcDistractors]; next[i] = e.target.value; setMcDistractors(next)
                          }} placeholder={`Distractor ${i + 1}`}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                          <button onClick={() => {
                            const next = [...mcDistractors]; next[i] = ''; setMcDistractors(next)
                          }} className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Clear distractor">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {cardType === 'true_false' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Statement</label>
                    <textarea value={tfStatement} onChange={(e) => setTfStatement(e.target.value)} placeholder="Enter the statement"
                      rows={3} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Correct Answer</label>
                    <div className="flex gap-2">
                      <button onClick={() => setTfCorrect(true)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium transition-colors flex-1 ${
                          tfCorrect ? 'border-[var(--color-know)] bg-[var(--color-know-soft)] text-[var(--color-know)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                        }`}>
                        {tfCorrect && <Check size={16} />} True
                      </button>
                      <button onClick={() => setTfCorrect(false)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium transition-colors flex-1 ${
                          !tfCorrect ? 'border-[var(--color-dontknow)] bg-[var(--color-dontknow-soft)] text-[var(--color-dontknow)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                        }`}>
                        {!tfCorrect && <Check size={16} />} False
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {cardType === 'enumeration' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Topic</label>
                    <input type="text" value={enumTopic} onChange={(e) => setEnumTopic(e.target.value)} placeholder="e.g. Types of clouds"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Items</label>
                    <div className="space-y-2">
                      {enumItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[var(--color-text-muted)] w-4">{i + 1}.</span>
                          <input type="text" value={item} onChange={(e) => {
                            const next = [...enumItems]; next[i] = e.target.value; setEnumItems(next)
                          }} placeholder={`Item ${i + 1}`}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                          <button onClick={() => setEnumItems(enumItems.filter((_, j) => j !== i))}
                            className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove item">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setEnumItems([...enumItems, ''])}
                      className="mt-2 text-sm text-[var(--color-accent)] hover:underline">
                      + Add item
                    </button>
                  </div>
                </div>
              )}

              {cardType === 'identification' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Description</label>
                    <textarea value={idDescription} onChange={(e) => setIdDescription(e.target.value)} placeholder="The description or clue"
                      rows={2} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Answer</label>
                    <input type="text" value={idAnswer} onChange={(e) => setIdAnswer(e.target.value)} placeholder="The correct term"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Accept Variants</label>
                    <div className="space-y-2">
                      {idVariants.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="text" value={v} onChange={(e) => {
                            const next = [...idVariants]; next[i] = e.target.value; setIdVariants(next)
                          }} placeholder={`Variant ${i + 1}`}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                          <button onClick={() => setIdVariants(idVariants.filter((_, j) => j !== i))}
                            className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove variant">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setIdVariants([...idVariants, ''])}
                      className="mt-2 text-sm text-[var(--color-accent)] hover:underline">
                      + Add variant
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleManualSave}
                disabled={manualLoading || (cardType === 'definition' && (!front.trim() || !back.trim())) || (cardType === 'multiple_choice' && (!mcQuestion.trim() || !mcCorrect.trim() || mcDistractors.some(d => !d.trim()))) || (cardType === 'true_false' && !tfStatement.trim()) || (cardType === 'enumeration' && (!enumTopic.trim() || enumItems.filter(i => i.trim()).length < 3)) || (cardType === 'identification' && (!idDescription.trim() || !idAnswer.trim()))}
                className="flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {manualLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {manualLoading ? 'Saving…' : 'Save Card'}
              </button>
            </div>
          ) : mode === 'manage' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={existingSearch}
                  onChange={(e) => setExistingSearch(e.target.value)}
                  placeholder="Search existing cards in this deck…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {existingLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-[var(--color-text-muted)]">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading cards…
                </div>
              ) : existingCards.length === 0 ? (
                <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
                  No cards in this deck yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {existingCards
                    .filter((c) =>
                      !existingSearch ||
                      c.front.toLowerCase().includes(existingSearch.toLowerCase()) ||
                      c.back.toLowerCase().includes(existingSearch.toLowerCase()) ||
                      c.type.toLowerCase().includes(existingSearch.toLowerCase())
                    )
                    .map((card, idx) => (
                      <div
                        key={card.id}
                        className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/40 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">#{idx + 1}</span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                              {card.type}
                            </span>
                            {card.chapter && (
                              <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[120px]">
                                {card.chapter}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">
                            {card.front}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                            {card.back}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteExistingCard(card.id)}
                          className="shrink-0 p-2 rounded-lg text-[var(--color-dontknow)] hover:bg-[var(--color-dontknow)]/10 transition-colors"
                          title="Delete card"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
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
                              className="shrink-0 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
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
