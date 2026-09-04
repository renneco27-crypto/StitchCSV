'use client'

import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface ModeCardProps {
  icon: LucideIcon
  label: string
  description: string
  count: string
  color: string
  href: string
  disabled?: boolean
}

export default function ModeCard({
  icon: Icon,
  label,
  description,
  count,
  color,
  href,
  disabled = false,
}: ModeCardProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => !disabled && router.push(href)}
      disabled={disabled}
      className="flex flex-col items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-blue-300 hover:shadow-md disabled:opacity-40 disabled:pointer-events-none group"
    >
      <div
        className="flex items-center justify-center w-11 h-11 rounded-xl shadow-inner transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon size={22} />
      </div>
      <div>
        <span className="text-sm font-bold text-slate-800 group-hover:text-[#0052cc] transition-colors block">
          {label}
        </span>
        <span className="text-xs text-slate-500 mt-0.5 block leading-relaxed">{description}</span>
      </div>
      <span className="text-xs font-bold mt-auto pt-1" style={{ color }}>
        {count}
      </span>
    </button>
  )
}
