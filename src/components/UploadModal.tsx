'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Sparkles, X, CheckCircle2, XCircle } from 'lucide-react'
import { handleUpload, UploadError } from '@/features/upload/uploadHandler'
import { useToastStore } from '@/store/toastStore'
import { useUIStore } from '@/store/uiStore'

type UploadState = 'idle' | 'dragover' | 'processing' | 'success' | 'error'

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
          {tabButton('file', 'Upload File')}
          {tabButton('text', 'Paste Text')}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck name (required)"
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.2)] transition-shadow"
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
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[0_0_10px_rgba(255,45,133,0.2)] transition-shadow resize-none"
              />
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