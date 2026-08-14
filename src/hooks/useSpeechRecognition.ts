import { useState, useCallback, useRef, useEffect } from 'react'

const getSRClass = () =>
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null

function buildRecognition(
  SRC: any,
  onFinal: (text: string) => void,
  onInterim: (text: string) => void,
  onEnd: () => void,
  onError: (err: string) => void
) {
  const r = new SRC()
  r.continuous = true
  r.interimResults = true
  r.lang = 'en-US'
  r.maxAlternatives = 1

  r.onresult = (event: any) => {
    let final = ''
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript
      if (event.results[i].isFinal) final += t + ' '
      else interim += t
    }
    if (final) onFinal(final)
    if (interim !== undefined) onInterim(interim)
  }

  r.onerror = (e: any) => onError(e.error)
  r.onend = onEnd

  return r
}

// Continuous mode re-delivers the same finalized segment, so strip any tail of the
// previously appended text that the new final starts with (e.g. "jeremy bentham" twice).
function dedupeOverlap(prev: string, next: string): string {
  const prevWords = prev.trim() ? prev.trim().split(/\s+/) : []
  const nextWords = next.trim() ? next.trim().split(/\s+/) : []
  if (!nextWords.length) return ''
  if (!prevWords.length) return next.trim()
  for (let n = Math.min(prevWords.length, nextWords.length); n >= 1; n--) {
    if (prevWords.slice(-n).join(' ') === nextWords.slice(0, n).join(' ')) {
      return nextWords.slice(n).join(' ')
    }
  }
  return next.trim()
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [supported] = useState(() => !!getSRClass())

  const activeRef = useRef<any>(null)     // currently running instance
  const warmRef = useRef<any>(null)       // pre-warmed next instance
  const userStoppedRef = useRef(false)    // did the user explicitly stop?
  const isListeningRef = useRef(false)
  const lastFinalRef = useRef('')         // last finalized text appended (dedupe helper)
  isListeningRef.current = isListening

  // Pre-warm a new recognition instance in the background so it starts instantly
  const prewarm = useCallback(() => {
    const SRC = getSRClass()
    if (!SRC || warmRef.current) return
    try {
      const r = buildRecognition(SRC, () => {}, () => {}, () => {}, () => {})
      warmRef.current = r
    } catch (_) {}
  }, [])

  const maxDurationTimerRef = useRef<any>(null)

  useEffect(() => {
    prewarm()
    return () => {
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current)
    }
  }, [prewarm])

  const startInstance = useCallback(() => {
    const SRC = getSRClass()
    if (!SRC) return

    // Use pre-warmed instance if available, otherwise create fresh
    const r = warmRef.current ?? buildRecognition(SRC, () => {}, () => {}, () => {}, () => {})
    warmRef.current = null

    r.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim += t
      }
      if (final) {
        const deduped = dedupeOverlap(lastFinalRef.current, final)
        if (deduped) setTranscript(prev => prev + deduped + ' ')
        lastFinalRef.current = final.trim()
      }
      setInterimTranscript(interim)
    }

    r.onerror = (e: any) => {
      // 'no-speech' is normal — ignore and let onend handle restart
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        userStoppedRef.current = true
        setIsListening(false)
      }
    }

    r.onend = () => {
      // If user didn't stop and we're still supposed to be listening, restart immediately
      if (!userStoppedRef.current && isListeningRef.current) {
        // Immediately fire a fresh instance — no delay
        try {
          startInstance()
        } catch (_) {}
      } else {
        setIsListening(false)
        setInterimTranscript('')
        // Pre-warm next instance for instant start next time
        setTimeout(prewarm, 200)
      }
    }

    try {
      r.start()
      activeRef.current = r
    } catch (e: any) {
      // 'already started' — ignore
      if (e?.message?.includes('already started')) return
      userStoppedRef.current = true
      setIsListening(false)
    }
  }, [prewarm])

  const stopListening = useCallback(() => {
    userStoppedRef.current = true
    setIsListening(false)
    setInterimTranscript('')
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }
    try { activeRef.current?.stop() } catch (_) {}
    activeRef.current = null
  }, [])

  const startListening = useCallback(() => {
    if (isListeningRef.current) return
    userStoppedRef.current = false
    setTranscript('')
    setInterimTranscript('')
    lastFinalRef.current = ''
    setIsListening(true)
    startInstance()
    // Cap a single session at 20s — silence no longer stops it, so bound mic usage
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current)
    maxDurationTimerRef.current = setTimeout(() => {
      if (isListeningRef.current) stopListening()
    }, 20000)
  }, [startInstance, stopListening])

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) stopListening()
    else startListening()
  }, [startListening, stopListening])

  return {
    isListening,
    transcript,
    interimTranscript,
    supported,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  }
}
