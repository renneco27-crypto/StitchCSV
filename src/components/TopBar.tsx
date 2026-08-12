'use client'

import { ArrowLeft } from 'lucide-react'

interface TopBarProps {
  title: string
  onBack?: () => void
  rightSlot?: React.ReactNode
}

export default function TopBar({ title, onBack, rightSlot }: TopBarProps) {
  return (
    <header className="h-14 glass-panel border-b border-[var(--color-border)] px-4 flex items-center gap-3 sticky top-[57px] lg:top-0 z-40">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      )}
      <h1 className="text-base font-medium truncate max-w-[200px] flex-1">
        {title}
      </h1>
      {rightSlot && <div className="flex items-center gap-1">{rightSlot}</div>}
    </header>
  )
}
