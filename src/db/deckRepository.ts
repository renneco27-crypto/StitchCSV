import { db } from './schema'
import type { Deck } from '@/lib/zodSchemas'

export async function createDeck(deck: Deck): Promise<string> {
  try {
      await db.decks.add(deck)
      return deck.id
  } catch (err) {
    throw new Error(`Failed to create deck: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function getDeck(deckId: string): Promise<Deck | undefined> {
  try {
    const deck = await db.decks.get(deckId)
    if (!deck) return undefined
    const cards = await db.cards.where('deckId').equals(deckId).toArray()
    return { ...deck, cards }
  } catch (err) {
    throw new Error(`Failed to get deck: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function getAllDecks(): Promise<Deck[]> {
  try {
    return await db.decks
      .orderBy('uploadedAt')
      .reverse()
      .toArray()
  } catch (err) {
    throw new Error(`Failed to get all decks: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function deleteDeck(deckId: string): Promise<void> {
  try {
    await db.transaction('rw', [db.decks, db.cards, db.sessions, db.stats, db.cycleHistory], async () => {
      await db.decks.delete(deckId)
      await db.cards.where('deckId').equals(deckId).delete()
      await db.sessions.where('deckId').equals(deckId).delete()
      await db.stats.where('deckId').equals(deckId).delete()
      await db.cycleHistory.where('deckId').equals(deckId).delete()
    })
  } catch (err) {
    throw new Error(`Failed to delete deck: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function updateDeck(deckId: string, partial: Partial<Deck>): Promise<void> {
  try {
    await db.decks.update(deckId, partial)
  } catch (err) {
    throw new Error(`Failed to update deck: ${err instanceof Error ? err.message : String(err)}`)
  }
}
