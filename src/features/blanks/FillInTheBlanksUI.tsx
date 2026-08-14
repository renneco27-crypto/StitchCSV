'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, CheckCircle2, XCircle } from 'lucide-react'
import { TextToken } from './parseBlanks'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { evaluateAnswer } from '@/app/actions/evaluateAnswer'
import confetti from 'canvas-confetti'

interface FillInTheBlanksUIProps {
  tokens: TextToken[]
  onReset: () => void
}

export default function FillInTheBlanksUI({ tokens, onReset }: FillInTheBlanksUIProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [focusedTokenId, setFocusedTokenId] = useState<string | null>(null)
  
  const { isListening, transcript, interimTranscript, toggleListening, setTranscript } = useSpeechRecognition()
  const prevTranscriptRef = useRef(transcript)

  // Sync STT with focused blank
  useEffect(() => {
    if (focusedTokenId && (transcript || interimTranscript)) {
      const fullText = (transcript + interimTranscript).trim()
      if (fullText) {
        // Only take the newly added words for the focused input
        // A simple approach is just setting the input to the latest transcript chunk
        setAnswers(prev => ({ ...prev, [focusedTokenId]: fullText }))
      }
    }
  }, [transcript, interimTranscript, focusedTokenId])

  // Clear transcript when changing focus so it doesn't leak to the next input
  useEffect(() => {
    setTranscript('')
  }, [focusedTokenId, setTranscript])

  const [hasWon, setHasWon] = useState(false)

  // Auto-verify debounce
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const newScores = { ...scores }
      let changed = false
      
      let allCorrect = true
      let totalBlanks = 0

      for (const token of tokens) {
        if (token.isBlank) {
          totalBlanks++
          const val = answers[token.id]
          // If they typed something and we haven't scored it yet, verify it
          if (val && scores[token.id] === undefined) {
             const { ratio } = await evaluateAnswer(val, token.text)
             newScores[token.id] = ratio
             changed = true
          }
          if ((newScores[token.id] || 0) < 85) {
             allCorrect = false
          }
        }
      }
      if (changed) setScores(newScores)

      if (totalBlanks > 0 && allCorrect && !hasWon) {
        setHasWon(true)
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
    }, 800)
    return () => clearTimeout(timeout)
  }, [answers, scores, tokens, hasWon])

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto glass-panel rounded-2xl border border-[var(--color-border)] shadow-sm p-6 md:p-10 leading-relaxed text-lg text-[var(--color-text-primary)]">
          {tokens.map((token, i) => {
            if (!token.isBlank) {
              return <span key={token.id}>{token.text}</span>
            }

            const val = answers[token.id] || ''
            const score = scores[token.id]
            const isEvaluated = score !== undefined
            const isCorrect = isEvaluated && score >= 85
            
            return (
              <span key={token.id} className="relative inline-block mx-1">
                <input
                  type="text"
                  value={val}
                  onFocus={() => setFocusedTokenId(token.id)}
                  onChange={(e) => {
                    setAnswers(prev => ({ ...prev, [token.id]: e.target.value }))
                    // Clear score if they start typing again
                    if (isEvaluated) {
                      setScores(prev => {
                        const newScores = { ...prev }
                        delete newScores[token.id]
                        return newScores
                      })
                    }
                  }}
                  className={`
                    w-32 md:w-40 px-2 py-1 text-center bg-[var(--color-surface-2)] 
                    border-b-2 outline-none font-medium text-[var(--color-accent)]
                    transition-colors
                    ${isEvaluated 
                      ? isCorrect 
                        ? 'border-[var(--color-know)] text-[var(--color-know)] bg-[var(--color-know)]/10' 
                        : 'border-[var(--color-dontknow)] text-[var(--color-dontknow)] bg-[var(--color-dontknow)]/10'
                      : 'border-[var(--color-accent)]/50 focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-3)]'
                    }
                  `}
                  placeholder="?"
                />
                {isEvaluated && (
                  <span className="absolute -top-3 -right-3 bg-[var(--color-surface)] rounded-full shadow-sm">
                    {isCorrect ? (
                      <CheckCircle2 size={16} className="text-[var(--color-know)]" />
                    ) : (
                      <XCircle size={16} className="text-[var(--color-dontknow)]" />
                    )}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      </div>

      <div className="sticky bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isListening
                ? 'bg-[var(--color-know)]/20 text-[var(--color-know)]'
                : 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
            }`}
          >
            {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
            {isListening ? 'Listening...' : 'Dictate Answers'}
          </button>
          {isListening && !focusedTokenId && (
            <span className="text-xs text-[var(--color-dontknow)] font-medium">
              Click a blank to dictate into it!
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onReset}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] transition-colors"
          >
            Paste New Text
          </button>
        </div>
      </div>
    </div>
  )
}
