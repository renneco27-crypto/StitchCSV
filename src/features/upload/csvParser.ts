import type { Deck, Card, QuizItem } from '@/lib/zodSchemas'

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
  enum_items?: string
  id_answer?: string
  id_variants?: string
}

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
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    header.forEach((key, idx) => { row[key] = values[idx] ?? '' })
    
    rows.push({
      front: row.front ?? '',
      back: row.back ?? '',
      chapter: row.chapter ?? '',
      subject: row.subject ?? '',
      lesson: row.lesson ?? '',
      type: row.type ?? 'definition',
      mc_correct: row.mc_correct ?? row.mc_correct_answer ?? '',
      mc_distractor1: row.mc_distractor1 ?? row.mc_distractor_1 ?? '',
      mc_distractor2: row.mc_distractor2 ?? row.mc_distractor_2 ?? '',
      mc_distractor3: row.mc_distractor3 ?? row.mc_distractor_3 ?? '',
      tf_answer: row.tf_answer ?? row.true_false ?? '',
      enum_items: row.enum_items ?? row.enumeration_items ?? '',
      id_answer: row.id_answer ?? row.identification_answer ?? '',
      id_variants: row.id_variants ?? row.identification_variants ?? '',
    })
  }
  return rows
}

function generateQuizItems(rows: CSVRow[], primarySubject: string): QuizItem[] {
  const quizItems: QuizItem[] = []
  
  for (const row of rows) {
    const chapter = row.chapter || 'General'
    const subject = row.subject || primarySubject

    // Multiple Choice - explicit or auto
    if (row.type === 'multiple_choice' || row.type === 'mc') {
      const correct = row.mc_correct || row.back
      const distractors = [row.mc_distractor1, row.mc_distractor2, row.mc_distractor3].filter((d): d is string => !!d)
      if (correct && distractors.length === 3) {
        quizItems.push({
          mode: 'multiple_choice',
          question: row.front,
          correct,
          distractors,
          chapter,
          subject,
        })
      }
    }

    // True/False - explicit or auto from cards
    if (row.type === 'true_false' || row.type === 'tf') {
      const answer = (row.tf_answer || row.back).toLowerCase().trim()
      const isTrue = answer === 'true' || answer === 't' || answer === 'yes' || answer === 'y'
      quizItems.push({
        mode: 'true_false',
        statement: row.front,
        falseVersion: row.front,
        explanation: isTrue ? 'This statement is true.' : 'This statement is false.',
        correct: isTrue,
        chapter,
        subject,
      })
    }

    // Enumeration
    if (row.type === 'enumeration' || row.type === 'enum' || row.type === 'list') {
      const items = (row.enum_items || row.back)
        .split(';')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      if (items.length >= 2) {
        quizItems.push({
          mode: 'enumeration',
          topic: row.front,
          items,
          chapter,
          subject,
        })
      }
    }

    // Identification
    if (row.type === 'identification' || row.type === 'id') {
      const variants = row.id_variants
        ? row.id_variants.split(';').map((s) => s.trim()).filter(Boolean)
        : []
      quizItems.push({
        mode: 'identification',
        definition: row.front,
        answer: row.id_answer || row.back,
        acceptVariants: variants,
        chapter,
        subject,
      })
    }
  }
  return quizItems
}

export function parseCSVFile(
  text: string,
  title: string
): { deck: Deck; cards: Card[] } {
  const rows = parseCSV(text)
  const subjects = [...new Set(rows.map((r) => r.subject).filter(Boolean))]
  const primarySubject = subjects[0] ?? 'General'

  const deckId = `deck-csv-${Date.now()}`
  const uploadedAt = new Date().toISOString()

  const cards: Card[] = rows.map((row, i) => ({
    id: `card-csv-${Date.now()}-${i}`,
    deckId,
    front: row.front || '',
    back: row.back || '',
    chapter: row.chapter || '',
    subject: row.subject || primarySubject,
    lesson: row.lesson || '',
    type: (['definition', 'concept', 'formula', 'process', 'list', 'true_false'].includes(row.type)
      ? (row.type as Card['type'])
      : 'definition') as Card['type'],
    mastery: 0,
    status: 'new' as const,
    know: null,
    correctCount: 0,
    wrongCount: 0,
    lastReviewed: null,
    nextReview: null,
  }))

  const quizItems = generateQuizItems(rows, primarySubject)

  const deck: Deck = {
    id: deckId,
    title,
    subject: primarySubject,
    uploadedAt,
    cards: [],
    quizItems,
  }

  return { deck, cards }
}