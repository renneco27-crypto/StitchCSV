import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'

interface FlashcardRow {
  front: string
  back: string
  chapter: string
  subject: string
  lesson: string
  type: string
  mc_correct: string
  mc_distractor1: string
  mc_distractor2: string
  mc_distractor3: string
  tf_answer: string
  enum_items: string
  id_answer: string
  id_variants: string
}

const CSV_HEADERS = [
  'front', 'back', 'chapter', 'subject', 'lesson', 'type',
  'mc_correct', 'mc_distractor1', 'mc_distractor2', 'mc_distractor3',
  'tf_answer', 'enum_items', 'id_answer', 'id_variants',
]

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowsToCSV(rows: FlashcardRow[]): string {
  const header = CSV_HEADERS.join(',')
  const lines = rows.map((row) =>
    CSV_HEADERS.map((h) => escapeCSV(row[h as keyof FlashcardRow] ?? '')).join(',')
  )
  return [header, ...lines].join('\n')
}

function makeRow(overrides: Partial<FlashcardRow>): FlashcardRow {
  return {
    front: '', back: '', chapter: '', subject: '', lesson: '',
    type: 'definition',
    mc_correct: '', mc_distractor1: '', mc_distractor2: '', mc_distractor3: '',
    tf_answer: '', enum_items: '', id_answer: '', id_variants: '',
    ...overrides,
  }
}

function inferSubject(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim())
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(chapter|module|unit|topic|subject)\s*[:#]/i.test(trimmed)) {
      return trimmed.replace(/^(chapter|module|unit|topic|subject)\s*[:#]\s*/i, '').trim()
    }
  }
  return 'General'
}

// ─── Subject extraction ───────────────────────────────────────────────────────
// Finds all potential answer terms from the text:
// 1. ALL_CAPS words (DNA, ATP, NASA)
// 2. Title Case phrases of 2-5 words (Solar System, World War II)
// 3. Words at sentence start followed by is/are/was/were/means/refers to

function extractSubjects(text: string): string[] {
  const subjects = new Set<string>()

  // ALL CAPS words (min 2 chars, not common words)
  const allCaps = text.match(/\b[A-Z]{2,}\b/g) || []
  const skipCaps = new Set(['IS', 'ARE', 'WAS', 'WERE', 'THE', 'AND', 'FOR', 'NOT', 'BUT', 'OR', 'AN', 'A', 'IN', 'OF', 'TO', 'IT'])
  allCaps.forEach(w => { if (!skipCaps.has(w)) subjects.add(w) })

  // Title Case phrases (2–5 consecutive capitalized words)
  const titleCase = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\b/g) || []
  const skipTitle = new Set([
    'This', 'That', 'These', 'Those', 'They', 'There', 'Their',
    'The', 'And', 'But', 'For', 'True', 'False', 'List', 'Note',
  ])
  titleCase.forEach(phrase => {
    const first = phrase.split(' ')[0]
    if (!skipTitle.has(first)) subjects.add(phrase)
  })

  // Sentence-start subjects: "Word is/are/was/were/means/refers to"
  const defPattern = /(?:^|[.!?]\s+)([A-Z][a-zA-Z\s]{1,40}?)\s+(?:is|are|was|were|means|refers to|is the|is a)\s/gm
  let m: RegExpExecArray | null
  while ((m = defPattern.exec(text)) !== null) {
    const candidate = m[1].trim()
    if (candidate.length > 1 && candidate.length < 50) subjects.add(candidate)
  }

  // Filter out pure stop words and very short fragments
  const stopWords = new Set(['It', 'He', 'She', 'We', 'They', 'This', 'That', 'There'])
  return Array.from(subjects).filter(s => s.length > 1 && !stopWords.has(s))
}

// ─── Sentence splitting ───────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  // Split on . ! ? but not on decimal numbers like 99.86
  return text
    .split(/(?<=[^0-9])\.(?=[^0-9])|[!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15)
}

// ─── Card classification ──────────────────────────────────────────────────────

function classifySentence(
  sentence: string,
  subjects: string[],
  allRows: FlashcardRow[],
): FlashcardRow[] {
  const results: FlashcardRow[] = []
  const subjectCategory = subjects[0] || 'General'

  // ── Definition: "X is/are/was/were/means/refers to [description]"
  const defMatch = sentence.match(
    /^([A-Z][a-zA-Z\s]{1,40}?)\s+(is|are|was|were|means|refers to|is the|is a)\s+(.+)$/i
  )
  if (defMatch) {
    const subj = defMatch[1].trim()
    const verb = defMatch[2].trim()
    const desc = defMatch[3].trim()

    // Skip sentences starting with common pronouns
    if (!/^(It|He|She|We|They|This|That|There)\b/i.test(subj) && desc.length > 5) {
      const front = `________ ${verb} ${desc}`
      const back = subj

      // Definition card
      results.push(makeRow({
        front,
        back,
        type: 'definition',
        subject: subjectCategory,
      }))

      // Multiple choice version — distractors = other subjects
      const others = subjects.filter(s => s !== subj && s !== subjectCategory)
      if (others.length >= 1) {
        results.push(makeRow({
          front,
          type: 'multiple_choice',
          subject: subjectCategory,
          mc_correct: back,
          mc_distractor1: others[0] || '',
          mc_distractor2: others[1] || '',
          mc_distractor3: others[2] || '',
        }))
      }

      // True card
      results.push(makeRow({
        front: sentence,
        back: 'True',
        type: 'true_false',
        tf_answer: 'true',
        subject: subjectCategory,
      }))

      // False card — swap subject with a different subject
      const swapSubject = subjects.find(s => s !== subj)
      if (swapSubject) {
        results.push(makeRow({
          front: sentence.replace(subj, swapSubject),
          back: 'False',
          type: 'true_false',
          tf_answer: 'false',
          subject: subjectCategory,
        }))
      }

      return results
    }
  }

  // ── Enumeration: sentence contains "include/consist of/such as/following/are:" + 3+ items
  const enumTrigger = sentence.match(
    /(.+?)\s+(?:include|includes|consist of|consists of|such as|following|are:)\s+(.+)/i
  )
  if (enumTrigger) {
    const topic = enumTrigger[1].trim()
    const itemsRaw = enumTrigger[2]
    const items = itemsRaw
      .split(/,\s*|\s+and\s+|\s*;\s*/)
      .map(i => i.replace(/[.!?]$/, '').trim())
      .filter(i => i.length > 1)

    if (items.length >= 3) {
      results.push(makeRow({
        front: `List the ${topic}`,
        back: items.join(', '),
        type: 'enumeration',
        enum_items: items.map(i => i.toLowerCase()).join(';'),
        subject: subjectCategory,
      }))
      return results
    }
  }

  // ── Number swap → false true/false card
  const numMatch = sentence.match(/\b(\d+(?:\.\d+)?)\b/)
  if (numMatch) {
    const num = parseFloat(numMatch[1])
    const falseNum = Number.isInteger(num)
      ? (num <= 10 ? num * 2 : Math.max(1, num - Math.floor(num / 2)))
      : Math.round((num * 1.5) * 100) / 100

    // True version
    results.push(makeRow({
      front: sentence,
      back: 'True',
      type: 'true_false',
      tf_answer: 'true',
      subject: subjectCategory,
    }))

    // False version with wrong number
    results.push(makeRow({
      front: sentence.replace(numMatch[0], String(falseNum)),
      back: 'False',
      type: 'true_false',
      tf_answer: 'false',
      subject: subjectCategory,
    }))

    return results
  }

  // ── Identification: description starts with "The" but subject is known from subjects list
  if (/^The\s/i.test(sentence)) {
    const matchedSubject = subjects.find(s =>
      sentence.toLowerCase().includes(s.toLowerCase()) && s.length > 2
    )
    if (matchedSubject) {
      const description = sentence
        .replace(new RegExp(matchedSubject, 'gi'), '________')
        .trim()
      results.push(makeRow({
        front: description,
        back: matchedSubject,
        type: 'identification',
        id_answer: matchedSubject.toLowerCase(),
        id_variants: matchedSubject.toLowerCase(),
        subject: subjectCategory,
      }))
      return results
    }
  }

  return results
}

// ─── List item grouping ───────────────────────────────────────────────────────
// Groups consecutive short lines (likely list items) under a heading
// into enumeration cards

function extractEnumerationsFromLines(lines: string[], subjectCategory: string): FlashcardRow[] {
  const rows: FlashcardRow[] = []
  let heading = ''
  let items: string[] = []

  const flush = () => {
    if (heading && items.length >= 3) {
      rows.push(makeRow({
        front: `List the ${heading}`,
        back: items.join(', '),
        type: 'enumeration',
        enum_items: items.map(i => i.toLowerCase()).join(';'),
        subject: subjectCategory,
      }))
    }
    items = []
    heading = ''
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // A heading line: ends with colon or is short and Title Case
    if (/:\s*$/.test(trimmed) || (trimmed.length < 60 && /^[A-Z]/.test(trimmed) && !trimmed.includes('.'))) {
      flush()
      heading = trimmed.replace(/:$/, '').trim()
      continue
    }

    // A list item: starts with bullet/dash/number or is short
    if (/^[-•*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed) || trimmed.length < 60) {
      items.push(trimmed.replace(/^[-•*\d.)\s]+/, '').trim())
      continue
    }

    flush()
  }

  flush()
  return rows
}

// ─── GET — algorithm explainer ────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    title: 'How Smart Card Generation Works',
    steps: [
      {
        label: 'Subject Detection',
        description: 'ALL CAPS words (DNA, ATP), Title Case phrases (Solar System, World War II), and words followed by "is/are/means" are identified as the answer pool.',
      },
      {
        label: 'Definition Cards',
        description: 'Sentences like "Mitochondria is the powerhouse of the cell" become "________ is the powerhouse of the cell" with Mitochondria as the answer.',
      },
      {
        label: 'Multiple Choice',
        description: 'Every definition card also becomes an MC question. Wrong options are other subjects found in the same text.',
      },
      {
        label: 'True / False',
        description: 'Every fact generates a true card (original sentence) and a false card (subject swapped with a different subject, or number changed to a wrong value).',
      },
      {
        label: 'Enumeration',
        description: 'Sentences with "include/consist of/such as" followed by 3+ items, or consecutive short list lines under a heading, become "List the X" questions.',
      },
      {
        label: 'Identification',
        description: 'Sentences starting with "The" where a known subject appears get the subject blanked out — you identify what is being described.',
      },
      {
        label: 'Minimum 4 Cards',
        description: 'If fewer than 4 cards are found, remaining sentences are converted to definition cards until the minimum is met.',
      },
    ],
  })
}

// ─── POST — main conversion ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isTextFile = fileName.endsWith('.txt')

    let rawTextFull: string
    let html: string

    if (isTextFile) {
      rawTextFull = await file.text()
      html = '<p>' + rawTextFull.replace(/\n\n+/g, '</p><p>').replace(/\n/g, ' ') + '</p>'
    } else {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      try {
        const result = await mammoth.convertToHtml({ buffer })
        html = result.value
      } catch (convErr) {
        try {
          const result = await mammoth.extractRawText({ buffer })
          html = '<p>' + result.value.replace(/\n\n+/g, '</p><p>').replace(/\n/g, ' ') + '</p>'
        } catch {
          const msg = convErr instanceof Error ? convErr.message : 'Unknown error'
          return NextResponse.json({ error: `Could not parse file: ${msg}` }, { status: 400 })
        }
      }
      rawTextFull = html
        .replace(/\s*<\/(p|div|h[1-6]|li|tr|th|td)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    }

    const rawText = rawTextFull.replace(/\s+/g, ' ').trim()

    if (!rawText) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
    }

    // CSV passthrough — if the file contains raw CSV, return it directly
    const firstLine = rawTextFull.split(/\r?\n/).find((l: string) => l.trim())?.trim() ?? ''
    if (/^front[,\t]/.test(firstLine) && /type/.test(firstLine)) {
      const csvLines = rawTextFull
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter(Boolean)
        .join('\n')
      return new NextResponse(csvLines, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      })
    }

    const subjectCategory = inferSubject(rawText)
    const subjects = extractSubjects(rawText)
    const sentences = splitIntoSentences(rawText)
    const lines = rawTextFull.split(/\r?\n/)

    let rows: FlashcardRow[] = []

    // Pass 1: extract enumerations from line structure (headings + list items)
    const enumRows = extractEnumerationsFromLines(lines, subjectCategory)
    rows.push(...enumRows)

    // Pass 2: classify each sentence
    for (const sentence of sentences) {
      if (rows.length >= 60) break
      const newCards = classifySentence(sentence, subjects, rows)
      rows.push(...newCards)
    }

    // Pass 3: minimum 4 cards guarantee
    if (rows.length < 4) {
      for (const sentence of sentences) {
        if (rows.length >= 4) break
        if (sentence.length < 20) continue
        const firstCap = sentence.match(/\b[A-Z][a-z]{2,}\b/)?.[0] || subjectCategory
        rows.push(makeRow({
          front: sentence.length > 120 ? sentence.slice(0, 120) + '...' : sentence,
          back: firstCap,
          type: 'definition',
          subject: subjectCategory,
        }))
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No flashcards could be generated from this file' }, { status: 422 })
    }

    const csv = rowsToCSV(rows)
    return new NextResponse(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    })
  } catch (err) {
    console.error('convert-docx error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to convert file' },
      { status: 500 },
    )
  }
}

export const runtime = 'nodejs'