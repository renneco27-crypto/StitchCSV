import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel } from 'docx'
import { getCardsByDeck } from '@/db/cardRepository'
import { useToastStore } from '@/store/toastStore'
import type { Card } from '@/lib/zodSchemas'

function sortByChapterThenFront(a: Card, b: Card): number {
  const chapterCmp = a.chapter.localeCompare(b.chapter)
  if (chapterCmp !== 0) return chapterCmp
  return a.front.localeCompare(b.front)
}

function buildTermDefTable(cards: Card[]): Table {
  return new Table({
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Term', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Definition', bold: true })] })] }),
        ],
      }),
      ...cards.map(
        (c) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(c.front)] }),
              new TableCell({ children: [new Paragraph(c.back)] }),
            ],
          })
      ),
    ],
  })
}

function buildFullTable(cards: Card[]): Table {
  return new Table({
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Term', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Definition', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Chapter', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })] }),
        ],
      }),
      ...cards.map(
        (c) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(c.front)] }),
              new TableCell({ children: [new Paragraph(c.back)] }),
              new TableCell({ children: [new Paragraph(c.chapter)] }),
              new TableCell({ children: [new Paragraph(c.status)] }),
            ],
          })
      ),
    ],
  })
}

function buildPlaceholder(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: 'No cards in this section.', italics: true })] })
}

export async function exportDeckToDOCX(deckId: string, deckTitle: string): Promise<void> {
  const cards = await getCardsByDeck(deckId)

  const knownCards = cards.filter((c) => c.know === true).sort(sortByChapterThenFront)
  const reviewCards = cards.filter((c) => c.know === false).sort(sortByChapterThenFront)
  const allCards = [...cards].sort(sortByChapterThenFront)

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: `Cards I Know (${knownCards.length})`, heading: HeadingLevel.HEADING_1 }),
          knownCards.length > 0 ? buildTermDefTable(knownCards) : buildPlaceholder(),
        ],
      },
      {
        children: [
          new Paragraph({ text: `Cards to Review (${reviewCards.length})`, heading: HeadingLevel.HEADING_1 }),
          reviewCards.length > 0 ? buildTermDefTable(reviewCards) : buildPlaceholder(),
        ],
      },
      {
        children: [
          new Paragraph({ text: `All Cards (${allCards.length})`, heading: HeadingLevel.HEADING_1 }),
          buildFullTable(allCards),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${deckTitle.replace(/\s+/g, '_')}_export.docx`
  link.click()
  URL.revokeObjectURL(url)

  useToastStore.getState().addToast('Export ready — check your downloads', 'success')
}
