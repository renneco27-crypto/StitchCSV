'use client'

import { CheckCircle, XCircle } from 'lucide-react'
import type { AnswerState } from '@/lib/zodSchemas'

interface TrueFalseButtonsProps {
  answerState: AnswerState
  userAnswer: boolean | null
  correctAnswer: boolean
  onAnswer: (answer: boolean) => void
}

export default function TrueFalseButtons({
  answerState,
  userAnswer,
  correctAnswer,
  onAnswer,
}: TrueFalseButtonsProps) {
  const disabled = answerState !== 'unanswered'

  const trueStyle = (() => {
    if (disabled) {
      if (userAnswer === true && correctAnswer === true) return 'ring-4 ring-white/50 scale-105'
      if (userAnswer === true && correctAnswer !== true) return 'animate-shake opacity-80'
      if (correctAnswer === true) return 'ring-4 ring-white/50'
      return 'opacity-40'
    }
    return ''
  })()

  const falseStyle = (() => {
    if (disabled) {
      if (userAnswer === false && correctAnswer === false) return 'ring-4 ring-white/50 scale-105'
      if (userAnswer === false && correctAnswer !== false) return 'animate-shake opacity-80'
      if (correctAnswer === false) return 'ring-4 ring-white/50'
      return 'opacity-40'
    }
    return ''
  })()

  return (
    <div className="flex gap-3">
      <button
        onClick={() => onAnswer(true)}
        disabled={disabled}
        className={`flex-1 flex flex-col items-center gap-2 rounded-xl p-5 font-semibold text-white transition-all bg-[var(--color-know)] disabled:cursor-not-allowed ${trueStyle}`}
      >
        <CheckCircle size={28} />
        <span>True</span>
      </button>
      <button
        onClick={() => onAnswer(false)}
        disabled={disabled}
        className={`flex-1 flex flex-col items-center gap-2 rounded-xl p-5 font-semibold text-white transition-all bg-[var(--color-dontknow)] disabled:cursor-not-allowed ${falseStyle}`}
      >
        <XCircle size={28} />
        <span>False</span>
      </button>
    </div>
  )
}
