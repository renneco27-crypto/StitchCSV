import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

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
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowsToCSV(rows: FlashcardRow[]): string {
  const header = CSV_HEADERS.join(',')
  const lines = rows.map((row) =>
    CSV_HEADERS.map((h) => escapeCSV(String(row[h as keyof FlashcardRow] ?? ''))).join(',')
  )
  return [header, ...lines].join('\n')
}

async function callOpenCodeDirect(text: string, subject: string, chapter: string): Promise<FlashcardRow[] | null> {
  const serverUrl = process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096'
  try {
    const sessionRes = await fetch(`${serverUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!sessionRes.ok) return null
    const { id: sessionId } = await sessionRes.json()

    const prompt = `You are an expert College Information Technology (IT) professor.
Convert these student lecture notes into a JSON array of flashcards for StitchCSV.
Default Subject: "${subject}"
Default Chapter: "${chapter}"

Required keys for each object:
"front", "back", "chapter", "subject", "lesson", "type" (one of: definition, concept, formula, process, list, multiple_choice, true_false, enumeration, identification),
"mc_correct", "mc_distractor1", "mc_distractor2", "mc_distractor3", "tf_answer", "enum_items", "id_answer", "id_variants".

Return ONLY raw JSON array.

STUDENT NOTES:
"""
${text}
"""`

    // Send prompt
    const msgRes = await fetch(`${serverUrl}/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: prompt }],
      }),
    })

    if (!msgRes.ok) return null
    const messages = await msgRes.json()
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m?.info?.role === 'assistant') {
        const textParts = (m.parts || [])
          .filter((p: any) => p.type === 'text' && p.text)
          .map((p: any) => p.text)
          .join('\n')

        const clean = textParts.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '').trim()
        const parsed = JSON.parse(clean)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            front: String(item.front || '').trim(),
            back: String(item.back || '').trim(),
            chapter: String(item.chapter || chapter).trim(),
            subject: String(item.subject || subject).trim(),
            lesson: String(item.lesson || 'Module 1').trim(),
            type: String(item.type || 'concept').toLowerCase().trim(),
            mc_correct: String(item.mc_correct || '').trim(),
            mc_distractor1: String(item.mc_distractor1 || '').trim(),
            mc_distractor2: String(item.mc_distractor2 || '').trim(),
            mc_distractor3: String(item.mc_distractor3 || '').trim(),
            tf_answer: String(item.tf_answer || '').toLowerCase().trim(),
            enum_items: String(item.enum_items || '').trim(),
            id_answer: String(item.id_answer || '').trim(),
            id_variants: String(item.id_variants || '').trim(),
          }))
        }
      }
    }
  } catch (err) {
    console.warn('[ai-parse] Direct OpenCode Server call failed, using CLI fallback:', err)
  }
  return null
}

function callOpenCodeCli(text: string, subject: string, chapter: string): Promise<FlashcardRow[] | null> {
  const prompt = `You are an expert College Information Technology (IT) professor.
Convert these student lecture notes into a JSON array of flashcards for StitchCSV.
Default Subject: "${subject}"
Default Chapter: "${chapter}"

Required keys for each object:
"front", "back", "chapter", "subject", "lesson", "type" (one of: definition, concept, formula, process, list, multiple_choice, true_false, enumeration, identification),
"mc_correct", "mc_distractor1", "mc_distractor2", "mc_distractor3", "tf_answer", "enum_items", "id_answer", "id_variants".

Return ONLY raw JSON array.

STUDENT NOTES:
"""
${text}
"""`

  return new Promise<FlashcardRow[] | null>((resolve) => {
    try {
      const opencodeCmd = process.platform === 'win32' ? 'opencode.cmd' : 'opencode'
      const proc = spawn(opencodeCmd, ['run', '--pure', prompt], { shell: true })
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (d) => { stdout += d.toString() })
      proc.stderr.on('data', (d) => { stderr += d.toString() })

      const timer = setTimeout(() => {
        try { proc.kill() } catch (e) {}
        resolve(null)
      }, 120000)

      proc.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0 && stdout.trim()) {
          const clean = stdout
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/g, '')
            .trim()
          try {
            const parsed = JSON.parse(clean)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const rows: FlashcardRow[] = parsed.map((item) => ({
                front: String(item.front || '').trim(),
                back: String(item.back || '').trim(),
                chapter: String(item.chapter || chapter).trim(),
                subject: String(item.subject || subject).trim(),
                lesson: String(item.lesson || 'Module 1').trim(),
                type: String(item.type || 'concept').toLowerCase().trim(),
                mc_correct: String(item.mc_correct || '').trim(),
                mc_distractor1: String(item.mc_distractor1 || '').trim(),
                mc_distractor2: String(item.mc_distractor2 || '').trim(),
                mc_distractor3: String(item.mc_distractor3 || '').trim(),
                tf_answer: String(item.tf_answer || '').toLowerCase().trim(),
                enum_items: String(item.enum_items || '').trim(),
                id_answer: String(item.id_answer || '').trim(),
                id_variants: String(item.id_variants || '').trim(),
              }))
              resolve(rows)
              return
            }
          } catch (err) {
            console.warn('[ai-parse] OpenCode CLI JSON parse failed:', err)
          }
        }
        resolve(null)
      })

      proc.on('error', () => {
        clearTimeout(timer)
        resolve(null)
      })
    } catch (err) {
      resolve(null)
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, subject = 'BSIT', chapter = 'Information Technology' } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Please provide valid text to parse.' }, { status: 400 })
    }

    // 1. Prioritize OpenCode CLI: opencode run "prompt"
    let rows = await callOpenCodeCli(text, subject, chapter)

    // 2. Fallback to direct OpenCode server on port 4096
    if (!rows || rows.length === 0) {
      rows = await callOpenCodeDirect(text, subject, chapter)
    }

    // 3. Fallback to python scripts/opencode_it_csv_creator.py
    if (!rows || rows.length === 0) {
      const scriptPath = path.join(process.cwd(), 'scripts', 'opencode_it_csv_creator.py')
      rows = await new Promise<FlashcardRow[]>((resolve) => {
        const py = spawn('python', [scriptPath, text, '-s', subject, '-c', chapter])
        let output = ''
        py.stdout.on('data', (d) => { output += d.toString() })
        py.on('close', (code) => {
          if (code === 0 && output.trim()) {
            // Read CSV back into rows
            const lines = output.trim().split(/\r?\n/)
            if (lines.length > 1) {
              const res: FlashcardRow[] = lines.slice(1).map((line) => {
                const parts = line.split('","').map((p) => p.replace(/^"|"$/g, ''))
                return {
                  front: parts[0] || '',
                  back: parts[1] || '',
                  chapter: parts[2] || chapter,
                  subject: parts[3] || subject,
                  lesson: parts[4] || 'Module 1',
                  type: parts[5] || 'concept',
                  mc_correct: parts[6] || '',
                  mc_distractor1: parts[7] || '',
                  mc_distractor2: parts[8] || '',
                  mc_distractor3: parts[9] || '',
                  tf_answer: parts[10] || '',
                  enum_items: parts[11] || '',
                  id_answer: parts[12] || '',
                  id_variants: parts[13] || '',
                }
              })
              resolve(res)
              return
            }
          }
          resolve([])
        })
        py.on('error', () => resolve([]))
      })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'OpenCode AI could not parse the document. Ensure OpenCode server is running on port 4096.',
      }, { status: 503 })
    }

    const csvOutput = rowsToCSV(rows)

    return NextResponse.json({
      success: true,
      count: rows.length,
      rows,
      csv: csvOutput,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error during AI CSV parsing.',
    }, { status: 500 })
  }
}
