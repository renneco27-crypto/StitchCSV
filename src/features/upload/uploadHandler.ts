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
    onProgress?.('Reading file…')
    const text = await readFileText(file)

    onProgress?.('Parsing CSV…')
    const title = customTitle || file.name.replace(/\.csv$/i, '')
    const { deck, cards } = parseCSVFile(text, title)

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
