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

function fixRow(row: string[]): string[] {
  const type = (row[5] || '').toLowerCase().trim().replace(/"/g, '')
  const cols = row.length

  if (cols === EXPECTED_COLS) return row

  if (cols === 16) {
    if (type === 'identification') {
      const answer = row[14] || ''
      const variants = row[15] || ''
      return [row[0], row[1], row[2], row[3], row[4], row[5], '', '', '', '', '', '', '', answer, variants]
    }
    return row.slice(0, EXPECTED_COLS)
  }

  if (cols === 14) {
    return [...row.slice(0, 11), '', ...row.slice(11)]
  }

  if (cols < 14) {
    const padded = [...row, ...Array(14 - cols).fill('')]
    return [...padded.slice(0, 11), '', ...padded.slice(11)]
  }

  return row
}

export function auditAndFixCSV(csvText: string): string {
  const lines = csvText.trim().split(/\r?\n/)

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
  const firstLine = text.trim().split('\n')[0]?.trim() ?? ''
  return /^front[,\t]/.test(firstLine)
}
