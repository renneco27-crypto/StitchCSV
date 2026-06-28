'use client'

import { useState } from 'react'
import { X, HelpCircle } from 'lucide-react'

import UploadZone from '@/features/upload/UploadZone'
import PastDecks from '@/features/upload/PastDecks'

const FORMATS = [
  {
    type: 'Multiple Choice',
    key: 'multiple_choice',
    description: 'One correct answer + 3 distractors',
    columns: 'front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3',
    example: `front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3
"What is H2O?","Water","Chemistry","Elements",,"multiple_choice","Water","Hydrogen","Oxygen","Carbon"
"What is NaCl?","Salt","Chemistry","Elements",,"multiple_choice","Salt","Sugar","Acid","Base"`,
  },
  {
    type: 'True / False',
    key: 'true_false',
    description: 'Statement with true/false answer. tf_answer: "true" if correct, "false" if incorrect. Optional explanation column for why it is true/false.',
    columns: 'front,back,chapter,subject,lesson,type,tf_answer,explanation',
    example: `front,back,chapter,subject,lesson,type,tf_answer,explanation
"Water boils at 100°C at sea level","","Physics","Phase Changes",,"true_false","true","Water boils at 100°C at standard atmospheric pressure, but boiling point decreases at higher altitudes."
"Gold is a liquid at room temperature","","Chemistry","Elements",,"true_false","false","Gold is a solid metal at room temperature; it melts at 1064°C."
"Iron is magnetic","","Physics","Magnetism",,"true_false","true","Iron is magnetic because its un-canceled atomic electron spins naturally align into microscopic pockets called magnetic domains."`,
  },
  {
    type: 'Enumeration',
    key: 'enumeration',
    description: 'List items (semicolon separated, lowercase). Use enum_items column for the answer items.',
    columns: 'front,back,chapter,subject,lesson,type,enum_items',
    example: `front,back,chapter,subject,lesson,type,enum_items
"List 3 states of matter","","Physics","States",,"enumeration","solid;liquid;gas"
"List 4 forces of nature","","Physics","Forces",,"enumeration","gravity;electromagnetism;strong nuclear;weak nuclear"`,
  },
  {
    type: 'Identification',
    key: 'identification',
    description: 'Definition → term (with optional variants)',
    columns: 'front,back,chapter,subject,lesson,type,id_answer,id_variants',
    example: `front,back,chapter,subject,lesson,type,id_answer,id_variants
"The study of matter and its changes","","Chemistry","General",,"identification","Chemistry","chemistry"
"The smallest unit of an element","","Chemistry","Structure",,"identification","Atom","atom"`,
  },
  {
    type: 'Flashcards Only (no quiz)',
    key: 'definition',
    description: 'Basic cards that auto-generate MC/ID quizzes',
    columns: 'front,back,chapter,subject,lesson,type',
    example: `front,back,chapter,subject,lesson,type
"What causes a rainbow?","Sunlight refracting through water droplets","Formation","Meteorology","Light","definition"
"ROY G BIV stands for","Red Orange Yellow Green Blue Indigo Violet","Colors","Meteorology","Spectrum","list"`,
  },
]

export default function Home() {
  const [showHelp, setShowHelp] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">StitchAI</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Turn notes into knowledge</p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
            aria-label="CSV format help"
          >
            <HelpCircle size={16} />
            <span>Format Help</span>
          </button>
        </div>

        <div className="mt-6">
          <UploadZone />
        </div>
        <div className="mt-10">
          <PastDecks />
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-10">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Format Reference</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-1 p-2 border-b border-[var(--color-border)] overflow-x-auto sticky top-[48px] bg-[var(--color-surface)] z-10">
              {FORMATS.map((f, i) => (
                <button
                  key={f.key}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === i
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {f.type}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {FORMATS[activeTab].description && (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {FORMATS[activeTab].description}
                  </p>
                )}
                <div className="bg-[var(--color-bg)] rounded-xl p-4 font-mono text-xs text-[var(--color-text-secondary)] overflow-x-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--color-text-muted)]">Required columns:</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{FORMATS[activeTab].columns}</span>
                  </div>
                  <pre className="whitespace-pre-wrap">{FORMATS[activeTab].example}</pre>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Tip: Use <kbd className="px-1.5 py-0.5 bg-[var(--color-surface-2)] rounded text-[10px] font-mono">&ldquo;quotes&rdquo;</kbd> for fields containing commas.
                  Type column is optional — defaults to <code className="px-1.5 py-0.5 bg-[var(--color-surface-2)] rounded text-[10px] font-mono">definition</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}