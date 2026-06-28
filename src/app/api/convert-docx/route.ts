import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import { callAI } from '@/lib/callAI'

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

function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function chunkTextByTokens(paragraphs: string[], maxTokens: number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const p of paragraphs) {
    const combined = current ? current + '\n\n' + p : p
    if (countTokens(combined) > maxTokens && current) {
      chunks.push(current)
      current = p
    } else {
      current = combined
    }
  }
  if (current) chunks.push(current)
  return chunks
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

interface ParsedSection {
  heading?: string
  paragraphs: string[]
  boldTerms: { term: string; definition: string }[]
  listItems: string[]
}

function parseHTMLStructure(html: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const lines = html.split(/\n/)
  let current: ParsedSection = { paragraphs: [], boldTerms: [], listItems: [] }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const h1Match = trimmed.match(/<h1[^>]*>(.*?)<\/h1>/i)
    if (h1Match) {
      if (current.heading || current.paragraphs.length > 0 || current.boldTerms.length > 0 || current.listItems.length > 0) {
        sections.push(current)
      }
      current = { heading: h1Match[1].replace(/<[^>]+>/g, ''), paragraphs: [], boldTerms: [], listItems: [] }
      continue
    }

    const h2Match = trimmed.match(/<h2[^>]*>(.*?)<\/h2>/i)
    if (h2Match) {
      if (current.heading || current.paragraphs.length > 0 || current.boldTerms.length > 0 || current.listItems.length > 0) {
        sections.push(current)
      }
      current = { heading: h2Match[1].replace(/<[^>]+>/g, ''), paragraphs: [], boldTerms: [], listItems: [] }
      continue
    }

    const liMatch = trimmed.match(/<li[^>]*>(.*?)<\/li>/i)
    if (liMatch) {
      current.listItems.push(liMatch[1].replace(/<[^>]+>/g, '').trim())
      continue
    }

    const strongMatches = [...trimmed.matchAll(/<strong>(.*?)<\/strong>\s*[-–:]?\s*(.*?)(?:<\/p>|$)/gi)]
    if (strongMatches.length > 0) {
      for (const m of strongMatches) {
        current.boldTerms.push({
          term: m[1].trim(),
          definition: m[2].replace(/<[^>]+>/g, '').trim(),
        })
      }
      continue
    }

    const pMatch = trimmed.match(/<p[^>]*>(.*?)<\/p>/i)
    if (pMatch) {
      const text = pMatch[1].replace(/<[^>]+>/g, '').trim()
      if (text) current.paragraphs.push(text)
    }
  }

  if (current.heading || current.paragraphs.length > 0 || current.boldTerms.length > 0 || current.listItems.length > 0) {
    sections.push(current)
  }

  return sections
}

function hasStructure(html: string): boolean {
  const hasH1 = /<h1[^>]*>/i.test(html)
  const boldPattern = /<strong>(.*?)<\/strong>\s*[-–:]\s*/gi
  let boldCount = 0
  while (boldPattern.exec(html) !== null) boldCount++
  return hasH1 || boldCount >= 2
}

function deterministicClassify(sections: ParsedSection[], subject: string): { rows: FlashcardRow[]; unclassified: string[] } {
  const rows: FlashcardRow[] = []
  const unclassified: string[] = []

  const makeRow = (overrides: Partial<FlashcardRow>): FlashcardRow => ({
    front: '', back: '', chapter: '', subject, lesson: '',
    type: 'definition', mc_correct: '', mc_distractor1: '',
    mc_distractor2: '', mc_distractor3: '', tf_answer: '',
    enum_items: '', id_answer: '', id_variants: '',
    ...overrides,
  })

  for (const section of sections) {
    if (section.boldTerms.length > 0) {
      for (const bt of section.boldTerms) {
        rows.push(makeRow({
          front: bt.term,
          back: bt.definition,
          type: 'definition',
          chapter: section.heading || '',
        }))
      }
    }

    if (section.listItems.length >= 2) {
      const topic = section.heading || section.paragraphs[0] || 'List'
      rows.push(makeRow({
        front: topic,
        type: 'enumeration',
        enum_items: section.listItems.join(';'),
        chapter: section.heading || '',
      }))
    }

    for (const p of section.paragraphs) {
      const lower = p.toLowerCase()
      const tfMatch = lower.match(/^(true|false)[:\s]+(.+)/i)
      if (tfMatch) {
        rows.push(makeRow({
          front: tfMatch[2].trim(),
          type: 'true_false',
          tf_answer: tfMatch[1].toLowerCase() === 'true' ? 'true' : 'false',
          chapter: section.heading || '',
        }))
        continue
      }

      if (!section.boldTerms.length && !section.listItems.length) {
        unclassified.push(p)
      }
    }
  }

  return { rows, unclassified }
}

const PLAIN_PROSE_SYSTEM_PROMPT = `You are a flashcard generator reading plain study notes.
Read the text and generate flashcards from it.
Infer the subject from the content — use the most specific topic name you can.
For each card decide the type using these rules:
- If text defines a term → type: definition
- If text lists 3 or more items → type: enumeration, enum_items as semicolon list lowercase
- If text states a fact that could be true or false → type: true_false
- If text describes something without naming it → type: identification
- Otherwise → type: multiple_choice, generate 3 wrong distractors from other terms in the text

Output ONLY a JSON array. No markdown. No backticks.
Each object must have: front, back, type, subject, lesson,
and the type-specific fields:
- enumeration → enum_items (semicolon separated, lowercase)
- true_false → tf_answer ("true" or "false")
- identification → id_answer, id_variants (lowercase)
- multiple_choice → mc_correct, mc_distractor1, mc_distractor2, mc_distractor3`

const MC_DISTRACTOR_PROMPT = `You are a multiple-choice distractor generator.
Given a flashcard's front and back, generate 3 plausible wrong answers (distractors).
The distractors should be related to the topic but clearly incorrect.
Output ONLY a JSON object with keys: distractor1, distractor2, distractor3. No markdown. No backticks.`

function parseAIArrayResponse(text: string): Record<string, unknown>[] {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('AI response is not a JSON array')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function isValidCard(obj: Record<string, unknown>): boolean {
  if (!obj || typeof obj !== 'object') return false
  if (!obj.front || !obj.type) return false
  switch (obj.type) {
    case 'enumeration':
      return !!obj.enum_items
    case 'true_false':
      return !!obj.tf_answer
    case 'identification':
      return !!obj.id_answer
    case 'multiple_choice':
      return !!(obj.mc_correct && obj.mc_distractor1 && obj.mc_distractor2 && obj.mc_distractor3)
    case 'definition':
      return true
    default:
      return false
  }
}

function makeFallbackRow(text: string, subject: string): FlashcardRow {
  const cleaned = text.replace(/\n/g, ' ').trim()
  return {
    front: cleaned.slice(0, 100),
    back: cleaned.slice(0, 200),
    chapter: '',
    subject,
    lesson: '',
    type: 'definition',
    mc_correct: '', mc_distractor1: '', mc_distractor2: '', mc_distractor3: '',
    tf_answer: '',
    enum_items: '',
    id_answer: '',
    id_variants: '',
  }
}

function aiRowToFlashcardRow(obj: Record<string, unknown>, chapter: string, subject: string): FlashcardRow | null {
  if (!isValidCard(obj)) return null
  const s = (v: unknown): string => (v ?? '') as string
  return {
    front: s(obj.front),
    back: s(obj.back),
    chapter: s(obj.lesson) || chapter,
    subject: s(obj.subject) || subject,
    lesson: s(obj.lesson),
    type: s(obj.type) || 'definition',
    mc_correct: s(obj.mc_correct),
    mc_distractor1: s(obj.mc_distractor1),
    mc_distractor2: s(obj.mc_distractor2),
    mc_distractor3: s(obj.mc_distractor3),
    tf_answer: s(obj.tf_answer),
    enum_items: s(obj.enum_items),
    id_answer: s(obj.id_answer),
    id_variants: s(obj.id_variants),
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvHeadersRaw = formData.get('csvHeaders')
    let csvHeaders: string[] = []
    if (csvHeadersRaw && typeof csvHeadersRaw === 'string') {
      try {
        csvHeaders = JSON.parse(csvHeadersRaw)
      } catch { /* ignore */ }
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
          return NextResponse.json({ error: `Could not parse file. Ensure the file is a valid .docx: ${msg}` }, { status: 400 })
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

    // CSV passthrough — if the DOCX contains raw CSV, return it directly without AI
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
    const subject = inferSubject(rawText)
    const sections = parseHTMLStructure(html)

    // Determine path
    const hasCSVHeaders = csvHeaders.length > 0
    const structured = hasStructure(html)

    let rows: FlashcardRow[] = []

    if (hasCSVHeaders) {
      // PATH A — CSV schema provided
      const { rows: detRows, unclassified } = deterministicClassify(sections, subject)
      rows = detRows

      for (const chunk of unclassified) {
        try {
          const aiText = await callAI(PLAIN_PROSE_SYSTEM_PROMPT, chunk)
          const parsed = parseAIArrayResponse(aiText)
          for (const item of parsed) {
            const card = aiRowToFlashcardRow(item, '', subject)
            if (card) rows.push(card)
          }
        } catch (err) {
          console.error('AI unclassified chunk error (Path A):', err)
          if (chunk.replace(/\n/g, ' ').trim().length > 50) rows.push(makeFallbackRow(chunk, subject))
        }
      }

      // If deterministic parsing found nothing, fall back to AI on the full text
      if (rows.length === 0) {
        const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 20)
        const chunks = chunkTextByTokens(paragraphs, 800)
        for (const chunk of chunks) {
          try {
            const aiText = await callAI(PLAIN_PROSE_SYSTEM_PROMPT, chunk)
            const parsed = parseAIArrayResponse(aiText)
            for (const item of parsed) {
              const card = aiRowToFlashcardRow(item, '', subject)
              if (card) rows.push(card)
            }
          } catch (err) {
            console.error('AI fallback error (Path A):', err)
            if (chunk.replace(/\n/g, ' ').trim().length > 50) rows.push(makeFallbackRow(chunk, subject))
          }
        }
      }

      // Generate MC distractors for definition cards
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (r.type === 'definition' && r.front && r.back && !r.mc_correct) {
          try {
            const aiText = await callAI(MC_DISTRACTOR_PROMPT, `Front: ${r.front}\nBack: ${r.back}`)
            const cleaned = aiText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
            const dist = JSON.parse(cleaned)
            r.mc_correct = r.back
            r.mc_distractor1 = dist.distractor1 || ''
            r.mc_distractor2 = dist.distractor2 || ''
            r.mc_distractor3 = dist.distractor3 || ''
          } catch (err) {
            console.error('MC distractor generation error:', err)
          }
        }
      }

      // Map to provided csvHeaders if they differ from standard
      if (csvHeaders.length > 0) {
        rows = rows.map((row) => {
          const oldRow = { ...row }
          const newRow: Record<string, string> = {}
          for (const h of CSV_HEADERS) newRow[h] = ''
          for (const h of csvHeaders) {
            if (h in oldRow) newRow[h] = (oldRow as Record<string, string>)[h]
          }
          return newRow as unknown as FlashcardRow
        })
      }
    } else if (structured) {
      // PATH B — No CSV, structured DOCX
      const { rows: detRows, unclassified } = deterministicClassify(sections, subject)
      rows = detRows

      for (const chunk of unclassified) {
        try {
          const aiText = await callAI(PLAIN_PROSE_SYSTEM_PROMPT, chunk)
          const parsed = parseAIArrayResponse(aiText)
          for (const item of parsed) {
            const card = aiRowToFlashcardRow(item, '', subject)
            if (card) rows.push(card)
          }
        } catch (err) {
          console.error('AI unclassified chunk error (Path B):', err)
          if (chunk.replace(/\n/g, ' ').trim().length > 50) rows.push(makeFallbackRow(chunk, subject))
        }
      }

      // If deterministic parsing found nothing, fall back to AI on the full text
      if (rows.length === 0) {
        const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 20)
        const chunks = chunkTextByTokens(paragraphs, 800)
        for (const chunk of chunks) {
          try {
            const aiText = await callAI(PLAIN_PROSE_SYSTEM_PROMPT, chunk)
            const parsed = parseAIArrayResponse(aiText)
            for (const item of parsed) {
              const card = aiRowToFlashcardRow(item, '', subject)
              if (card) rows.push(card)
            }
          } catch (err) {
            console.error('AI fallback error (Path B):', err)
            if (chunk.replace(/\n/g, ' ').trim().length > 50) rows.push(makeFallbackRow(chunk, subject))
          }
        }
      }

      // Generate MC distractors for definition cards
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (r.type === 'definition' && r.front && r.back && !r.mc_correct) {
          try {
            const aiText = await callAI(MC_DISTRACTOR_PROMPT, `Front: ${r.front}\nBack: ${r.back}`)
            const cleaned = aiText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
            const dist = JSON.parse(cleaned)
            r.mc_correct = r.back
            r.mc_distractor1 = dist.distractor1 || ''
            r.mc_distractor2 = dist.distractor2 || ''
            r.mc_distractor3 = dist.distractor3 || ''
          } catch (err) {
            console.error('MC distractor generation error:', err)
          }
        }
      }
    } else {
      // PATH C — Plain prose
      const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 20)
      const chunks = chunkTextByTokens(paragraphs, 800)

      for (const chunk of chunks) {
        try {
          const aiText = await callAI(PLAIN_PROSE_SYSTEM_PROMPT, chunk)
          const parsed = parseAIArrayResponse(aiText)
          for (const item of parsed) {
            const card = aiRowToFlashcardRow(item, '', subject)
            if (card) rows.push(card)
          }
        } catch (err) {
          console.error('AI chunk error (Path C):', err)
          if (chunk.replace(/\n/g, ' ').trim().length > 50) rows.push(makeFallbackRow(chunk, subject))
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No flashcards could be generated from this DOCX' }, { status: 422 })
    }

    const csv = rowsToCSV(rows)
    return new NextResponse(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    })
  } catch (err) {
    console.error('convert-docx error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to convert DOCX' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
