import { z } from 'zod'

export const CardTypeSchema = z.enum(['definition', 'concept', 'formula', 'process', 'list'])
export type CardType = z.infer<typeof CardTypeSchema>

export const CardStatusSchema = z.enum(['new', 'learning', 'mastered'])
export type CardStatus = z.infer<typeof CardStatusSchema>

export const QuizModeSchema = z.enum(['multiple_choice', 'identification', 'true_false', 'enumeration'])
export type QuizMode = z.infer<typeof QuizModeSchema>

export const AnswerStateSchema = z.enum(['unanswered', 'correct', 'wrong'])
export type AnswerState = z.infer<typeof AnswerStateSchema>

export const ToastTypeSchema = z.enum(['success', 'error', 'info', 'warning'])
export type ToastType = z.infer<typeof ToastTypeSchema>

export const StudyModeSchema = z.enum(['flashcard', 'mc', 'identification', 'true_false', 'enumeration'])
export type StudyMode = z.infer<typeof StudyModeSchema>

export const CardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  front: z.string(),
  back: z.string(),
  chapter: z.string(),
  subject: z.string(),
  lesson: z.string(),
  type: CardTypeSchema,
  mastery: z.number().min(0).max(5),
  status: CardStatusSchema,
  know: z.boolean().nullable(),
  correctCount: z.number().min(0),
  wrongCount: z.number().min(0),
  lastReviewed: z.string().nullable(),
  nextReview: z.string().nullable(),
})
export type Card = z.infer<typeof CardSchema>

export const MultipleChoiceItemSchema = z.object({
  mode: z.literal('multiple_choice'),
  question: z.string(),
  correct: z.string(),
  distractors: z.array(z.string()).length(3),
  chapter: z.string(),
  subject: z.string(),
})
export type MultipleChoiceItem = z.infer<typeof MultipleChoiceItemSchema>

export const TrueFalseItemSchema = z.object({
  mode: z.literal('true_false'),
  statement: z.string(),
  falseVersion: z.string(),
  explanation: z.string(),
  correct: z.boolean(),
  chapter: z.string(),
  subject: z.string(),
})
export type TrueFalseItem = z.infer<typeof TrueFalseItemSchema>

export const EnumerationItemSchema = z.object({
  mode: z.literal('enumeration'),
  topic: z.string(),
  items: z.array(z.string()).min(2),
  chapter: z.string(),
  subject: z.string(),
})
export type EnumerationItem = z.infer<typeof EnumerationItemSchema>

export const IdentificationItemSchema = z.object({
  mode: z.literal('identification'),
  definition: z.string(),
  answer: z.string(),
  acceptVariants: z.array(z.string()),
  chapter: z.string(),
  subject: z.string(),
})
export type IdentificationItem = z.infer<typeof IdentificationItemSchema>

export const QuizItemSchema = z.discriminatedUnion('mode', [
  MultipleChoiceItemSchema,
  TrueFalseItemSchema,
  EnumerationItemSchema,
  IdentificationItemSchema,
])
export type QuizItem = z.infer<typeof QuizItemSchema>

export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  uploadedAt: z.string(),
  cards: z.array(CardSchema),
  quizItems: z.array(QuizItemSchema),
})
export type Deck = z.infer<typeof DeckSchema>

export const DeckStatsSchema = z.object({
  deckId: z.string(),
  totalCards: z.number(),
  cardsReviewed: z.number(),
  correct: z.number(),
  wrong: z.number(),
  accuracy: z.number().min(0).max(100),
  mcScore: z.number().min(0).max(100),
  identificationCorrect: z.number(),
  enumerationCompleted: z.number(),
  lastStudied: z.string(),
  studyStreak: z.number(),
  masteredCount: z.number(),
  dailyCounts: z.record(z.string(), z.number()),
})
export type DeckStats = z.infer<typeof DeckStatsSchema>

export const FlashcardSessionSchema = z.object({
  deckId: z.string().nullable(),
  cycleNumber: z.number(),
  batchIndex: z.number(),
  cardIndex: z.number(),
  completedCardIds: z.array(z.string()),
  isFlipped: z.boolean(),
})
export type FlashcardSession = z.infer<typeof FlashcardSessionSchema>

export const ToastSchema = z.object({
  id: z.string(),
  message: z.string(),
  type: ToastTypeSchema,
})
export type Toast = z.infer<typeof ToastSchema>

export const MCQuestionSchema = z.object({
  question: z.string(),
  correct: z.string(),
  options: z.array(z.object({
    label: z.enum(['A', 'B', 'C', 'D']),
    text: z.string(),
  })),
  correctIndex: z.number().min(0).max(3),
})
export type MCQuestion = z.infer<typeof MCQuestionSchema>

export const MCOptionSchema = z.object({
  label: z.enum(['A', 'B', 'C', 'D']),
  text: z.string(),
})
export type MCOption = z.infer<typeof MCOptionSchema>

export const CycleHistoryEntrySchema = z.object({
  id: z.number().optional(),
  deckId: z.string(),
  cycleNumber: z.number(),
  completedAt: z.string(),
  knownIds: z.array(z.string()),
  unknownIds: z.array(z.string()),
  knownCount: z.number(),
  unknownCount: z.number(),
})
export type CycleHistoryEntry = z.infer<typeof CycleHistoryEntrySchema>
