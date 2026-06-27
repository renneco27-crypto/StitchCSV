'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { handleUpload } from './uploadHandler'
import { useToastStore } from '@/store/toastStore'

type UploadZoneState = 'idle' | 'dragover' | 'processing' | 'success' | 'error'

export default function UploadZone() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadZoneState>('idle')
  const [progressStep, setProgressStep] = useState('')
  const [deckId, setDeckId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const processFile = async (file: File) => {
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadState('error')
      setErrorMessage('File too large (max 20MB)')
      setSelectedFile(file)
      return
    }

    setUploadState('processing')
    setProgressStep('')
    setErrorMessage('')
    setSelectedFile(file)

    try {
      const id = await handleUpload(file, setProgressStep)
      setDeckId(id)
      setUploadState('success')
      addToast('Deck created successfully!', 'success')
    } catch (err) {
      setUploadState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
      addToast('Upload failed', 'error')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setUploadState('idle')
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setUploadState('dragover')
  }

  const handleDragLeave = () => {
    setUploadState('idle')
  }

  const handleRetry = () => {
    if (selectedFile) {
      processFile(selectedFile)
    } else {
      setUploadState('idle')
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
        uploadState === 'dragover'
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border-strong)]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {uploadState === 'idle' || uploadState === 'dragover' ? (
        <>
          <Upload size={48} className="mx-auto text-[var(--color-text-muted)]" />
          <p className="text-xl font-medium mt-4 text-[var(--color-text-primary)]">
            {uploadState === 'dragover' ? 'Drop to upload' : 'Drop your CSV here'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            CSV with columns: front, back, chapter, subject, lesson, type
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium mt-4 hover:opacity-90 transition-opacity"
          >
            Choose CSV file
          </button>
        </>
      ) : uploadState === 'processing' ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-text-muted)] animate-pulse">
            {progressStep || 'Processing…'}
          </p>
        </div>
      ) : uploadState === 'success' ? (
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
          <p className="text-sm text-[var(--color-dontknow)] mt-4">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="bg-[var(--color-accent)] text-white px-6 py-3 rounded-xl font-medium mt-4 hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </>
      )}
    </div>
  )
}
