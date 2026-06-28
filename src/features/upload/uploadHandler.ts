import { parseCSVFile } from './csvParser'
import { createDeck } from '@/db/deckRepository'
import { createCards } from '@/db/cardRepository'
import type { Deck } from '@/lib/zodSchemas'

export class UploadError extends Error {
  code: string
  step: number
  constructor(code: string, message: string, step: number) {
    super(message)
    this.name = 'UploadError'
    this.code = code
    this.step = step
  }
}

async function convertFile(file: File, onProgress?: (step: string) => void): Promise<string> {
  onProgress?.('Converting…')
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/convert-docx', { method: 'POST', body: formData })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Conversion failed' }))
    throw new UploadError('CONVERSION_ERROR', errData.error || `Server error: ${res.status}`, 1)
  }

  onProgress?.('Parsing converted content…')
  return res.text()
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export async function handleUpload(
  file: File,
  onProgress?: (step: string) => void,
  customTitle?: string
): Promise<string> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const title = customTitle || file.name.replace(/\.(csv|docx|doc|txt)$/i, '')

    let csvText: string

    if (ext === 'csv') {
      onProgress?.('Reading file…')
      csvText = await readFileText(file)
      onProgress?.('Parsing CSV…')
    } else {
      csvText = await convertFile(file, onProgress)
    }

    const { deck, cards } = parseCSVFile(csvText, title)

    onProgress?.('Saving…')
    const deckWithoutCards: Deck = { ...deck, cards: [] }
    await createDeck(deckWithoutCards)
    await createCards(cards)

    return deck.id
  } catch (err) {
    if (err instanceof UploadError) throw err
    const message = err instanceof Error ? err.message : String(err)
    throw new UploadError('UPLOAD_ERROR', message, 0)
  }
}
