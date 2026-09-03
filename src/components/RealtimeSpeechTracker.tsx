'use client'

import React, { useMemo } from 'react'
import { alignSpokenWords, type SpeechTrackingResult } from '@/lib/speechTracker'
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

interface RealtimeSpeechTrackerProps {
  targetText: string
  spokenText: string
  isListening?: boolean
  className?: string
  showSummary?: boolean
}

export default function RealtimeSpeechTracker({
  targetText,
  spokenText,
  isListening = false,
  className = '',
  showSummary = true,
}: RealtimeSpeechTrackerProps) {
  const result: SpeechTrackingResult = useMemo(() => {
    return alignSpokenWords(targetText, spokenText)
  }, [targetText, spokenText])

  const hasStarted = spokenText.trim().length > 0

  return (
    <div className={`w-full flex flex-col gap-3.5 ${className}`}>
      {/* Real-time word display stream */}
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 p-3 sm:p-4 rounded-xl bg-[var(--color-surface-2)]/80 border border-[var(--color-border)] text-base sm:text-lg leading-relaxed text-center select-none min-h-[4.5rem]">
        {result.words.map((item, idx) => {
          if (item.status === 'correct') {
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all duration-200 animate-in fade-in zoom-in-95"
              >
                {item.targetWord}
              </span>
            )
          }

          if (item.status === 'wrong') {
            return (
              <span
                key={idx}
                className="inline-flex flex-col items-center group relative px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-400/30 text-rose-600 dark:text-rose-400 font-medium transition-all duration-200"
              >
                <span className="line-through decoration-rose-500/80 decoration-2">
                  {item.spokenWord || item.targetWord}
                </span>
                <span className="text-[10px] font-bold tracking-tight text-rose-500 dark:text-rose-300 leading-none mt-0.5">
                  ({item.targetWord})
                </span>
              </span>
            )
          }

          if (item.status === 'omitted') {
            return (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 line-through decoration-amber-500/70 font-normal opacity-75"
                title={`Omitted word: ${item.targetWord}`}
              >
                {item.targetWord}
              </span>
            )
          }

          if (item.status === 'active') {
            return (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold border-b-2 border-[var(--color-accent)] animate-pulse shadow-sm"
              >
                {item.targetWord}
              </span>
            )
          }

          // Pending
          return (
            <span
              key={idx}
              className="inline-block px-0.5 text-[var(--color-text-secondary)] opacity-60 transition-opacity"
            >
              {item.targetWord}
            </span>
          )
        })}
      </div>

      {/* Progress & Live Feedback Summary */}
      {showSummary && hasStarted && (
        <div className="flex items-center justify-between px-2 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={13} />
              {result.correctCount} correct
            </span>
            {(result.wrongCount > 0 || result.omittedCount > 0) && (
              <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                <AlertCircle size={13} />
                {result.wrongCount + result.omittedCount} error{result.wrongCount + result.omittedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-text-primary)]">
              {result.currentProgressPercent}%
            </span>
            {result.isComplete && (
              <span className="inline-flex items-center gap-0.5 text-xs text-[var(--color-accent)] font-semibold">
                <Sparkles size={12} /> Finished
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
