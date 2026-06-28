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




// ─── Sentence splitting ───────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  return text
    .split(/\./)
    .map(s => s.trim())
    .filter(s => s.length > 10)
}

function extractSubjectFromSentence(sentence: string): string {
  const cap = sentence.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/)?.[0]
  if (cap) return cap
  const noun = sentence.match(/\b(?:a|an|the)\s+([A-Za-z]{3,})\b/i)?.[1]
  if (noun) return noun.charAt(0).toUpperCase() + noun.slice(1)
  return 'Fact'
}

function inferTopic(sentence: string): string {
  const s = sentence.toLowerCase().trim()
  const person = sentence.match(/\b(?:Mr|Mrs|Ms|Dr|Prof)\.\s*[A-Z][a-z]+\b|\b[A-Z][a-z]+\s+(?:is|was|has)\b/)
  if (person) return 'Person'
  if (/^[A-Z][a-z]+/.test(sentence.trim()) && /\b(?:is|are|was|were|means)\b/i.test(s)) return 'Definition'
  if (/\b(?:latitude|longitude|km|located|east|west|north|south|city|country|island|bay)\b/i.test(s)) return 'Place'
  if (/\b(?:include|includes|such as|consist|contain|list|types|kinds|categories)\b/i.test(s)) return 'List'
  if (/\b(?:year|century|era|period|war|battle|revolution|discovered|invented)\b/i.test(s)) return 'Event'
  if (/\b(?:true|false|yes|no|can|does|will|should|is\s+it|are\s+they)\b/i.test(s)) return 'Debatable'
  return 'Fact'
}

function detectCardType(sentence: string): { type: string; back: string } {
  const lower = sentence.toLowerCase()

  // Enumeration if 3+ comma-separated items
  const items = sentence.split(/,\s*/).filter(i => i.length > 1 && i.trim().length > 0)
  if (items.length >= 3) {
    return {
      type: 'enumeration',
      back: items.map(i => i.replace(/[.!?]+$/, '').trim()).join(', '),
    }
  }

  // True/false if yes/no pattern or "can/does/will/should" question
  if (
    /\b(?:can|does|will|should|do|did)\s(?:a|an|the|this|that|it|they|we)\b/i.test(lower) ||
    lower.endsWith('?') ||
    /\b(?:is it|are they|does it|is there)\b/i.test(lower)
  ) {
    return { type: 'true_false', back: 'True' }
  }

  return { type: 'definition', back: sentence.match(/\b(?:is|are|was|were|means)\s+(.+)/i)?.[1]?.trim() || sentence }
}

function buildCard(sentence: string): FlashcardRow | null {
  const s = sentence.trim()
  if (s.length < 10) return null

  const subject = extractSubjectFromSentence(s)
  const topic = inferTopic(s)
  const { type, back } = detectCardType(s)
  const enumItems = type === 'enumeration' ? back.split(', ').join(';') : ''

  let front: string
  if (type === 'definition') {
    // Cloze: blank out the subject
    const subjectRegex = new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const replaced = s.replace(subjectRegex, '________')
    front = replaced !== s ? replaced : s
  } else if (type === 'enumeration') {
    const topicPhrase = subject !== 'Fact' ? subject : 'the items'
    front = `List ${topicPhrase}`
  } else {
    front = s
  }

  const row: FlashcardRow = {
    front, back, chapter: '', subject, lesson: '', type,
    mc_correct: '', mc_distractor1: '', mc_distractor2: '', mc_distractor3: '',
    tf_answer: type === 'true_false' ? 'true' : '',
    enum_items: enumItems,
    id_answer: '', id_variants: '',
  }
  row.lesson = topic

  return row
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

    const sentences = splitIntoSentences(rawText)

    let rows: FlashcardRow[] = []

    for (const sentence of sentences) {
      if (rows.length >= 60) break
      const card = buildCard(sentence)
      if (card) rows.push(card)
    }

    // If fewer than 4 cards, fall back to raw sentences as definition cards
    if (rows.length < 4 && sentences.length > 0) {
      rows = []
      for (const sentence of sentences) {
        if (rows.length >= 4) break
        const s = sentence.trim()
        if (s.length < 10) continue
        const subject = sentence.match(/\b[A-Z][a-z]+\b/)?.[0] || 'Fact'
        rows.push(makeRow({
          front: s.length > 120 ? s.slice(0, 120) + '...' : s,
          back: subject,
          type: 'definition',
          subject,
          lesson: 'Fact',
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