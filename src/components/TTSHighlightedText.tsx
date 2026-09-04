'use client'

import React from 'react'

interface WordToken {
  text: string
  start: number
  end: number
}

/**
 * Tokenizes text into words and punctuation while keeping track of character indices
 * for clean highlighting during TTS speech playback.
 */
export function tokenizeTextWithOffsets(rawText: string): WordToken[] {
  const tokens: WordToken[] = []
  // Matches consecutive non-whitespace characters or individual words
  const regex = /\S+/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(rawText)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return tokens
}

interface TTSHighlightedTextProps {
  text: string
  isSpeaking: boolean
  wordRange: { start: number; end: number } | null
  className?: string
  fallbackComponent?: React.ReactNode
}

/**
 * Renders text with a sleek, glowing rounded bounding box highlight around the currently spoken word.
 * If not currently speaking or range is null, renders the normal text.
 */
export default function TTSHighlightedText({
  text,
  isSpeaking,
  wordRange,
  className = '',
  fallbackComponent,
}: TTSHighlightedTextProps) {
  if (!isSpeaking || !wordRange) {
    if (fallbackComponent) return <>{fallbackComponent}</>
    return <span className={className}>{text}</span>
  }

  // Tokenize text into words with offset ranges
  const tokens = tokenizeTextWithOffsets(text)

  return (
    <span className={`inline ${className}`}>
      {tokens.map((token, index) => {
        // Check if this token intersects with the spoken char range
        const isSpoken =
          wordRange.start < token.end && wordRange.end > token.start

        return (
          <React.Fragment key={index}>
            {index > 0 && ' '}
            <span
              className={`inline-block px-1 py-0.5 rounded-md border transition-colors duration-150 align-baseline ${
                isSpoken
                  ? 'bg-blue-100/95 text-[#002d99] border-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.35)] ring-1 ring-blue-400/40'
                  : 'border-transparent bg-transparent text-inherit'
              }`}
              style={{
                boxSizing: 'border-box',
                lineHeight: 'inherit',
              }}
            >
              {token.text}
            </span>
          </React.Fragment>
        )
      })}
    </span>
  )
}
