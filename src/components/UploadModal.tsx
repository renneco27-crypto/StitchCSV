'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Sparkles, X, CheckCircle2, XCircle, Bot } from 'lucide-react'
import { handleUpload, UploadError } from '@/features/upload/uploadHandler'
import { useToastStore } from '@/store/toastStore'
import { useUIStore } from '@/store/uiStore'

type UploadState = 'idle' | 'dragover' | 'processing' | 'success' | 'error'

const CLAUDE_PROMPT_TEMPLATE = `Analyze the entire reference material.
Identify every distinct topic and subtopic.
Extract every examinable fact, including definitions, formulas, theories, processes, rules, exceptions, examples, and conditions.
Merge duplicate facts but NEVER omit unique information.
Automatically determine how many flashcards are required based on the amount of unique examinable information. Do not create filler questions and do not skip important concepts.
Before finishing, internally verify that every major topic is represented.
If the output reaches the response limit, stop only after completing the current CSV row and output exactly: CONTINUE_FROM_NEXT_ROW. When I reply with "Continue", resume immediately from the next unfinished row.

1. UNIFIED COLUMN SCHEMA
The header must be exactly this, word for word, no substitutions:
front,back,chapter,subject,lesson,type,mc_correct,mc_distractor1,mc_distractor2,mc_distractor3,tf_answer,explanation,enum_items,id_answer,id_variants

There are exactly 15 columns. Do NOT add extra columns or rename headers.
Every single row must have exactly 15 comma-separated values. Unused columns must be left empty but still present as commas.
chapter = column 3, subject = column 4, lesson = column 5, type = column 6.

2. QUIZ TYPE PARAMETERS & ROW STRUCTURAL RULES
Apply the correct comma-padding so optional values always map to the correct absolute column index. For ALL types except "definition", the back column (column 2) must be empty "". Only "definition" type uses the back column.
definition: Populate ONLY the front and back fields. The front column contains the description; the back column contains the term.
multiple_choice: Populate mc_correct and exactly three distractors.
COLUMN COUNT RULE: After mc_distractor3 (column 10), there must be exactly 5 empty columns to reach column 15.
Correct Format: "Question","","Ch","Subj","Les",multiple_choice,Correct,D1,D2,D3,,,,,
true_false: Populate tf_answer with "true" or "false" and explanation with a brief justification.
enumeration: Populate enum_items only. Include exactly 6 empty commas after the type value.
Example: "enumeration",,,,,,,"item1;item2",,
identification: Populate id_answer and id_variants only. Include exactly 8 empty commas after the type value.
Example: "identification",,,,,,,,,"Answer","variant1;variant2"

3. SYNTAX & FORMATTING CONSTRAINTS
Output ONLY the raw plain-text CSV. Do NOT output Markdown, do not explain anything, and do not number the rows.
Wrap any field containing spaces, commas, punctuation, or quotes inside double quotes.
Enumeration items must be inside ONE cell, lowercase, separated with semicolons.
Identification variants must be lowercase and separated with semicolons.
MANDATORY TYPE DISTRIBUTION RULE: You MUST generate cards of ALL five types. Aim for a balanced mix. Every major fact must be covered by at least one multiple_choice, true_false, or identification card in addition to its definition card.

TOPIC: [INSERT TOPIC]
CHAPTER: [INSERT CHAPTER]
SUBJECT: [INSERT SUBJECT]
LESSON: [INSERT LESSON]
REFERENCE STUDY NOTES: [PASTE YOUR STUDY NOTES HERE]

Tell me how many CSVs of the chapter you have created (e.g., 1/5). If I say "disregard and go to the next", delete from your memory any prior text I've said.`

export default function UploadModal() {
  const router = useRouter()
  const isOpen = useUIStore((s) => s.isUploadModalOpen)
  const tab = useUIStore((s) => s.uploadModalTab)
  const setTab = useUIStore((s) => s.setUploadModalTab)
  const closeUploadModal = useUIStore((s) => s.closeUploadModal)
  const addToast = useToastStore((s) => s.addToast)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deckName, setDeckName] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setDeckName('')
    setState('idle')
    setProgress('')
    setError('')
    setSelectedFile(null)
    setPasteText('')
    setTextLoading(false)
  }

  const handleClose = () => {
    closeUploadModal()
    reset()
  }

  const processFile = async (file: File) => {
    const name = deckName.trim()
    if (!name) {
      setState('error')
      setError('Please enter a deck name first')
      setSelectedFile(file)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setState('error')
      setError('File too large (max 20MB)')
      setSelectedFile(file)
      return
    }

    setState('processing')
    setProgress('')
    setError('')
    setSelectedFile(file)

    try {
      const id = await handleUpload(file, setProgress, name)
      addToast('Deck created!', 'success')
      handleClose()
      router.push('/study/' + id)
    } catch (err) {
      const message = err instanceof UploadError ? err.message : 'Upload failed'
      setState('error')
      setError(message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setState('idle')
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleRetry = () => {
    if (selectedFile) {
      processFile(selectedFile)
    } else {
      setState('idle')
    }
  }

  const handleGenerate = async () => {
    const name = deckName.trim()
    if (!name) {
      addToast('Please enter a deck name first', 'error')
      return
    }
    if (!pasteText.trim()) return
    setTextLoading(true)
    try {
      const file = new File([pasteText], 'notes.txt', { type: 'text/plain' })
      const id = await handleUpload(file, undefined, name)
      addToast('Deck created!', 'success')
      handleClose()
      router.push('/study/' + id)
    } catch (err) {
      const message = err instanceof UploadError ? err.message : 'Failed to generate deck'
      addToast(message, 'error')
    } finally {
      setTextLoading(false)
    }
  }

  const handleCopyToClaude = async () => {
    if (!pasteText.trim()) {
      addToast('Paste your study notes first', 'error')
      return
    }
    const prompt = CLAUDE_PROMPT_TEMPLATE
      .replace('[INSERT TOPIC]', deckName.trim() || '[INSERT TOPIC]')
      .replace('[PASTE YOUR STUDY NOTES HERE]', pasteText.trim())
    try {
      await navigator.clipboard.writeText(prompt)
      addToast('Prompt copied — paste it in Claude', 'success')
      window.open('https://claude.ai/', '_blank', 'noopener,noreferrer')
    } catch (err) {
      addToast('Failed to copy prompt', 'error')
    }
  }

  const tabButton = (t: 'file' | 'text', label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors squishy-btn ${
        tab === t
          ? 'bg-[var(--color-accent)] text-white cyber-glow'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="glass-panel rounded-2xl border border-[var(--color-border)] w-full max-w-lg cyber-border flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-['Playfair_Display'] font-bold text-[var(--color-text-primary)]">
            Create Deck
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          {tabButton('text', 'Paste Text')}
          {tabButton('file', 'Upload File')}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck name (required)"
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.18)] transition-shadow"
          />

          {tab === 'file' ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setState('dragover') }}
              onDragLeave={() => setState('idle')}
              className={`mt-4 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                state === 'dragover'
                  ? 'border-[var(--color-border-neon)] bg-[var(--color-accent-soft)] cyber-glow'
                  : 'border-[var(--color-border-strong)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />

              {state === 'idle' || state === 'dragover' ? (
                <>
                  <Upload size={40} className="mx-auto text-[var(--color-accent)]" />
                  <p className="text-base font-medium mt-3 text-[var(--color-text-primary)]">
                    {state === 'dragover' ? 'Drop to upload' : 'Drop your file here'}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    CSV, DOCX, or TXT &mdash; Word docs &amp; text files are converted with AI
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[var(--color-accent)] text-white px-5 py-2.5 rounded-xl font-medium mt-3 hover:opacity-90 transition-opacity squishy-btn cyber-glow-hover"
                  >
                    Choose file
                  </button>
                </>
              ) : state === 'processing' ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="animate-spin text-[var(--color-accent)]" />
                  <p className="text-sm text-[var(--color-text-muted)] animate-pulse">{progress || 'Processing…'}</p>
                </div>
              ) : state === 'success' ? (
                <>
                  <CheckCircle2 size={40} className="mx-auto text-[var(--color-know)]" />
                  <p className="text-base font-medium mt-3 text-[var(--color-text-primary)]">Deck ready!</p>
                </>
              ) : (
                <>
                  <XCircle size={40} className="mx-auto text-[var(--color-dontknow)]" />
                  <p className="text-sm text-[var(--color-dontknow)] mt-3">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="bg-[var(--color-accent)] text-white px-5 py-2.5 rounded-xl font-medium mt-3 hover:opacity-90 transition-opacity squishy-btn cyber-glow-hover"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste study notes here — the AI will extract flashcards from your text"
                rows={7}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.18)] transition-shadow resize-none"
              />
              <button
                onClick={handleCopyToClaude}
                disabled={!pasteText.trim()}
                className="mt-3 flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] px-6 py-3 rounded-xl font-medium border border-[var(--color-border)] hover:border-[var(--color-border-neon)] disabled:opacity-50 transition-colors w-full justify-center squishy-btn"
              >
                <Bot size={16} />
                Copy to Claude
              </button>
              <button
                onClick={handleGenerate}
                disabled={textLoading || !pasteText.trim() || !deckName.trim()}
                className="mt-3 flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity w-full justify-center squishy-btn cyber-glow-hover"
              >
                {textLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {textLoading ? 'Generating deck…' : 'Generate deck'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}