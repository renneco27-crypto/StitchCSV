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
      className="flex flex-col items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-all hover:border-[var(--color-accent)] disabled:opacity-40 disabled:pointer-events-none"
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon size={20} />
      </div>
      <span className="text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </span>
      <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
      <span className="text-xs font-medium" style={{ color }}>
        {count}
      </span>
    </button>
  )
}
