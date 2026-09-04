'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface WordBoundary {
  word: string
  charIndex: number
  charLength: number
}

export interface SpeakOptions {
  onEnd?: () => void
}

export interface UseNeuralTTSReturn {
  speak: (text: string, id?: string, options?: SpeakOptions) => void
  stop: () => void
  pause: () => void
  resume: () => void
  skipToNextSentence: () => void
  skipToPrevSentence: () => void
  isPlaying: boolean
  isPaused: boolean
  currentSpeakingId: string | null
  currentWordRange: { start: number; end: number } | null
  currentSentenceIndex: number
  totalSentences: number
  supported: boolean
}

/**
 * Finds the best neural voice available in the browser.
 * Prioritizes Microsoft Natural / Bing Neural voices (e.g. Aria, Guy, Jenny, Ryan)
 * which are native in Edge and Windows, then falls back to Google / Apple / system English voices.
 */
function getBestNeuralVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null

  // 1. First priority: Microsoft Edge / Bing Natural Neural voices
  const msNaturalVoices = voices.filter(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
  )
  if (msNaturalVoices.length > 0) {
    // Prefer Aria or Guy or Jenny if available
    const aria = msNaturalVoices.find((v) => v.name.includes('Aria'))
    if (aria) return aria
    const guy = msNaturalVoices.find((v) => v.name.includes('Guy'))
    if (guy) return guy
    const jenny = msNaturalVoices.find((v) => v.name.includes('Jenny'))
    if (jenny) return jenny
    return msNaturalVoices[0]
  }

  // 2. Second priority: Google or Apple Neural/Enhanced US English
  const enhancedVoices = voices.filter(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Enhanced') || v.name.includes('Premium'))
  )
  if (enhancedVoices.length > 0) {
    return enhancedVoices[0]
  }

  // 3. Fallback: Any English voice
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'))
  if (englishVoices.length > 0) {
    return englishVoices[0]
  }

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
 * Parses raw text into individual sentences with character start/end offsets
 * mapped directly to the raw text for zero-latency streaming synthesis and precise highlighting.
 */
export function splitIntoSentences(rawText: string): SentenceSegment[] {
  if (!rawText || !rawText.trim()) return []

  const result: SentenceSegment[] = []

  // Prefer native Intl.Segmenter if supported by browser environment
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'sentence' })
      const iter = segmenter.segment(rawText)
      for (const seg of iter) {
        const str = seg.segment as string
        const trimmed = str.trim()
        if (trimmed) {
          const leadOffset = str.indexOf(trimmed)
          const rawStart = seg.index + (leadOffset >= 0 ? leadOffset : 0)
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
      if (result.length > 0) return result
    } catch {
      // Fallback to regex below
    }
  }

  // Regex fallback: split by sentence delimiters (. ! ? or newlines)
  const regex = /[^.!?\n\r]+(?:[.!?]+|\n+|$)/g
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

    const bestVoice = getBestNeuralVoice(voicesRef.current)
    if (bestVoice) {
      utterance.voice = bestVoice
    }
    utterance.rate = 1.0
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
      playSentenceAtIndex(index + 1, sessionId)
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
    isPlaying,
    isPaused,
    currentSpeakingId,
    currentWordRange,
    currentSentenceIndex,
    totalSentences,
    supported,
  }
}
