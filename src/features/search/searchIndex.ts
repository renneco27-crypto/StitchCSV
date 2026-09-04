import Fuse, { type FuseResult } from 'fuse.js'
import type { Card } from '@/lib/zodSchemas'
import { SEARCH_THRESHOLD, SEARCH_MIN_CHARS } from '@/lib/constants'

export function buildSearchIndex(cards: Card[]): Fuse<Card> {
  return new Fuse(cards, {
    keys: ['front', 'back', 'chapter', 'subject', 'lesson'],
    threshold: SEARCH_THRESHOLD,
    includeMatches: true,
    minMatchCharLength: 2,
  })
}

export function searchCards(
  fuse: Fuse<Card>,
  query: string
): FuseResult<Card>[] {
  const trimmed = query.trim()
  if (trimmed.length < SEARCH_MIN_CHARS) return []
  return fuse.search(trimmed)
}

export interface SearchableDeck {
  id: string
  title: string
  subject: string
  author_name?: string
  cardCount?: number
  isFeed?: boolean
}

export interface SearchableFolder {
  id: string
  name: string
  created_by?: string
  deck_count?: number
}

export function buildDeckSearchIndex(decks: SearchableDeck[]): Fuse<SearchableDeck> {
  return new Fuse(decks, {
    keys: ['title', 'subject', 'author_name'],
    threshold: SEARCH_THRESHOLD,
    includeMatches: true,
    minMatchCharLength: 2,
  })
}

export function buildFolderSearchIndex(folders: SearchableFolder[]): Fuse<SearchableFolder> {
  return new Fuse(folders, {
    keys: ['name'],
    threshold: SEARCH_THRESHOLD,
    includeMatches: true,
    minMatchCharLength: 2,
  })
}

