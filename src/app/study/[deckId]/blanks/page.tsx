'use client'

import { useState, useEffect, use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TopBar from '@/components/TopBar'
import PastePopup from '@/features/blanks/PastePopup'
import FillInTheBlanksUI from '@/features/blanks/FillInTheBlanksUI'
import { parseBlanks, TextToken } from '@/features/blanks/parseBlanks'
import { FileText, Plus, List, Trash2, ArrowLeft } from 'lucide-react'
import { getDeckBlanks, createDeckBlank, deleteDeckBlank, DeckBlank } from '@/features/blanks/deckBlanksApi'
import { getDeck } from '@/db/deckRepository'
import type { Deck } from '@/lib/zodSchemas'

function BlanksContent({ deckId }: { deckId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialBlankId = searchParams.get('blankId')

  const [deck, setDeck] = useState<Deck | null>(null)
  const [savedBlanks, setSavedBlanks] = useState<DeckBlank[]>([])
  const [activeBlank, setActiveBlank] = useState<DeckBlank | null>(null)
  const [tokens, setTokens] = useState<TextToken[]>([])
  const [isPastePopupOpen, setPastePopupOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const d = await getDeck(deckId)
      if (d) setDeck(d)
      
      const blanks = await getDeckBlanks(deckId)
      setSavedBlanks(blanks)
      
      if (initialBlankId) {
        const target = blanks.find(b => b.id === initialBlankId)
        if (target) {
          setActiveBlank(target)
          setTokens(parseBlanks(target.text_content))
        }
      } else if (blanks.length > 0) {
        // Auto-load the most recent blank instead of showing the create popup
        setActiveBlank(blanks[0])
        setTokens(parseBlanks(blanks[0].text_content))
      }
      
      setIsLoading(false)
    }
    loadData()
  }, [deckId, initialBlankId])

  const handleGenerateAndSave = async (title: string, text: string) => {
    const newBlank = await createDeckBlank(deckId, title, text)
    if (newBlank) {
      setSavedBlanks(prev => [newBlank, ...prev])
      handleSelectBlank(newBlank)
      window.dispatchEvent(new CustomEvent('blanks-updated'))
    } else {
      // Fallback if saving fails or not logged in, just run it locally
      const generatedTokens = parseBlanks(text)
      setTokens(generatedTokens)
      setActiveBlank({ id: 'temp', deck_id: deckId, user_id: null, title, text_content: text, created_at: '' })
    }
    setPastePopupOpen(false)
  }

  const handleSelectBlank = (blank: DeckBlank) => {
    setActiveBlank(blank)
    const generatedTokens = parseBlanks(blank.text_content)
    setTokens(generatedTokens)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const success = await deleteDeckBlank(id)
    if (success) {
      setSavedBlanks(prev => prev.filter(b => b.id !== id))
      if (activeBlank?.id === id) {
        setActiveBlank(null)
        setTokens([])
      }
      window.dispatchEvent(new CustomEvent('blanks-updated'))
    }
  }

  return (
    <div className="h-[calc(100dvh_-_57px)] lg:h-[100dvh] flex flex-col overflow-hidden bg-[var(--color-bg)]">
      <TopBar 
        title={deck ? `${deck.title} - Blanks` : 'Fill-in-the-Blanks'} 
        onBack={() => router.push(`/study/${deckId}`)}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPastePopupOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New</span>
            </button>
            {activeBlank && activeBlank.id !== 'temp' && (
              <button
                onClick={(e) => {
                  if (window.confirm('Are you sure you want to delete this saved blank?')) {
                    handleDelete(e, activeBlank.id)
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-dontknow)] hover:bg-[var(--color-dontknow)]/10 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        }
      />
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {!activeBlank || tokens.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto h-full">
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center mb-6 shadow-sm">
                <FileText size={32} className="text-[var(--color-accent)] opacity-80" />
              </div>
              <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
                Deck Blanks
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed">
                Select a saved blank from the global sidebar, or paste a new document to practice fill-in-the-blanks.
              </p>
              <button
                onClick={() => setPastePopupOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <Plus size={18} />
                Create New Blanks
              </button>
            </div>
          ) : (
            <FillInTheBlanksUI 
              tokens={tokens} 
              onReset={() => {
                setActiveBlank(null)
                setTokens([])
              }} 
            />
          )}
        </div>
      </div>

      <PastePopup 
        isOpen={isPastePopupOpen}
        onClose={() => setPastePopupOpen(false)}
        onSubmit={handleGenerateAndSave}
      />
    </div>
  )
}

export default function DeckBlanksPage({ params }: { params: Promise<{ deckId: string }> }) {
  const resolvedParams = use(params)
  
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[var(--color-text-secondary)] font-medium">Loading Blanks...</p>
        </div>
      </div>
    }>
      <BlanksContent deckId={resolvedParams.deckId} />
    </Suspense>
  )
}
