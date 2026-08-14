'use client'

import { Star, Mic, MicOff } from 'lucide-react'
import type { Card } from '@/lib/zodSchemas'
import StatBadge from '@/components/StatBadge'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useState, useEffect } from 'react'

interface FlashcardDeckProps {
  card: Card
  isFlipped: boolean
  animationClass: 'none' | 'slide-right' | 'slide-left' | 'slide-in'
  onFlip: () => void
  onVerify?: (answer: string) => Promise<{ correct: boolean, isEvaluated: boolean }>
}

export default function FlashcardDeck({
  card,
  isFlipped,
  animationClass,
  onFlip,
  onVerify
}: FlashcardDeckProps) {
  const animClass =
    animationClass === 'none' ? '' : animationClass

  const statusColor =
    card.status === 'new'
      ? 'new'
      : card.status === 'learning'
        ? 'mastered'
        : 'know'

  const { isListening, transcript, interimTranscript, toggleListening, setTranscript } = useSpeechRecognition()
  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrectState, setIsCorrectState] = useState<boolean | null>(null)

  // Sync STT transcript with input
  useEffect(() => {
    if (transcript || interimTranscript) {
      setUserAnswer((transcript + interimTranscript).trim())
    }
  }, [transcript, interimTranscript])

  // Reset answer when card changes
  useEffect(() => {
    setUserAnswer('')
    setTranscript('')
    setIsCorrectState(null)
  }, [card.id, setTranscript])

  // Auto-verify debounce
  useEffect(() => {
    if (!userAnswer || isCorrectState === true || !onVerify) return
    const timeout = setTimeout(async () => {
      const res = await onVerify(userAnswer)
      if (res.isEvaluated) {
        setIsCorrectState(res.correct)
      }
    }, 800)
    return () => clearTimeout(timeout)
  }, [userAnswer, isCorrectState, onVerify])

  return (
    <div
      className={`w-full ${animClass}`}
      style={{ perspective: '1000px' }}
    >
      <div
        className="w-full transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] grid cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div
          className={`col-start-1 row-start-1 min-h-[22rem] md:min-h-[26rem] h-full glass-panel rounded-2xl border ${isCorrectState === true ? 'border-[var(--color-know)] shadow-[0_0_15px_var(--color-know)]' : isCorrectState === false ? 'border-[var(--color-dontknow)] shadow-[0_0_15px_var(--color-dontknow)]' : 'border-[var(--color-border)] shadow-lg'} p-6 flex flex-col transition-all duration-300`}
          style={{ backfaceVisibility: 'hidden' }}
          onClick={onFlip}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              {card.chapter}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < card.mastery ? 'fill-[var(--color-mastered)] text-[var(--color-mastered)]' : 'text-[var(--color-text-muted)]'}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="font-['Playfair_Display'] text-xl sm:text-2xl md:text-3xl text-center text-[var(--color-text-primary)] break-words">
              {card.front}
            </p>
          </div>
          
          <div className="interactive-area mt-2 w-full flex flex-col items-center gap-4 relative">
            <input
              type="text"
              className="w-full max-w-sm text-center bg-[var(--color-surface-2)] border-b-2 border-transparent border-b-[var(--color-border)] px-4 py-2 text-lg font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-b-[var(--color-accent)] transition-colors"
              placeholder="Type answer here..."
              value={userAnswer}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                setUserAnswer(e.target.value)
                setTranscript(e.target.value) // fix sync issue when deleting
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleListening()
              }}
              className={`p-4 rounded-full transition-all shadow-md ${
                isListening 
                  ? 'bg-[var(--color-know)]/20 text-[var(--color-know)] scale-110 animate-pulse' 
                  : 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:scale-105'
              }`}
              title={isListening ? "Stop listening" : "Start dictating"}
            >
              {isListening ? <Mic size={28} /> : <MicOff size={28} />}
            </button>
            <div className="flex flex-col items-center mt-1 h-8">
               <span className="text-xs text-[var(--color-text-muted)] h-4">
                {isListening ? 'Listening...' : ''}
              </span>
              <p className="text-xs text-[var(--color-text-muted)] text-center cursor-pointer hover:text-[var(--color-accent)] transition-colors mt-1" onClick={onFlip}>
                Tap here or outside to reveal answer ↕
              </p>
            </div>
          </div>
        </div>

        {/* Back face */}
        <div
          className="col-start-1 row-start-1 min-h-[22rem] md:min-h-[26rem] h-full glass-panel rounded-2xl border border-[var(--color-border)] shadow-lg p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          onClick={onFlip}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              {card.chapter}
            </span>
            <StatBadge label={card.status} value="" color={statusColor} />
          </div>
          <div className="flex-1 flex items-center justify-center flex-col gap-3 py-4">
            <p className="text-lg sm:text-xl font-medium text-center text-[var(--color-text-primary)] break-words">
              {card.back}
            </p>
            {card.type === 'formula' && (
              <>
                <hr className="w-full border-[var(--color-border)]" />
                <p className="font-mono text-sm text-[var(--color-text-muted)]">
                  {card.back}
                </p>
              </>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            ↩ Tap to flip back
          </p>
        </div>
      </div>
    </div>
  )
}
