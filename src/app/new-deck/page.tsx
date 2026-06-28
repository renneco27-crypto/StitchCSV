'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { handleUpload } from '@/features/upload/uploadHandler'
import { useToastStore } from '@/store/toastStore'

type UploadState = 'idle' | 'dragover' | 'processing' | 'success' | 'error'

export default function NewDeckPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState('')
  const [deckId, setDeckId] = useState('')
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deckName, setDeckName] = useState('')

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
      setDeckId(id)
      setState('success')
      addToast('Deck created!', 'success')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
      addToast('Upload failed', 'error')
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-['DM_Serif_Display'] text-[var(--color-text-primary)]">
          New Deck
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Give your deck a name, then upload a CSV, DOCX, or TXT file
        </p>

        <input
          type="text"
          placeholder="Deck name (required)"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="mt-6 w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setState('dragover') }}
          onDragLeave={() => setState('idle')}
          className={`mt-4 rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
            state === 'dragover'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
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
              <Upload size={48} className="mx-auto text-[var(--color-text-muted)]" />
              <p className="text-xl font-medium mt-4 text-[var(--color-text-primary)]">
                {state === 'dragover' ? 'Drop to upload' : 'Drop your file here'}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                CSV, DOCX, or TXT &mdash; Word docs &amp; text files are converted with AI
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium mt-4 hover:opacity-90 transition-opacity"
              >
                Choose file
              </button>
            </>
          ) : state === 'processing' ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
              <p className="text-sm text-[var(--color-text-muted)] animate-pulse">{progress || 'Processing…'}</p>
            </div>
          ) : state === 'success' ? (
            <>
              <CheckCircle2 size={48} className="mx-auto text-[var(--color-know)]" />
              <p className="text-xl font-medium mt-4 text-[var(--color-text-primary)]">Deck ready!</p>
              <button
                onClick={() => router.push('/study/' + deckId)}
                className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium mt-4 hover:opacity-90 transition-opacity"
              >
                Open deck →
              </button>
            </>
          ) : (
            <>
              <XCircle size={48} className="mx-auto text-[var(--color-dontknow)]" />
              <p className="text-sm text-[var(--color-dontknow)] mt-4">{error}</p>
              <button
                onClick={() => selectedFile ? processFile(selectedFile) : setState('idle')}
                className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium mt-4 hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
