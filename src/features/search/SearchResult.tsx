'use client'

import type { FuseResult, FuseResultMatch } from 'fuse.js'
import type { Card } from '@/lib/zodSchemas'
import StatBadge from '@/components/StatBadge'

type RangeTuple = [number, number]

interface SearchResultProps {
  result: FuseResult<Card>
  deckTitle: string
  onClick: () => void
}

function highlightMatches(
  text: string,
  matches: readonly RangeTuple[] | undefined
): React.ReactNode {
  if (!matches || matches.length === 0) return text

  const sorted = [...matches].sort((a, b) => a[0] - b[0])
  const segments: { start: number; end: number; highlighted: boolean }[] = []
  let pos = 0

  for (const [start, end] of sorted) {
    if (start > pos) segments.push({ start: pos, end: start, highlighted: false })
    segments.push({ start, end: end + 1, highlighted: true })
    pos = end + 1
  }
  if (pos < text.length) segments.push({ start: pos, end: text.length, highlighted: false })

  return segments.map((seg, i) => {
    const content = text.slice(seg.start, seg.end)
    if (seg.highlighted) {
      return (
        <mark
          key={i}
          className="bg-[var(--color-accent-soft)] text-[var(--color-accent)] rounded px-0.5 not-italic"
        >
          {content}
        </mark>
      )
    }
    return content
  })
}

export default function SearchResult({ result, deckTitle, onClick }: SearchResultProps) {
  const card = result.item
  const frontMatches = result.matches?.find((m: FuseResultMatch) => m.key === 'front')?.indices
  const backMatches = result.matches?.find((m: FuseResultMatch) => m.key === 'back')?.indices

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-400 uppercase tracking-wider">{card.chapter}</span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0052cc] border border-blue-100">
          {card.subject}
        </span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-500 font-medium truncate">{deckTitle}</span>
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-800 leading-snug">
        {highlightMatches(card.front, frontMatches)}
      </div>

      {card.back && (
        <div className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {highlightMatches(card.back, backMatches)}
        </div>
      )}
    </div>
  )
}
