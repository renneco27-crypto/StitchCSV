'use client'

import { ArrowLeft } from 'lucide-react'

interface TopBarProps {
  title: string
  onBack?: () => void
  rightSlot?: React.ReactNode
}

export default function TopBar({ title, onBack, rightSlot }: TopBarProps) {
  return (
    <header className="h-14 bg-white/80 backdrop-blur-2xl border-b border-slate-300/80 px-4 flex items-center gap-3 sticky top-0 z-40 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-[#0052cc] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
          aria-label="Go back"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
          <span>Back</span>
        </button>
      )}
      <h1 className="text-sm font-black text-slate-950 truncate flex-1">
        {title}
      </h1>
      {rightSlot && <div className="flex items-center gap-1">{rightSlot}</div>}
    </header>
  )
}
