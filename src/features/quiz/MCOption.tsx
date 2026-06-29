'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

type MCOptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'reveal'

interface MCOptionProps {
  label: string
  text: string
  state: MCOptionState
  onClick: () => void
  disabled: boolean
}

const stateStyles: Record<MCOptionState, string> = {
  default:
    'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]',
  selected:
    'bg-[var(--color-accent-soft)] border-[var(--color-accent)]',
  correct:
    'bg-[var(--color-know-soft)] border-[var(--color-know)]',
  wrong:
    'bg-[var(--color-dontknow-soft)] border-[var(--color-dontknow)]',
  reveal:
    'bg-[var(--color-know-soft)] border-[var(--color-know)]',
}

export default function MCOption({
  label,
  text,
  state,
  onClick,
  disabled,
}: MCOptionProps) {
  const showIcon = state === 'correct' || state === 'reveal' || state === 'wrong'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl p-4 flex items-center gap-3 border-2 transition-all duration-200 text-left ${
        stateStyles[state]
      } ${disabled ? 'pointer-events-none' : ''}`}
    >
      <span className="w-7 h-7 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-xs font-medium flex-shrink-0">
        {label}
      </span>
      <span className="flex-1 text-sm">{text}</span>
      {showIcon && state === 'correct' && (
        <CheckCircle2 size={20} className="text-[var(--color-know)] flex-shrink-0" />
      )}
      {showIcon && state === 'reveal' && (
        <CheckCircle2 size={20} className="text-[var(--color-know)] flex-shrink-0" />
      )}
      {state === 'wrong' && (
        <XCircle size={20} className="text-[var(--color-dontknow)] flex-shrink-0" />
      )}
    </button>
  )
}
