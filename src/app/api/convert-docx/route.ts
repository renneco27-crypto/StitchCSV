import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'

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

interface ParsedCard {
  front: string
  back: string
  subject: string
  topic: string
  type: string
}

function parseStructuredNotes(rawText: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  // Split by horizontal rules, double newlines, or multiple linebreaks
  const rawSections = rawText
    .split(/(?:_{3,}|-{3,}|\n{2,})/)
    .map(s => s.trim())
    .filter(Boolean)

  for (const section of rawSections) {
    const lines = section.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) continue

    // The first non-bullet line is the topic / header
    let header = lines[0].replace(/^[•\-\*]\s*/, '').trim()
    const contentLines = lines.slice(1).filter(l => l.trim().length > 0)

    // If section contains bullets or key-value colons
    const hasBullets = lines.some(l => /^[•\-\*]/.test(l) || l.includes('•'))
    const hasColons = lines.some(l => l.includes(':') || l.includes(' – ') || l.includes(' - '))

    if (hasBullets || hasColons || contentLines.length > 0) {
      // 1. Create a primary keyword note card for the Notes tab
      const combinedNotes = (contentLines.length > 0 ? contentLines : lines)
        .map(l => l.startsWith('•') ? l : `• ${l}`)
        .join('\n')

      cards.push({
        front: header,
        back: combinedNotes,
        subject: header,
        topic: 'Notes',
        type: 'keyword',
      })

      // 2. Also extract individual key facts as flashcards
      for (const line of (contentLines.length > 0 ? contentLines : lines)) {
        const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim()
        if (!cleanLine) continue

        // Check for multiple segments like "Born: ... | Died: ..."
        const segments = cleanLine.split('|').map(s => s.trim()).filter(Boolean)
        for (const seg of segments) {
          const colonIdx = seg.indexOf(':')
          const dashIdx = seg.indexOf(' – ') !== -1 ? seg.indexOf(' – ') : seg.indexOf(' - ')

          if (colonIdx > 0 && colonIdx < 35) {
            const key = seg.slice(0, colonIdx).trim()
            const val = seg.slice(colonIdx + 1).trim()
            if (val) {
              cards.push({
                front: `${header}: ${key}`,
                back: val,
                subject: header,
                topic: key,
                type: 'definition',
              })
            }
          } else if (dashIdx > 0 && dashIdx < 45) {
            const key = seg.slice(0, dashIdx).trim()
            const val = seg.slice(dashIdx + (seg.indexOf(' – ') !== -1 ? 3 : 3)).trim()
            if (val) {
              cards.push({
                front: `${header} (${key})`,
                back: val,
                subject: header,
                topic: key,
                type: 'definition',
              })
            }
          }
        }
      }
    }
  }

  return cards
}

function parseTextToCards(rawText: string): ParsedCard[] {
  // Check if input is structured notes (contains bullets, colons, or dividers)
  if (rawText.includes('•') || /_{3,}/.test(rawText) || /\n[A-Z\s]{3,}\n/.test(rawText)) {
    const noteCards = parseStructuredNotes(rawText)
    if (noteCards.length > 0) return noteCards
  }

  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const PATTERNS: Record<string, RegExp> = {
    definition:  /(.+?)\s+(?:is|are|was|were)\s+(.+)/i,
    property:    /(.+?)\s+(?:has|have)\s+(.+)/i,
    function:    /(.+?)\s+(?:produces?|creates?|makes?|forms?)\s+(.+)/i,
    composition: /(.+?)\s+(?:contains?|consists? of)\s+(.+)/i,
    method:      /(.+?)\s+(?:uses?|attracts?)\s+(.+)/i,
    cause:       /(.+?)\s+(?:causes?|enables?|allows?)\s+(.+)/i,
  }

  let currentTopic: string | null = null
  const cards: ParsedCard[] = []

  for (let sentence of sentences) {
    if (currentTopic) {
      sentence = sentence
        .replace(/^It\b/i, currentTopic)
        .replace(/^They\b/i, currentTopic)
        .replace(/^This\b/i, currentTopic)
        .replace(/^These\b/i, currentTopic)
    }

    const defMatch = sentence.match(/^(?:A|An|The)\s+(.+?)\s+(?:is|are)\s+/i)
    if (defMatch) {
      currentTopic = defMatch[1].trim()
    }

    let matched = false
    for (const [type, regex] of Object.entries(PATTERNS)) {
      const m = sentence.match(regex)
      if (m) {
        const subject = m[1].replace(/^(A|An|The)\s+/i, '').trim()
        const object = m[2].replace(/[.!?]$/, '').trim()

        const blankTemplates: Record<string, string> = {
          definition:  `${subject} is ____.`,
          property:    `${subject} has ____.`,
          function:    `${subject} produces ____.`,
          composition: `${subject} contains ____.`,
          method:      `${subject} uses/attracts ____.`,
          cause:       `${subject} causes/enables ____.`,
        }

        cards.push({
          front: blankTemplates[type],
          back: object,
          subject: currentTopic || subject,
          topic: type,
          type: 'definition',
        })

        matched = true
        break
      }
    }

    if (!matched && currentTopic) {
      cards.push({
        front: `${currentTopic} ____.`,
        back: sentence.replace(/[.!?]$/, '').trim(),
        subject: currentTopic,
        topic: 'general',
        type: 'definition',
      })
    }
  }

  return cards
}

export async function GET() {
  return NextResponse.json({
    title: 'How Smart Card Generation Works',
    steps: [
      {
        label: 'Sentence Splitting',
        description: 'Text is split on . ! ? into individual sentences.',
      },
      {
        label: 'Topic Memory',
        description: 'Pronouns (It, They, This, These) are replaced with the last known topic. When a sentence begins with "A/An/The X is/are", X becomes the current topic.',
      },
      {
        label: 'Pattern Matching',
        description: 'Each sentence is matched against 6 patterns: definition (is/are/was/were), property (has/have), function (produces/creates/makes/forms), composition (contains/consists of), method (uses/attracts), cause (causes/enables/allows).',
      },
      {
        label: 'Fill-in-the-Blank',
        description: 'Each match produces one card with a fill-in-the-blank front like "X is ____." and the complement as the answer.',
      },
      {
        label: 'Fallback',
        description: 'If no pattern matches but a topic is known, a generic "Topic ____." card is created from the raw sentence.',
      },
    ],
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isTextFile = fileName.endsWith('.txt')
    const isPdfOrPpt = fileName.endsWith('.pdf') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')

    // If running in cloud environment (e.g. Render with 0.1% CPU) and a local PC relay is configured:
    const relayUrl = process.env.OPENCODE_SERVER_URL
    const isRelay = relayUrl && !relayUrl.includes('localhost') && !relayUrl.includes('127.0.0.1')
    if (isRelay) {
      try {
        const relayTarget = `${relayUrl.replace(/\/$/, '')}/api/convert-docx`
        const relayForm = new FormData()
        relayForm.append('file', file)
        const relayRes = await fetch(relayTarget, {
          method: 'POST',
          body: relayForm,
          headers: { 'ngrok-skip-browser-warning': 'true' },
        })
        if (relayRes.ok) {
          const csvText = await relayRes.text()
          return new NextResponse(csvText, {
            status: 200,
            headers: { 'Content-Type': 'text/csv; charset=utf-8' },
          })
        }
      } catch (relayErr) {
        console.warn('[convert-docx] Relay forwarding failed, falling back to local extraction:', relayErr)
      }
    }

    let rawTextFull: string
    let html: string

    if (isPdfOrPpt) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = path.extname(fileName)
      const tempPath = path.join(os.tmpdir(), `stitch_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`)
      fs.writeFileSync(tempPath, buffer)

      try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'doc_ppt_pdf_transcriber.py')
        rawTextFull = await new Promise<string>((resolve, reject) => {
          const py = spawn('python', [scriptPath, tempPath])
          let out = ''
          let err = ''
          py.stdout.on('data', (d) => { out += d.toString() })
          py.stderr.on('data', (d) => { err += d.toString() })
          py.on('close', (code) => {
            if (code === 0 && out.trim()) {
              resolve(out)
            } else {
              reject(new Error(err || `Transcriber exited with code ${code}`))
            }
          })
          py.on('error', (e) => reject(e))
        })
      } finally {
        try { fs.unlinkSync(tempPath) } catch (e) {}
      }
    } else if (isTextFile) {
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

    // CSV passthrough
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

    const parsed = parseTextToCards(rawText)

    let rows: FlashcardRow[] = parsed.map(c => makeRow({
      front: c.front,
      back: c.back,
      subject: c.subject,
      lesson: c.topic,
      type: c.type,
    }))

    // Minimum 4 cards guarantee
    if (rows.length < 4 && rows.length > 0) {
      const sentences = rawText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10)
      for (const s of sentences) {
        if (rows.length >= 4) break
        const firstCap = s.match(/\b[A-Z][a-z]+\b/)?.[0] || 'Fact'
        rows.push(makeRow({
          front: s.length > 120 ? s.slice(0, 120) + '...' : s,
          back: firstCap,
          subject: firstCap,
          lesson: 'general',
          type: 'definition',
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
