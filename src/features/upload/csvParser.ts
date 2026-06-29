import type { Deck, Card, QuizItem } from '@/lib/zodSchemas'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CSVRow {
  front: string
  back: string
  chapter: string
  subject: string
  lesson: string
  type: string
  mc_correct?: string
  mc_distractor1?: string
  mc_distractor2?: string
  mc_distractor3?: string
  tf_answer?: string
  explanation?: string
  enum_items?: string
  id_answer?: string
  id_variants?: string
}

// Types that should appear in flashcard mode (have a readable front/back)
const FLASHCARD_TYPES = new Set(['definition', 'concept', 'formula', 'process', 'list',
  'multiple_choice', 'mc', 'true_false', 'tf', 'enumeration', 'enum', 'identification', 'id'])

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())

  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    header.forEach((key, idx) => {
      row[key] = (values[idx] ?? '').trim()
    })

    rows.push({
      front:         row.front          ?? '',
      back:          row.back           ?? '',
      chapter:       row.chapter        ?? '',
      subject:       row.subject        ?? '',
      lesson:        row.lesson         ?? '',
      type:          row.type           ?? 'definition',
      mc_correct:    row.mc_correct     ?? row.mc_correct_answer  ?? '',
      mc_distractor1:row.mc_distractor1 ?? row.mc_distractor_1   ?? '',
      mc_distractor2:row.mc_distractor2 ?? row.mc_distractor_2   ?? '',
      mc_distractor3:row.mc_distractor3 ?? row.mc_distractor_3   ?? '',
      tf_answer:     row.tf_answer      ?? row.true_false         ?? '',
      explanation:   row.explanation    ?? row.tf_explanation     ?? '',
      enum_items:    row.enum_items     ?? row.enumeration_items  ?? '',
      id_answer:     row.id_answer      ?? row.identification_answer   ?? '',
      id_variants:   row.id_variants    ?? row.identification_variants ?? '',
    })
  }

  return rows
}

// ─── Back-field resolver ──────────────────────────────────────────────────────
/**
 * For flashcard display, every card needs a readable "back".
 * Resolve it from whichever type-specific field has the real answer.
 * Returns null if the row should NOT appear as a flashcard at all.
 */
function resolveBack(row: CSVRow): string | null {
  const type = row.type.toLowerCase().trim()

  switch (type) {
    case 'multiple_choice':
    case 'mc':
      return row.mc_correct || row.back || null

    case 'true_false':
    case 'tf': {
      const answer = (row.tf_answer || row.back).toLowerCase().trim()
      if (!answer) return null
      const isTrue = answer === 'true' || answer === 't' || answer === 'yes'
      return isTrue ? 'True' : 'False'
    }

    case 'enumeration':
    case 'enum': {
      const raw = row.enum_items || row.back
      if (!raw) return null
      const items = raw.split(';').map(s => s.trim()).filter(Boolean)
      return items.length >= 3 ? items.join(', ') : null
    }

    case 'identification':
    case 'id':
      return row.id_answer || row.back || null

    default:
      return row.back || null
  }
}

// ─── Card builder ─────────────────────────────────────────────────────────────
/**
 * Only creates a Card for rows that have a valid front AND a resolvable back.
 * Quiz-only rows still get a card (for review mode) but are never shown
 * in the plain flashcard stack — the UI checks `card.type` to decide that.
 */
// ─── Card builder ─────────────────────────────────────────────────────────────
function buildCards(rows: CSVRow[], deckId: string, primarySubject: string): Card[] {
  const cards: Card[] = []

  rows.forEach((row, i) => {
    const front = row.front?.trim()
    if (!front) return

    const type = row.type.toLowerCase().trim()

    const back = resolveBack(row)
    if (!back) return

    const cardType = (
      ['definition', 'concept', 'formula', 'process', 'list',
       'multiple_choice', 'true_false', 'enumeration', 'identification'].includes(type)
        ? type
        : 'definition'
    ) as Card['type']

    cards.push({
      id:           `card-csv-${Date.now()}-${i}`,
      deckId,
      front,
      back,
      chapter:      row.chapter || '',
      subject:      row.subject || primarySubject,
      lesson:       row.lesson  || '',
      type:         cardType,
      mastery:      0,
      status:       'new' as const,
      know:         null,
      correctCount: 0,
      wrongCount:   0,
      lastReviewed: null,
      nextReview:   null,
      mc_correct:     row.mc_correct || '',
      mc_distractor1: row.mc_distractor1 || '',
      mc_distractor2: row.mc_distractor2 || '',
      mc_distractor3: row.mc_distractor3 || '',
      tf_answer:      row.tf_answer || '',
      enum_items:     row.enum_items || '',
      id_answer:      row.id_answer || '',
      id_variants:    row.id_variants || '',
    })
  })

  return cards
}

// ─── Quiz item builder ────────────────────────────────────────────────────────

function generateQuizItems(rows: CSVRow[], primarySubject: string): QuizItem[] {
  const quizItems: QuizItem[] = []

  for (const row of rows) {
    const chapter = row.chapter || 'General'
    const subject = row.subject || primarySubject
    const type    = row.type.toLowerCase().trim()

    // ── Multiple Choice ───────────────────────────────────────────────────────
    if (type === 'multiple_choice' || type === 'mc') {
      const correct     = row.mc_correct || row.back
      const distractors = [row.mc_distractor1, row.mc_distractor2, row.mc_distractor3]
        .filter((d): d is string => !!d?.trim())

      if (correct && distractors.length === 3) {
        quizItems.push({
          mode:        'multiple_choice',
          question:    row.front,
          correct,
          distractors,
          chapter,
          subject,
        })
      } else {
        console.warn(`[csvParser] Skipping MC row — missing correct answer or distractors: "${row.front}"`)
      }
    }

    // ── True / False ──────────────────────────────────────────────────────────
    if (type === 'true_false' || type === 'tf') {
      const raw    = (row.tf_answer || row.back).toLowerCase().trim()
      const isTrue = raw === 'true' || raw === 't' || raw === 'yes' || raw === 'y'

      if (!raw) {
        console.warn(`[csvParser] Skipping TF row — no tf_answer: "${row.front}"`)
        continue
      }

      quizItems.push({
        mode:         'true_false',
        statement:    row.front,
        falseVersion: row.front,
        explanation:  row.explanation || (isTrue ? 'This statement is true.' : 'This statement is false.'),
        correct:      isTrue,
        chapter,
        subject,
      })
    }

    // ── Enumeration ───────────────────────────────────────────────────────────
    if (type === 'enumeration' || type === 'enum') {
      console.log(`[enum] front="${row.front.slice(0,30)}" enum_items="${row.enum_items}"`)
      // Fallback: if enum_items is empty but id_variants has content, the CSV
      // row probably has too many commas shifting data right by one column.
      const raw = row.enum_items || row.id_variants || row.back
      if (!raw) {
        console.warn(`[csvParser] Skipping enumeration row — no enum_items: "${row.front}"`)
        continue
      }

      const items = raw
        .split(';')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

      // Guard: must have at least 3 items to be a real enumeration
      if (items.length < 3) {
        console.warn(`[csvParser] Skipping enumeration row — fewer than 3 items (${items.length}): "${row.front}"`)
        continue
      }

      quizItems.push({
        mode:    'enumeration',
        topic:   row.front,
        items,
        chapter,
        subject,
      })
    }

    // ── Identification ────────────────────────────────────────────────────────
    if (type === 'identification' || type === 'id') {
      const answer = row.id_answer || row.back
      if (!answer) {
        console.warn(`[csvParser] Skipping identification row — no id_answer: "${row.front}"`)
        continue
      }

      const variants = row.id_variants
        ? row.id_variants.split(';').map(s => s.trim()).filter(Boolean)
        : [answer.toLowerCase()]

      quizItems.push({
        mode:           'identification',
        definition:     row.front,
        answer,
        acceptVariants: variants,
        chapter,
        subject,
      })
    }

    // ── Definition / list — also add as a quiz item (used in review quiz) ─────
   
  }

  return quizItems
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseCSVFile(
  text: string,
  title: string,
): { deck: Deck; cards: Card[] } {
  const rows          = parseCSV(text)
  const subjects      = [...new Set(rows.map(r => r.subject).filter(Boolean))]
  const primarySubject = subjects[0] ?? 'General'

  const deckId     = `deck-csv-${Date.now()}`
  const uploadedAt = new Date().toISOString()

  // Cards: only rows with a valid front + resolvable back
  const cards = buildCards(rows, deckId, primarySubject)

  // Quiz items: structured quiz data per type
  const quizItems = generateQuizItems(rows, primarySubject)

  const deck: Deck = {
    id:          deckId,
    title,
    subject:     primarySubject,
    uploadedAt,
    cards:       [],
    quizItems,
  }

  return { deck, cards }
}

// ─── Helper exported for UI filtering ────────────────────────────────────────
/**
 * Call this in your flashcard stack component to filter out quiz-only cards.
 * Flashcard mode should only show definition/concept/formula/process/list types.
 */
export function isFlashcardType(type: string): boolean {
  return FLASHCARD_TYPES.has(type.toLowerCase().trim())
}

/**
 * Call this in your quiz component to get only quiz-relevant cards.
 */
export function isQuizType(type: string): boolean {
  const t = type.toLowerCase().trim()
  return ['multiple_choice', 'mc', 'true_false', 'tf', 'enumeration', 'enum', 'identification', 'id'].includes(t)
}