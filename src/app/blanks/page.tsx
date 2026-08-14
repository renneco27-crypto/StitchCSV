'use client'

import { useState } from 'react'
import TopBar from '@/components/TopBar'
import PastePopup from '@/features/blanks/PastePopup'
import FillInTheBlanksUI from '@/features/blanks/FillInTheBlanksUI'
import { parseBlanks, TextToken } from '@/features/blanks/parseBlanks'
import { FileText, Plus } from 'lucide-react'

export default function BlanksPage() {
  const [tokens, setTokens] = useState<TextToken[]>([])
  const [isPastePopupOpen, setPastePopupOpen] = useState(false)

  const handleGenerate = (text: string) => {
    const generatedTokens = parseBlanks(text, 0.15) // 15% blanks
    setTokens(generatedTokens)
    setPastePopupOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <TopBar title="Fill-in-the-Blanks" />
      
      <div className="flex-1 flex flex-col">
        {tokens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center mb-6 shadow-sm">
              <FileText size={32} className="text-[var(--color-accent)] opacity-80" />
            </div>
            <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
              Document Mode
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-8 leading-relaxed">
              Paste a large block of text or notes. We will automatically parse it and hide random keywords to turn it into an interactive fill-in-the-blanks study tool.
            </p>
            <button
              onClick={() => setPastePopupOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              <Plus size={18} />
              Paste Document
            </button>
          </div>
        ) : (
          <FillInTheBlanksUI 
            tokens={tokens} 
            onReset={() => setTokens([])} 
          />
        )}
      </div>

      <PastePopup
        isOpen={isPastePopupOpen}
        onClose={() => setPastePopupOpen(false)}
        onSubmit={handleGenerate}
      />
    </div>
  )
}
