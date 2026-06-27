import Dexie, { type Table } from 'dexie'
import type { Deck, Card, FlashcardSession, DeckStats, CycleHistoryEntry } from '@/lib/zodSchemas'

export class StitchDB extends Dexie {
  decks!: Table<Deck, string>
  cards!: Table<Card, string>
  sessions!: Table<FlashcardSession, string>
  stats!: Table<DeckStats, string>
  cycleHistory!: Table<CycleHistoryEntry, number>

  constructor() {
    super('StitchDB')
    this.version(1).stores({
      decks: '++id, title, subject, uploadedAt',
      cards: '++id, deckId, status, mastery, know, nextReview',
      sessions: '++id, deckId',
      stats: '++id, deckId',
      cycleHistory: '++id, deckId, cycleNumber',
    })
  }
}

export const db = new StitchDB()
