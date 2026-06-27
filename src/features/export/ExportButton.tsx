'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportDeckToDOCX } from './exportToDOCX'
import { useToastStore } from '@/store/toastStore'

interface ExportButtonProps {
  deckId: string
  deckTitle: string
  variant?: 'icon' | 'full'
}

export default function ExportButton({ deckId, deckTitle, variant = 'icon' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const handleExport = async () => {
    setLoading(true)
    try {
      await exportDeckToDOCX(deckId, deckTitle)
    } catch {
      addToast('Export failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleExport}
        disabled={loading}
        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
        aria-label="Export deck as DOCX"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
      </button>
    )
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full rounded-xl border border-[var(--color-border)] py-3 font-medium text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-40"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      Export DOCX
    </button>
  )
}
