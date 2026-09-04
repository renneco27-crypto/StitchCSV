'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, EyeOff, Trash2, CheckSquare, Square, AlertTriangle, Volume2, VolumeX } from 'lucide-react'
import { deleteCard, bulkDeleteCards } from '@/db/cardRepository'
import { useToastStore } from '@/store/toastStore'
import MathFormattedText from '@/components/MathFormattedText'
import TTSHighlightedText from '@/components/TTSHighlightedText'
import { useNeuralTTS } from '@/hooks/useNeuralTTS'
import type { Card } from '@/lib/zodSchemas'

interface FlashcardListViewProps {
  cards: Card[]
  onCardDeleted?: (cardId: string) => void
}

export default function FlashcardListView({ cards: initialCards, onCardDeleted }: FlashcardListViewProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [search, setSearch] = useState('')
  const [hideAnswers, setHideAnswers] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    cardIds: string[]
    description: string
  } | null>(null)

  const { speak, stop: stopTTS, isPlaying: isTTSPlaying, currentSpeakingId, currentWordRange } = useNeuralTTS()

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopTTS()
    }
  }, [stopTTS])

  const toggleSelectCard = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const toggleSelectAll = (filteredCards: Card[]) => {
    const allFilteredIds = filteredCards.map((c) => c.id)
    const allSelected = allFilteredIds.every((id) => selectedIds.has(id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        allFilteredIds.forEach((id) => next.delete(id))
      } else {
        allFilteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleToggleHideAll = () => {
    if (hideAnswers) {
      setRevealedIds(new Set(cards.map(c => c.id)))
      setHideAnswers(false)
    } else {
      setRevealedIds(new Set())
      setHideAnswers(true)
    }
  }

  const promptDeleteSingle = (card: Card) => {
    setConfirmModal({
      isOpen: true,
      cardIds: [card.id],
      description: `"${card.front.length > 50 ? card.front.slice(0, 50) + '...' : card.front}"`,
    })
  }

  const promptDeleteBulk = () => {
    if (selectedIds.size === 0) return
    setConfirmModal({
      isOpen: true,
      cardIds: Array.from(selectedIds),
      description: `${selectedIds.size} selected card${selectedIds.size !== 1 ? 's' : ''}`,
    })
  }

  const executeDelete = async () => {
    if (!confirmModal || confirmModal.cardIds.length === 0) return
    const ids = confirmModal.cardIds
    try {
      if (ids.length === 1) {
        await deleteCard(ids[0])
      } else {
        await bulkDeleteCards(ids)
      }
      setCards((prev) => prev.filter((c) => !ids.includes(c.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      addToast(
        ids.length === 1 ? 'Card deleted' : `${ids.length} cards deleted`,
        'success'
      )
      if (onCardDeleted) {
        ids.forEach((id) => onCardDeleted(id))
      }
      setConfirmModal(null)
    } catch {
      addToast('Failed to delete card(s)', 'error')
    }
  }

  const toggleAnswer = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = cards.filter(
    (c) =>
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase()) ||
      c.chapter.toLowerCase().includes(search.toLowerCase())
  )

  // Group by chapter
  const grouped = filtered.reduce<Record<string, Card[]>>((acc, card) => {
    const chapter = card.chapter || 'General'
    if (!acc[chapter]) acc[chapter] = []
    acc[chapter].push(card)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleToggleHideAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] rounded-lg transition-colors"
            title={hideAnswers ? "Show all answers" : "Hide all answers for active recall"}
          >
            {hideAnswers ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{hideAnswers ? 'Show Answers' : 'Hide Answers'}</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={promptDeleteBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-dontknow)] border border-[var(--color-dontknow)]/30 hover:bg-[var(--color-dontknow)]/10 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards List Grouped by Chapter */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {Object.entries(grouped).map(([chapter, chapterCards]) => (
          <div key={chapter} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                {chapter}
              </h3>
              <button
                onClick={() => toggleSelectAll(chapterCards)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                {chapterCards.every((c) => selectedIds.has(c.id))
                  ? 'Deselect Chapter'
                  : 'Select Chapter'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {chapterCards.map((card, i) => {
                const isHidden = hideAnswers && !revealedIds.has(card.id)
                const isSelected = selectedIds.has(card.id)
                const frontSpeechId = `list-front-${card.id}`
                const backSpeechId = `list-back-${card.id}`
                const isFrontSpeaking = isTTSPlaying && currentSpeakingId === frontSpeechId
                const isBackSpeaking = isTTSPlaying && currentSpeakingId === backSpeechId

                return (
                  <div
                    key={card.id}
                    className={`glass-panel rounded-2xl border overflow-hidden shadow-sm transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-neon)]'
                    }`}
                  >
                    {/* Question / front */}
                    <div className="p-4 bg-[var(--color-surface)]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => toggleSelectCard(card.id)}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors p-0.5"
                            title="Select card"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[var(--color-accent)]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                            #{i + 1} • {card.type}
                          </span>
                          {card.lesson && (
                            <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[150px]">
                              {card.lesson}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isFrontSpeaking || isBackSpeaking) {
                                stopTTS()
                              } else {
                                speak(card.front, frontSpeechId, {
                                  onEnd: () => {
                                    // Make sure answer is revealed
                                    if (isHidden) {
                                      toggleAnswer(card.id)
                                    }
                                    setTimeout(() => {
                                      speak(card.back, backSpeechId)
                                    }, 350)
                                  }
                                })
                              }
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isFrontSpeaking || isBackSpeaking
                                ? 'bg-blue-100 text-[#003bb3] border-blue-400 shadow-sm animate-pulse'
                                : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]'
                            }`}
                            title={isFrontSpeaking || isBackSpeaking ? "Stop read aloud" : "Read everything: question and answer with word highlight"}
                          >
                            {isFrontSpeaking || isBackSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          <button
                            onClick={() => promptDeleteSingle(card)}
                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-dontknow)] hover:bg-[var(--color-dontknow)]/10 transition-colors"
                            title="Delete card"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="font-['Playfair_Display'] text-base sm:text-lg text-[var(--color-text-primary)] leading-snug">
                        {isFrontSpeaking ? (
                          <TTSHighlightedText
                            text={card.front}
                            isSpeaking={isFrontSpeaking}
                            wordRange={currentWordRange}
                            fallbackComponent={<MathFormattedText text={card.front} />}
                          />
                        ) : (
                          <MathFormattedText text={card.front} />
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[var(--color-border)]" />

                    {/* Answer / back */}
                    <div
                      onClick={() => isHidden && toggleAnswer(card.id)}
                      className={`p-4 bg-[var(--color-surface-2)] transition-colors ${
                        isHidden ? 'cursor-pointer hover:bg-[var(--color-surface-3)]' : ''
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wider text-[var(--color-know)] mb-1 font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Answer</span>
                          {!isHidden && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isBackSpeaking) {
                                  stopTTS()
                                } else {
                                  speak(card.back, backSpeechId)
                                }
                              }}
                              className={`p-1 rounded border transition-all ${
                                isBackSpeaking
                                  ? 'bg-blue-100 text-[#003bb3] border-blue-400 shadow-sm animate-pulse'
                                  : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-3)]'
                              }`}
                              title={isBackSpeaking ? "Stop read aloud" : "Read answer with neural speech & word highlight"}
                            >
                              {isBackSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                            </button>
                          )}
                        </div>
                        {isHidden && (
                          <span className="text-xs text-[var(--color-accent)] font-normal">
                            Click to reveal
                          </span>
                        )}
                      </div>

                      {isHidden ? (
                        <p className="text-sm text-transparent select-none blur-[6px]">
                          {card.back}
                        </p>
                      ) : (
                        <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line font-medium">
                          {isBackSpeaking ? (
                            <TTSHighlightedText
                              text={card.back}
                              isSpeaking={isBackSpeaking}
                              wordRange={currentWordRange}
                              fallbackComponent={<MathFormattedText text={card.back} />}
                            />
                          ) : (
                            <MathFormattedText text={card.back} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--color-text-muted)] text-sm">
            No cards found matching "{search}"
          </div>
        )}
      </div>

      {/* In-app HTML Confirmation Modal for Delete */}
      {confirmModal?.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="glass-panel rounded-2xl border border-[var(--color-border)] w-full max-w-sm p-6 cyber-border shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[var(--color-dontknow)]">
              <div className="p-2.5 rounded-xl bg-[var(--color-dontknow)]/15">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Delete {confirmModal.cardIds.length === 1 ? 'Card' : `${confirmModal.cardIds.length} Cards`}?
              </h3>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[var(--color-text-primary)]">{confirmModal.description}</span>? This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] text-sm font-medium hover:bg-[var(--color-surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-dontknow)] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
