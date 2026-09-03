'use client'

import React, { useState } from 'react'

const NON_FRACTION_WORDS = new Set(['and/or', 'true/false', 'yes/no', 'w/o', 'either/or', 'n/a', 'c/o', 'km/h', 'm/s', 'mph'])

/**
 * Parses fractions, superscripts (^), and subscripts (_):
 * - 2/3 -> styled stacked fraction
 * - (2^3) -> (2<sup>3</sup>)
 * - (a+b)/(c-d) -> styled stacked fraction with parsed content
 */
export function formatMathString(text: string): (string | React.ReactElement)[] {
  if (!text) return []

  // Check for fractions:
  // 1. Explicit parenthesized fractions: ((a+b)/(c+d)) or (a+b)/(c+d)
  // 2. Numeric / Simple variable fractions: \b(-?\d+)\/(\d+)\b or \b([a-zA-Z0-9^_+]+)\/([a-zA-Z0-9^_+]+)\b
  const fracPattern = /(\b\d+\b|\([^)]+\)|[a-zA-Z0-9^_+]+)\s*\/\s*(\b\d+\b|\([^)]+\)|[a-zA-Z0-9^_+]+)/g

  const elements: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIdx = 0

  while ((match = fracPattern.exec(text)) !== null) {
    const fullMatch = match[0].trim().toLowerCase()
    
    // Skip words like and/or, true/false, etc.
    if (NON_FRACTION_WORDS.has(fullMatch) || fullMatch.includes('http') || fullMatch.includes('//')) {
      continue
    }

    // Skip date-like patterns like 12/25/2024
    const precedingChar = match.index > 0 ? text[match.index - 1] : ''
    const followingChar = match.index + match[0].length < text.length ? text[match.index + match[0].length] : ''
    if (precedingChar === '/' || followingChar === '/') {
      continue
    }

    const matchIndex = match.index
    if (matchIndex > lastIndex) {
      elements.push(...formatSubSup(text.substring(lastIndex, matchIndex), `pre-${keyIdx++}`))
    }

    const rawNum = match[1].replace(/^\((.+)\)$/, '$1').trim()
    const rawDenom = match[2].replace(/^\((.+)\)$/, '$1').trim()

    elements.push(
      <span
        key={`frac-${keyIdx++}`}
        className="inline-flex flex-col text-center align-middle mx-1 text-[0.88em] leading-tight select-text inline-block"
        style={{ verticalAlign: 'middle' }}
      >
        <span className="border-b border-[var(--color-border-strong)] pb-[1px] px-1 font-semibold text-[var(--color-text-primary)] leading-none text-center">
          {formatSubSup(rawNum, `num-${keyIdx++}`)}
        </span>
        <span className="pt-[1px] px-1 font-semibold text-[var(--color-text-primary)] leading-none text-center">
          {formatSubSup(rawDenom, `denom-${keyIdx++}`)}
        </span>
      </span>
    )

    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < text.length) {
    elements.push(...formatSubSup(text.substring(lastIndex), `post-${keyIdx++}`))
  }

  return elements
}

function formatSubSup(text: string, prefix: string): (string | React.ReactElement)[] {
  if (!text) return []

  const pattern = /(\^|_)(?:\(([^)]+)\)|([a-zA-Z0-9+\-−.]+))/g
  const elements: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index

    if (matchIndex > lastIndex) {
      elements.push(text.substring(lastIndex, matchIndex))
    }

    const operator = match[1] // '^' or '_'
    const content = match[2] !== undefined ? match[2] : match[3]

    if (operator === '^') {
      elements.push(
        <sup
          key={`${prefix}-sup-${idx++}`}
          className="text-[0.72em] font-semibold text-[var(--color-accent)] leading-none ml-[0.5px]"
        >
          {content}
        </sup>
      )
    } else if (operator === '_') {
      elements.push(
        <sub
          key={`${prefix}-sub-${idx++}`}
          className="text-[0.72em] font-semibold text-[var(--color-accent)] leading-none ml-[0.5px]"
        >
          {content}
        </sub>
      )
    }

    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex))
  }

  return elements
}

interface MathFormattedTextProps {
  text: string
  className?: string
  hideBold?: boolean
}

function MaskedClozeText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false)

  if (revealed) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation()
          setRevealed(false)
        }}
        className="font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1 py-0.5 rounded cursor-pointer transition-colors"
        title="Click to hide"
      >
        {formatMathString(text)}
      </span>
    )
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        setRevealed(true)
      }}
      className="inline-block px-2 py-0.5 rounded bg-[var(--color-surface-3)] text-transparent select-none blur-[5px] hover:blur-none hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-all cursor-pointer font-bold align-baseline mx-0.5 shadow-sm"
      title="Click or hover to reveal keyword"
    >
      <span className="inline-block">{formatMathString(text)}</span>
    </span>
  )
}

export default function MathFormattedText({
  text,
  className = '',
  hideBold = false,
}: MathFormattedTextProps) {
  if (!text) return null

  // Check for bold markdown **bold text** or <b>bold text</b>
  const boldPattern = /\*\*([^*]+)\*\*|<b>([^<]+)<\/b>/g

  if (!boldPattern.test(text)) {
    const formatted = formatMathString(text)
    return <span className={`inline-block ${className}`}>{formatted}</span>
  }

  boldPattern.lastIndex = 0
  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let partIdx = 0

  while ((match = boldPattern.exec(text)) !== null) {
    const matchIndex = match.index
    if (matchIndex > lastIndex) {
      const normalChunk = text.substring(lastIndex, matchIndex)
      parts.push(
        <React.Fragment key={`norm-${partIdx++}`}>
          {formatMathString(normalChunk)}
        </React.Fragment>
      )
    }

    const boldContent = (match[1] || match[2] || '').trim()

    if (hideBold) {
      parts.push(
        <MaskedClozeText key={`cloze-${partIdx++}`} text={boldContent} />
      )
    } else {
      parts.push(
        <strong
          key={`bold-${partIdx++}`}
          className="font-bold text-[var(--color-text-primary)]"
        >
          {formatMathString(boldContent)}
        </strong>
      )
    }

    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < text.length) {
    const remainingChunk = text.substring(lastIndex)
    parts.push(
      <React.Fragment key={`norm-${partIdx++}`}>
        {formatMathString(remainingChunk)}
      </React.Fragment>
    )
  }

  return <span className={`inline-block ${className}`}>{parts}</span>
}
