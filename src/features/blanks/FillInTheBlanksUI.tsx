'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, CheckCircle2, RotateCcw } from 'lucide-react'
import { TextToken } from './parseBlanks'
import confetti from 'canvas-confetti'

interface FillInTheBlanksUIProps {
  tokens: TextToken[]
  onReset: () => void
}

// Simple fuzzy match: normalize and check similarity
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}
function isMatch(spoken: string, expected: string): boolean {
  const a = normalize(spoken)
  const b = normalize(expected)
  if (!a || !b) return false
  if (a === b) return true
  // Allow 1-char edit distance for short words, 2 for longer
  const maxDist = b.length <= 5 ? 1 : 2
  return levenshtein(a, b) <= maxDist
}
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

export default function FillInTheBlanksUI({ tokens, onReset }: FillInTheBlanksUIProps) {
  // Only word tokens matter for tracking
  const wordTokens = tokens.filter(t => t.isWord)

  // cursor = index into wordTokens of the word we expect next
  const [cursor, setCursor] = useState(0)
  // which blank tokens are correctly answered
  const [correct, setCorrect] = useState<Set<string>>(new Set())
  // what the user filled in for each blank (shown inside blank)
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [hasWon, setHasWon] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const cursorRef = useRef(cursor)
  cursorRef.current = cursor

  const blankTokens = tokens.filter(t => t.isBlank)

  // Advance cursor past all non-blank words from a given position
  const skipNonBlanks = useCallback((from: number): number => {
    let i = from
    while (i < wordTokens.length && !wordTokens[i].isBlank) i++
    return i
  }, [wordTokens])

  // On mount, skip leading non-blank words
  useEffect(() => {
    setCursor(skipNonBlanks(0))
  }, [tokens, skipNonBlanks])

  const processWords = useCallback((spokenWords: string[]) => {
    let cur = cursorRef.current
    const newCorrect = new Set(correct)
    const newFilled = { ...filled }

    for (const word of spokenWords) {
      if (cur >= wordTokens.length) break
      const expected = wordTokens[cur]

      if (expected.isBlank) {
        if (isMatch(word, expected.text)) {
          newCorrect.add(expected.id)
          newFilled[expected.id] = expected.text // autocorrect to the correct answer
          cur++
          // skip non-blank words after this blank
          cur = skipNonBlanks(cur)
        }
        // if wrong, stay on same blank — user keeps trying
      } else {
        // non-blank: auto-advance if the word roughly matches OR just advance
        if (isMatch(word, expected.text)) {
          cur++
          cur = skipNonBlanks(cur) <= wordTokens.length ? skipNonBlanks(cur) : cur
        }
      }
    }

    setCorrect(newCorrect)
    setFilled(newFilled)
    setCursor(cur)

    // Win check
    const allBlanks = tokens.filter(t => t.isBlank)
    if (allBlanks.length > 0 && allBlanks.every(t => newCorrect.has(t.id)) && !hasWon) {
      setHasWon(true)
      confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } })
    }
  }, [correct, filled, wordTokens, tokens, skipNonBlanks, hasWon])

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'

    let lastProcessedIndex = 0

    r.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const words = event.results[i][0].transcript.trim().split(/\s+/)
          processWords(words)
          lastProcessedIndex = i + 1
        }
      }
    }

    r.onerror = () => setIsListening(false)
    r.onend = () => setIsListening(false)
    recognitionRef.current = r
    r.start()
    setIsListening(true)
  }, [processWords])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) stopListening()
    else startListening()
  }, [isListening, startListening, stopListening])

  const handleReset = () => {
    stopListening()
    setCursor(skipNonBlanks(0))
    setCorrect(new Set())
    setFilled({})
    setHasWon(false)
  }

  const currentBlankId = cursor < wordTokens.length && wordTokens[cursor].isBlank
    ? wordTokens[cursor].id
    : null

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto glass-panel rounded-2xl border border-[var(--color-border)] shadow-sm p-6 md:p-10 leading-[1.9] text-xl sm:text-lg text-[var(--color-text-primary)]">
          {tokens.map((token) => {
            if (!token.isWord) {
              // whitespace / punctuation — render as-is
              return <span key={token.id}>{token.text}</span>
            }

            if (token.isBlank) {
              const isCorrect = correct.has(token.id)
              const isCurrent = token.id === currentBlankId
              const answer = filled[token.id] || ''

              return (
                <span
                  key={token.id}
                  className={`
                    inline-flex items-center justify-center mx-1 px-3 py-0.5 rounded-lg
                    border-b-2 font-semibold min-w-[3rem] text-center transition-all duration-300
                    ${isCorrect
                      ? 'border-[var(--color-know)] text-[var(--color-know)] bg-[var(--color-know)]/15 scale-105'
                      : isCurrent
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10 animate-pulse'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-2)]'
                    }
                  `}
                >
                  {isCorrect ? (
                    <span className="flex items-center gap-1">
                      {answer} <CheckCircle2 size={14} className="inline" />
                    </span>
                  ) : isCurrent ? (
                    <span className="min-w-[2rem]"></span>
                  ) : (
                    <span className="text-[var(--color-border)]">{'_'.repeat(Math.max(3, token.text.length))}</span>
                  )}
                </span>
              )
            }

            // Regular non-blank word — dim if already passed
            const tokenWordIdx = wordTokens.findIndex(w => w.id === token.id)
            const isPassed = tokenWordIdx < cursor
            return (
              <span
                key={token.id}
                className={`transition-opacity duration-200 ${isPassed ? 'opacity-40' : 'opacity-100'}`}
              >
                {token.text}
              </span>
            )
          })}
        </div>

        {hasWon && (
          <div className="mt-6 text-center text-[var(--color-know)] font-semibold text-lg animate-bounce">
            🎉 All blanks filled correctly!
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-3 flex flex-col items-center gap-2.5">
        <div className="flex items-center justify-center gap-3 w-full max-w-md">
          <button
            onClick={toggleListening}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-base font-semibold transition-all flex-1 min-w-0 ${
              isListening
                ? 'bg-[var(--color-know)]/20 text-[var(--color-know)] shadow-[0_0_12px_var(--color-know)]/30'
                : 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
            }`}
          >
            {isListening
              ? <Mic size={20} className="animate-pulse shrink-0" />
              : <MicOff size={20} className="shrink-0" />}
            <span className="truncate">{isListening ? 'Reading… keep going!' : 'Read Aloud'}</span>
          </button>
          <button
            onClick={handleReset}
            title="Restart from beginning"
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] transition-colors"
          >
            <RotateCcw size={16} /> Restart
          </button>
        </div>

        {isListening && (
          <span className="text-xs text-[var(--color-text-muted)] text-center">
            {currentBlankId ? 'Say the highlighted word' : 'Read the sentence aloud'}
          </span>
        )}

        <button
          onClick={onReset}
          className="w-full max-w-md px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] transition-colors"
        >
          New Text
        </button>
      </div>
    </div>
  )
}
