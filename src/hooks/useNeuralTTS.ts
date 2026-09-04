'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface WordBoundary {
  word: string
  charIndex: number
  charLength: number
}

export interface SpeakOptions {
  onEnd?: () => void
  rate?: number
}

export interface UseNeuralTTSReturn {
  speak: (text: string, id?: string, options?: SpeakOptions) => void
  stop: () => void
  pause: () => void
  resume: () => void
  skipToNextSentence: () => void
  skipToPrevSentence: () => void
  setSpeechRate: (rate: number) => void
  speechRate: number
  isPlaying: boolean
  isPaused: boolean
  currentSpeakingId: string | null
  currentWordRange: { start: number; end: number } | null
  currentSentenceIndex: number
  totalSentences: number
  supported: boolean
}

/**
 * Prioritizes local low-latency voices (localService === true) for instant, 0ms playback,
 * preventing the 1-3 second cloud WebSocket buffering delay caused by Edge online voices.
 */
function getBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null

  // 1. First priority: FAST local voices (localService === true) - zero network lag!
  const localEnglish = voices.filter((v) => v.lang.startsWith('en') && v.localService)
  if (localEnglish.length > 0) {
    // If there is an installed local natural or neural voice
    const localNatural = localEnglish.find(
      (v) => v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Enhanced')
    )
    if (localNatural) return localNatural

    // Windows local voices: David, Zira, Mark
    const david = localEnglish.find((v) => v.name.includes('David'))
    if (david) return david
    const zira = localEnglish.find((v) => v.name.includes('Zira'))
    if (zira) return zira
    const mark = localEnglish.find((v) => v.name.includes('Mark'))
    if (mark) return mark

    return localEnglish[0]
  }

  // 2. Second priority: Any local voice
  const anyLocal = voices.filter((v) => v.localService)
  if (anyLocal.length > 0) return anyLocal[0]

  // 3. Fallback: Edge / Bing Online voices (if no local voices installed)
  const msNatural = voices.filter(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
  )
  if (msNatural.length > 0) {
    const aria = msNatural.find((v) => v.name.includes('Aria'))
    if (aria) return aria
    const guy = msNatural.find((v) => v.name.includes('Guy'))
    if (guy) return guy
    return msNatural[0]
  }

  const english = voices.filter((v) => v.lang.startsWith('en'))
  if (english.length > 0) return english[0]

  return voices[0] || null
}

export interface SentenceSegment {
  rawSentence: string
  cleanSentence: string
  rawStart: number
  rawEnd: number
}

function cleanSpeechText(str: string): string {
  return str
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses raw text into concise sentences and clauses with character start/end offsets
 * mapped directly to the raw text for zero-latency streaming synthesis and precise highlighting.
 */
export function splitIntoSentences(rawText: string): SentenceSegment[] {
  if (!rawText || !rawText.trim()) return []

  const result: SentenceSegment[] = []

  // Regex splitting by sentence punctuation (. ! ? \n) as well as clause delimiters (, ; : —)
  // for long compound sentences so each audio chunk is short and speaks instantly.
  const regex = /[^.!?\n\r,;:—]+(?:[.!?\n\r,;:—]+|$)/g
  let m: RegExpExecArray | null

  while ((m = regex.exec(rawText)) !== null) {
    const full = m[0]
    const trimmed = full.trim()
    if (trimmed) {
      const leadOffset = full.indexOf(trimmed)
      const rawStart = m.index + (leadOffset >= 0 ? leadOffset : 0)
      const rawEnd = rawStart + trimmed.length
      const cleanSentence = cleanSpeechText(trimmed)
      if (cleanSentence) {
        result.push({
          rawSentence: trimmed,
          cleanSentence,
          rawStart,
          rawEnd,
        })
      }
    }
  }

  if (result.length === 0 && rawText.trim()) {
    const trimmed = rawText.trim()
    const leadOffset = rawText.indexOf(trimmed)
    const rawStart = leadOffset >= 0 ? leadOffset : 0
    result.push({
      rawSentence: trimmed,
      cleanSentence: cleanSpeechText(trimmed),
      rawStart,
      rawEnd: rawStart + trimmed.length,
    })
  }

  return result
}

export function useNeuralTTS(): UseNeuralTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null)
  const [currentWordRange, setCurrentWordRange] = useState<{ start: number; end: number } | null>(null)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [totalSentences, setTotalSentences] = useState(0)
  const [speechRate, setSpeechRate] = useState<number>(1.25)
  const [supported, setSupported] = useState(false)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const activeSessionIdRef = useRef<number>(0)
  const sentencesRef = useRef<SentenceSegment[]>([])
  const currentSentenceIdxRef = useRef<number>(0)
  const activeOptionsRef = useRef<SpeakOptions | undefined>(undefined)
  const activeSpeakingIdRef = useRef<string | null>(null)

  // Initialize and load available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false)
      return
    }

    setSupported(true)

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices()
      voicesRef.current = available
    }

    updateVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const isPlayingRef = useRef(false)
  const currentSpeakingIdRef = useRef<string | null>(null)

  // Keep refs updated with state
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentSpeakingIdRef.current = currentSpeakingId
  }, [currentSpeakingId])

  const stop = useCallback(() => {
    activeSessionIdRef.current += 1
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isPlayingRef.current = false
    currentSpeakingIdRef.current = null
    activeSpeakingIdRef.current = null
    sentencesRef.current = []
    currentSentenceIdxRef.current = 0
    utteranceRef.current = null

    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSpeakingId(null)
    setCurrentWordRange(null)
    setCurrentSentenceIndex(0)
    setTotalSentences(0)
  }, [])

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPlayingRef.current) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [isPaused])

  const playSentenceAtIndex = useCallback((index: number, sessionId: number) => {
    if (sessionId !== activeSessionIdRef.current) return
    const sentences = sentencesRef.current
    if (index >= sentences.length) {
      // Completed all sentences
      isPlayingRef.current = false
      currentSpeakingIdRef.current = null
      activeSpeakingIdRef.current = null
      utteranceRef.current = null

      setIsPlaying(false)
      setIsPaused(false)
      setCurrentSpeakingId(null)
      setCurrentWordRange(null)

      const onEnd = activeOptionsRef.current?.onEnd
      if (onEnd) {
        onEnd()
      }
      return
    }

    const currentSeg = sentences[index]
    currentSentenceIdxRef.current = index
    setCurrentSentenceIndex(index)

    const utterance = new SpeechSynthesisUtterance(currentSeg.cleanSentence)
    utteranceRef.current = utterance

    const bestVoice = getBestVoice(voicesRef.current)
    if (bestVoice) {
      utterance.voice = bestVoice
    }
    const effectiveRate = activeOptionsRef.current?.rate ?? speechRate ?? 1.25
    utterance.rate = Math.max(0.5, Math.min(2.5, effectiveRate))
    utterance.pitch = 1.0

    // Synchronized word boundary mapped back into rawText character offsets
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (sessionId !== activeSessionIdRef.current) return
      if (event.name === 'word') {
        const charIndex = event.charIndex
        let charLength = event.charLength

        if (!charLength || charLength <= 0) {
          const remaining = currentSeg.cleanSentence.slice(charIndex)
          const match = remaining.match(/^[\w'-]+/)
          charLength = match ? match[0].length : 1
        }

        const spokenWord = currentSeg.cleanSentence.slice(charIndex, charIndex + charLength).trim()
        let wordPos = -1
        if (spokenWord) {
          const searchStart = Math.max(0, charIndex - 12)
          wordPos = currentSeg.rawSentence.indexOf(spokenWord, searchStart)
          if (wordPos === -1) {
            wordPos = currentSeg.rawSentence.indexOf(spokenWord)
          }
        }

        const finalStart = currentSeg.rawStart + (wordPos !== -1 ? wordPos : charIndex)
        const finalEnd = finalStart + (spokenWord ? spokenWord.length : charLength)

        setCurrentWordRange({
          start: finalStart,
          end: finalEnd,
        })
      }
    }

    utterance.onstart = () => {
      if (sessionId !== activeSessionIdRef.current) return
      setIsPlaying(true)
      setIsPaused(false)
      setCurrentSpeakingId(activeSpeakingIdRef.current)
    }

    utterance.onend = () => {
      if (sessionId !== activeSessionIdRef.current) return
      // Play next sentence sequentially without buffering delay
      setTimeout(() => {
        playSentenceAtIndex(index + 1, sessionId)
      }, 5)
    }

    utterance.onerror = (e) => {
      if (sessionId !== activeSessionIdRef.current) return
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis sentence error:', e)
        playSentenceAtIndex(index + 1, sessionId)
      }
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const speak = useCallback(
    (rawText: string, id: string = 'default', options?: SpeakOptions) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      // If user clicks the currently speaking button, stop it
      if (isPlayingRef.current && currentSpeakingIdRef.current === id) {
        stop()
        return
      }

      // Stop any prior speech and cancel
      stop()

      const sentences = splitIntoSentences(rawText)
      if (sentences.length === 0) return

      activeSessionIdRef.current += 1
      const thisSessionId = activeSessionIdRef.current

      sentencesRef.current = sentences
      currentSentenceIdxRef.current = 0
      activeOptionsRef.current = options
      activeSpeakingIdRef.current = id

      setTotalSentences(sentences.length)
      setCurrentSentenceIndex(0)
      setIsPlaying(true)
      setIsPaused(false)
      setCurrentSpeakingId(id)

      playSentenceAtIndex(0, thisSessionId)
    },
    [stop, playSentenceAtIndex]
  )

  const skipToNextSentence = useCallback(() => {
    if (!isPlayingRef.current) return
    const nextIdx = currentSentenceIdxRef.current + 1
    if (nextIdx < sentencesRef.current.length) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      playSentenceAtIndex(nextIdx, activeSessionIdRef.current)
    } else {
      stop()
    }
  }, [playSentenceAtIndex, stop])

  const skipToPrevSentence = useCallback(() => {
    if (!isPlayingRef.current) return
    const prevIdx = Math.max(0, currentSentenceIdxRef.current - 1)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    playSentenceAtIndex(prevIdx, activeSessionIdRef.current)
  }, [playSentenceAtIndex])

  return {
    speak,
    stop,
    pause,
    resume,
    skipToNextSentence,
    skipToPrevSentence,
    setSpeechRate,
    speechRate,
    isPlaying,
    isPaused,
    currentSpeakingId,
    currentWordRange,
    currentSentenceIndex,
    totalSentences,
    supported,
  }
}
