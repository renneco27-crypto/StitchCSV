const EXPECTED_COLS = 15

const CSV_HEADER = [
  'front', 'back', 'chapter', 'subject', 'lesson', 'type',
  'mc_correct', 'mc_distractor1', 'mc_distractor2', 'mc_distractor3',
  'tf_answer', 'explanation', 'enum_items', 'id_answer', 'id_variants',
].join(',')

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}
function quoteField(val: string): string {
  if (!val) return ''
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes(' ')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}

const KNOWN_TYPES = new Set([
  'definition', 'concept', 'formula', 'process', 'list', 'keyword',
  'multiple_choice', 'mc', 'true_false', 'tf', 'enumeration', 'enum', 'identification', 'id'
])

function fixRow(row: string[]): string[] {
  let r = [...row]

  // If short row where type is in column 2 (e.g. front, back, type)
  if (r.length === 3 && KNOWN_TYPES.has(r[2]?.toLowerCase().trim())) {
    r = [r[0], r[1], '', '', '', r[2]]
  } else if (r.length === 4 && KNOWN_TYPES.has(r[3]?.toLowerCase().trim())) {
    r = [r[0], r[1], r[2], '', '', r[3]]
  }

  const type = (r[5] || '').toLowerCase().trim().replace(/"/g, '')
  const cols = r.length

  if (cols === EXPECTED_COLS) return r

  if (cols === 16) {
    if (type === 'identification') {
      const answer = r[14] || ''
      const variants = r[15] || ''
      return [r[0], r[1], r[2], r[3], r[4], r[5], '', '', '', '', '', '', '', answer, variants]
    }
    return r.slice(0, EXPECTED_COLS)
  }

  if (cols === 14) {
    return [...r.slice(0, 11), '', ...r.slice(11)]
  }

  if (cols < 14) {
    const padded = [...r, ...Array(14 - cols).fill('')]
    return [...padded.slice(0, 11), '', ...padded.slice(11)]
  }

  return r
}

function splitCSVRows(text: string): string[] {
  const rows: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '""'
        i++
      } else {
        inQuotes = !inQuotes
        cur += '"'
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (cur.trim()) rows.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) rows.push(cur.trim())
  return rows
}

export function auditAndFixCSV(csvText: string): string {
  const lines = splitCSVRows(csvText.trim())

  if (!lines.length) return ''

  let dataStart = 0
  const firstLine = lines[0].trim()
  if (firstLine.startsWith('front') || firstLine.includes('quiz_type')) {
    dataStart = 1
  }

  const fixedRows: string[][] = []

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const row = parseCSVRow(line)
    fixedRows.push(fixRow(row))
  }

  return [CSV_HEADER, ...fixedRows.map(r => r.map(quoteField).join(','))].join('\n')
}

export function isCSVInput(text: string): boolean {
  const firstLine = text.trim().split(/\r?\n/)[0]?.trim() ?? ''
  return /^front[,\t]/.test(firstLine)
}
