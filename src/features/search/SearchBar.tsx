'use client'

import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

export default function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search cards, decks, and folders…"
        autoFocus
        className="w-full rounded-2xl border border-slate-200 pl-11 pr-11 py-3 text-sm bg-white focus:outline-none focus:border-[#0052cc] focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 text-slate-800 shadow-sm transition-all"
      />
      {value.length > 0 && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
