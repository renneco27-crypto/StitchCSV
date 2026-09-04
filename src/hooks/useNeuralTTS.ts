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
  isPlaying: boolean
  isPaused: boolean
  currentSpeakingId: string | null
  currentWordRange: { start: number; end: number } | null
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

export function useNeuralTTS(): UseNeuralTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null)
  const [currentWordRange, setCurrentWordRange] = useState<{ start: number; end: number } | null>(null)
  const [supported, setSupported] = useState(false)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const activeTextRef = useRef<string>('')

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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isPlayingRef.current = false
    currentSpeakingIdRef.current = null
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentSpeakingId(null)
    setCurrentWordRange(null)
    utteranceRef.current = null
    activeTextRef.current = ''
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

  const speak = useCallback(
    (rawText: string, id: string = 'default', options?: SpeakOptions) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      // If user clicks the currently speaking button, stop it
      if (isPlayingRef.current && currentSpeakingIdRef.current === id) {
        stop()
        return
      }

      // Cancel any ongoing speech before starting new one
      window.speechSynthesis.cancel()

      // Clean speech text (strip markdown symbols like **, *, _, #, math brackets for smooth pronunciation)
      const cleanText = rawText
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[#•]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (!cleanText) return

      activeTextRef.current = cleanText
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utteranceRef.current = utterance

      // Assign best neural voice
      const bestVoice = getBestNeuralVoice(voicesRef.current)
      if (bestVoice) {
        utterance.voice = bestVoice
      }
      utterance.rate = 1.0
      utterance.pitch = 1.0

      // Word boundary event for synchronized word highlighting
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex
          let charLength = event.charLength

          // If browser doesn't provide charLength (e.g. some webkit builds), approximate word length
          if (!charLength || charLength <= 0) {
            const remaining = cleanText.slice(charIndex)
            const match = remaining.match(/^[\w'-]+/)
            charLength = match ? match[0].length : 1
          }

          setCurrentWordRange({
            start: charIndex,
            end: charIndex + charLength,
          })
        }
      }

      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
        setCurrentSpeakingId(id)
        setCurrentWordRange(null)
      }

      const onEndCallback = options?.onEnd

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentSpeakingId(null)
        setCurrentWordRange(null)
        utteranceRef.current = null
        if (onEndCallback) {
          onEndCallback()
        }
      }

      utterance.onerror = (e) => {
        // 'interrupted' is normal when user cancels or triggers another utterance
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('SpeechSynthesis error:', e)
        }
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentSpeakingId(null)
        setCurrentWordRange(null)
        utteranceRef.current = null
      }

      window.speechSynthesis.speak(utterance)
    },
    [isPlaying, currentSpeakingId, stop]
  )

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    currentSpeakingId,
    currentWordRange,
    supported,
  }
}
