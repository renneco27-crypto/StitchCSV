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
      className="glass-card rounded-2xl p-5 text-left transition-all hover:border-[#0052cc] glass-card-hover disabled:opacity-40 disabled:pointer-events-none group flex flex-col items-start gap-2.5"
    >
      <div
        className="flex items-center justify-center w-11 h-11 rounded-xl shadow-xs transition-transform group-hover:scale-105 border border-slate-300/60"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <Icon size={22} strokeWidth={2.4} />
      </div>
      <div>
        <span className="text-sm font-black text-slate-950 group-hover:text-[#0052cc] transition-colors block">
          {label}
        </span>
        <span className="text-xs font-bold text-slate-600 mt-0.5 block leading-relaxed">{description}</span>
      </div>
      <span className="text-xs font-black mt-auto pt-1" style={{ color }}>
        {count}
      </span>
    </button>
  )
}
