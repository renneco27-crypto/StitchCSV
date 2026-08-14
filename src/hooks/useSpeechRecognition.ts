import { useState, useEffect, useCallback, useRef } from 'react'

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<any>(null)

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  // Auto-off after 2s of silence
  useEffect(() => {
    if (isListening) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        stopListening()
      }, 2000)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [transcript, interimTranscript, isListening, stopListening])

  const SpeechRecognitionClass = typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null

  useEffect(() => {
    if (!SpeechRecognitionClass) setSupported(false)
  }, [SpeechRecognitionClass])

  // Creates a fresh recognition instance to avoid first-word doubling on reuse
  const createRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) return null
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (final) setTranscript((prev) => prev + final)
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      if (event.error !== 'no-speech') setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    return recognition
  }, [SpeechRecognitionClass])

  const startListening = useCallback(() => {
    if (!isListening) {
      try {
        // Create a fresh instance each time to prevent first-word doubling
        const recognition = createRecognition()
        if (!recognition) return
        recognitionRef.current = recognition
        setTranscript('')
        setInterimTranscript('')
        recognition.start()
        setIsListening(true)
      } catch (e) {
        console.error('Could not start speech recognition:', e)
      }
    }
  }, [isListening, createRecognition])



  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

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
