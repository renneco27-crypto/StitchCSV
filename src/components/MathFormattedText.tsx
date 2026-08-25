import React from 'react'

interface MathFormattedTextProps {
  text: string
  className?: string
}

/**
 * Parses math superscript (^) and subscript (_) notation:
 * - 2^3 -> 2<sup>3</sup>
 * - (2^3) -> (2<sup>3</sup>)
 * - x^(n+1) -> x<sup>n+1</sup>
 * - H_2O -> H<sub>2</sub>O
 * - x_1 -> x<sub>1</sub>
 * - x_(i+1) -> x<sub>i+1</sub>
 */
export function formatMathString(text: string): (string | React.ReactElement)[] {
  if (!text) return []

  // Regex to find ^exponent or _subscript patterns
  // Group 1: ^ or _
  // Group 2: (parenthesized content) or single alphanumeric/operator token
  const pattern = /(\^|_)(?:\(([^)]+)\)|([a-zA-Z0-9+\-−.]+))/g

  const elements: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIdx = 0

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index

    // Push text preceding this match
    if (matchIndex > lastIndex) {
      elements.push(text.substring(lastIndex, matchIndex))
    }

    const operator = match[1] // '^' or '_'
    const content = match[2] !== undefined ? match[2] : match[3] // content inside parens or raw token

    if (operator === '^') {
      elements.push(
        <sup
          key={`sup-${keyIdx++}`}
          className="text-[0.72em] font-semibold text-[var(--color-accent)] leading-none ml-[0.5px]"
        >
          {content}
        </sup>
      )
    } else if (operator === '_') {
      elements.push(
        <sub
          key={`sub-${keyIdx++}`}
          className="text-[0.72em] font-semibold text-[var(--color-accent)] leading-none ml-[0.5px]"
        >
          {content}
        </sub>
      )
    }

    lastIndex = matchIndex + match[0].length
  }

  // Push any remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex))
  }

  return elements
}

export default function MathFormattedText({ text, className = '' }: MathFormattedTextProps) {
  if (!text) return null
  const formatted = formatMathString(text)

  return <span className={`inline-block ${className}`}>{formatted}</span>
}
