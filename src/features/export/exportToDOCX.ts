import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
         HeadingLevel, BorderStyle, WidthType, ShadingType, AlignmentType,
         VerticalAlign } from 'docx'
import { getCardsByDeck } from '@/db/cardRepository'
import { useToastStore } from '@/store/toastStore'
import type { Card } from '@/lib/zodSchemas'

// ── Constants ────────────────────────────────────────────────────────────────

const TABLE_WIDTH   = 9360  // full content width (DXA, 1" margins on 8.5" page)
const COL_TERM      = 3120  // ~33%
const COL_DEF       = 4680  // ~50%
const COL_CHAPTER   = 1080  // ~11%
const COL_STATUS    = 480   // ~6%

const ACCENT        = '2E75B6'   // blue header fill
const HEADER_TEXT   = 'FFFFFF'   // white header text
const ROW_ALT       = 'EBF3FB'   // light blue alternate row
const BORDER_COLOR  = 'CCCCCC'

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR }
const borders = { top: border, bottom: border, left: border, right: border }
const cellMargins = { top: 80, bottom: 80, left: 140, right: 140 }

// ── Helpers ──────────────────────────────────────────────────────────────────

function sortByChapterThenFront(a: Card, b: Card): number {
  const c = a.chapter.localeCompare(b.chapter)
  return c !== 0 ? c : a.front.localeCompare(b.front)
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: cellMargins,
    shading: { fill: ACCENT, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, color: HEADER_TEXT, size: 20, font: 'Arial' })],
      }),
    ],
  })
}

function dataCell(text: string, width: number, shade?: string): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: cellMargins,
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || '—', size: 18, font: 'Arial' })],
      }),
    ],
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: '1F3864', font: 'Arial' })],
  })
}

function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: 160 } })
}

// ── Table builders ────────────────────────────────────────────────────────────

function buildTermDefTable(cards: Card[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Term / Question', COL_TERM + COL_STATUS),
      headerCell('Answer / Definition', COL_DEF + COL_CHAPTER),
    ],
  })

  const dataRows = cards.map((c, i) => {
    const shade = i % 2 === 1 ? ROW_ALT : undefined
    return new TableRow({
      children: [
        dataCell(c.front, COL_TERM + COL_STATUS, shade),
        dataCell(c.back,  COL_DEF + COL_CHAPTER, shade),
      ],
    })
  })

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [COL_TERM + COL_STATUS, COL_DEF + COL_CHAPTER],
    rows: [headerRow, ...dataRows],
  })
}

function buildFullTable(cards: Card[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Term / Question', COL_TERM),
      headerCell('Answer / Definition', COL_DEF),
      headerCell('Chapter', COL_CHAPTER),
      headerCell('Status', COL_STATUS),
    ],
  })

  const dataRows = cards.map((c, i) => {
    const shade = i % 2 === 1 ? ROW_ALT : undefined
    return new TableRow({
      children: [
        dataCell(c.front,   COL_TERM,    shade),
        dataCell(c.back,    COL_DEF,     shade),
        dataCell(c.chapter, COL_CHAPTER, shade),
        dataCell(c.status,  COL_STATUS,  shade),
      ],
    })
  })

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [COL_TERM, COL_DEF, COL_CHAPTER, COL_STATUS],
    rows: [headerRow, ...dataRows],
  })
}

function buildPlaceholder(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: 'No cards in this section.', italics: true, color: '888888', font: 'Arial', size: 18 })],
  })
}

// ── Public export ─────────────────────────────────────────────────────────────

export async function exportDeckToDOCX(deckId: string, deckTitle: string): Promise<void> {
  const cards = await getCardsByDeck(deckId)

  const knownCards  = cards.filter(c => c.know === true).sort(sortByChapterThenFront)
  const reviewCards = cards.filter(c => c.know === false).sort(sortByChapterThenFront)
  const allCards    = [...cards].sort(sortByChapterThenFront)

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 20 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          sectionHeading(`${deckTitle}`),
          spacer(),

          sectionHeading(`Cards I Know (${knownCards.length})`),
          knownCards.length > 0 ? buildTermDefTable(knownCards) : buildPlaceholder(),
          spacer(),

          sectionHeading(`Cards to Review (${reviewCards.length})`),
          reviewCards.length > 0 ? buildTermDefTable(reviewCards) : buildPlaceholder(),
          spacer(),

          sectionHeading(`All Cards (${allCards.length})`),
          allCards.length > 0 ? buildFullTable(allCards) : buildPlaceholder(),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${deckTitle.replace(/\s+/g, '_')}_export.docx`
  const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename })
  } else {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  useToastStore.getState().addToast('Export ready — check your downloads', 'success')
}