'use client'

import { Star, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import type { Card } from '@/lib/zodSchemas'
import StatBadge from '@/components/StatBadge'
import MathFormattedText from '@/components/MathFormattedText'
import TTSHighlightedText from '@/components/TTSHighlightedText'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useNeuralTTS } from '@/hooks/useNeuralTTS'
import { useState, useEffect } from 'react'

interface FlashcardDeckProps {
  card: Card
  isFlipped: boolean
  animationClass: 'none' | 'slide-right' | 'slide-left' | 'slide-in'
  onFlip: () => void
  onVerify?: (answer: string) => Promise<{ correct: boolean, isEvaluated: boolean }>
  onCardFinished?: () => void
  autoAdvance?: boolean
  onToggleAutoAdvance?: () => void
}

export default function FlashcardDeck({
  card,
  isFlipped,
  animationClass,
  onFlip,
  onVerify,
  onCardFinished,
  autoAdvance = false,
  onToggleAutoAdvance,
}: FlashcardDeckProps) {
  const animClass =
    animationClass === 'none' ? '' : animationClass

  const statusColor =
    card.status === 'new'
      ? 'new'
      : card.status === 'learning'
        ? 'mastered'
        : 'know'

  const { isListening, transcript, interimTranscript, toggleListening, stopListening, setTranscript } = useSpeechRecognition()
  const { speak, stop: stopTTS, isPlaying: isTTSPlaying, currentSpeakingId, currentWordRange } = useNeuralTTS()
  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrectState, setIsCorrectState] = useState<boolean | null>(null)

  // Stop mic and TTS when card changes or unmounts
  useEffect(() => {
    return () => { 
      stopListening()
      stopTTS()
    }
  }, [stopListening, stopTTS, card.id])

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
    stopTTS()

    if (autoAdvance) {
      const timer = setTimeout(() => {
        readWholeCard(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [card.id, setTranscript, stopTTS, autoAdvance])

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

  const frontSpeechId = `card-front-${card.id}`
  const backSpeechId = `card-back-${card.id}`
  const isFrontSpeaking = isTTSPlaying && currentSpeakingId === frontSpeechId
  const isBackSpeaking = isTTSPlaying && currentSpeakingId === backSpeechId

  const readWholeCard = (startFromBack = false) => {
    if (isTTSPlaying) {
      stopTTS()
      return
    }

    if (startFromBack) {
      speak(card.back, backSpeechId, {
        onEnd: () => {
          if (onCardFinished) {
            setTimeout(onCardFinished, 800)
          }
        }
      })
    } else {
      speak(card.front, frontSpeechId, {
        onEnd: () => {
          // Once front is finished, flip to back and read answer
          if (!isFlipped) {
            onFlip()
          }
          // Small pause before speaking answer for natural speech cadence
          setTimeout(() => {
            speak(card.back, backSpeechId, {
              onEnd: () => {
                if (onCardFinished) {
                  setTimeout(onCardFinished, 800)
                }
              }
            })
          }, 400)
        }
      })
    }
  }

  const isCardSpeaking = isFrontSpeaking || isBackSpeaking

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
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
              {card.chapter}
            </span>
            <div className="flex items-center gap-2">
              {onToggleAutoAdvance && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleAutoAdvance()
                  }}
                  className={`px-2 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    autoAdvance
                      ? 'bg-purple-100 text-purple-700 border-purple-400 shadow-sm'
                      : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-purple-600 hover:bg-[var(--color-surface-2)]'
                  }`}
                  title={autoAdvance ? "Auto read next card is ON" : "Auto read every card in sequence"}
                >
                  {autoAdvance ? 'Auto-Read: ON' : 'Read Deck'}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  readWholeCard(false)
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isCardSpeaking
                    ? 'bg-blue-100 text-[#003bb3] border-blue-400 shadow-sm animate-pulse'
                    : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]'
                }`}
                title={isCardSpeaking ? "Stop read aloud" : "Read this card: question, then flip to answer with word highlight"}
              >
                {isCardSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span className="hidden xs:inline">{isCardSpeaking ? 'Stop' : 'Read Card'}</span>
              </button>
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
          <div className="flex-1 overflow-auto py-4 flex items-center justify-center">
            <div className="font-['Playfair_Display'] text-xl sm:text-2xl md:text-3xl text-center text-[var(--color-text-primary)] break-words w-full">
              {isFrontSpeaking ? (
                <TTSHighlightedText
                  text={card.front}
                  isSpeaking={isFrontSpeaking}
                  wordRange={currentWordRange}
                  fallbackComponent={<MathFormattedText text={card.front} />}
                />
              ) : (
                <MathFormattedText text={card.front} />
              )}
            </div>
          </div>
          
          <div className="interactive-area mt-2 w-full flex flex-col items-center gap-4 relative" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="w-full max-w-sm text-center bg-[var(--color-surface-2)] border-b-2 border-transparent border-b-[var(--color-border)] px-4 py-2 text-lg font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-b-[var(--color-accent)] transition-colors"
              placeholder="Type answer or speak..."
              value={userAnswer}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                setUserAnswer(e.target.value)
                setTranscript(e.target.value)
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
              title={isListening ? "Stop listening" : "Start speaking"}
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
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
              {card.chapter}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  readWholeCard(true)
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isCardSpeaking
                    ? 'bg-blue-100 text-[#003bb3] border-blue-400 shadow-sm animate-pulse'
                    : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]'
                }`}
                title={isCardSpeaking ? "Stop read aloud" : "Read answer with neural speech & word highlight"}
              >
                {isCardSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span className="hidden xs:inline">{isCardSpeaking ? 'Stop' : 'Read All'}</span>
              </button>
              <StatBadge label={card.status} value="" color={statusColor} />
            </div>
          </div>
          <div className="flex-1 overflow-auto py-4 flex items-center justify-center flex-col gap-3">
            <div className="text-lg sm:text-xl font-medium text-center text-[var(--color-text-primary)] break-words w-full">
              {isBackSpeaking ? (
                <TTSHighlightedText
                  text={card.back}
                  isSpeaking={isBackSpeaking}
                  wordRange={currentWordRange}
                  fallbackComponent={<MathFormattedText text={card.back} />}
                />
              ) : (
                <MathFormattedText text={card.back} />
              )}
            </div>
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
