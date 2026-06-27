import { PDFDocument, PDFPage, rgb } from 'pdf-lib'
import type { ComplaintForExport, EmbedResult, PdfFonts } from './types'
import { drawWrappedText, wrapText } from './text-layout'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const LABEL_X = MARGIN
const VALUE_X = MARGIN + 110
const LINE_HEIGHT = 14
const SECTION_GAP = 10
const HEADING_SIZE = 16
const SECTION_HEADING_SIZE = 11
const BODY_SIZE = 9

type Cursor = { page: PDFPage; y: number }

export function renderComplaintDetailPages(
	pdfDoc: PDFDocument,
	data: ComplaintForExport,
	fonts: PdfFonts,
	embedClassifications: Record<string, EmbedResult>
): void {
	let cursor = newPage(pdfDoc)
	cursor = drawHeading(cursor, data, fonts, pdfDoc)
	cursor = drawGeneralSection(cursor, data, fonts, pdfDoc)
	cursor = drawFilesSection(cursor, data, fonts, embedClassifications, pdfDoc)
	cursor = drawActivitySection(cursor, data, fonts, pdfDoc)
	void cursor
}

function newPage(pdfDoc: PDFDocument): Cursor {
	const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
	return { page, y: PAGE_HEIGHT - MARGIN }
}

function ensureSpace(cursor: Cursor, pdfDoc: PDFDocument, needed: number): Cursor {
	if (cursor.y - needed < MARGIN) return newPage(pdfDoc)
	return cursor
}

function drawHeading(cursor: Cursor, data: ComplaintForExport, fonts: PdfFonts, pdfDoc: PDFDocument): Cursor {
	const c = data.complaint
	cursor = ensureSpace(cursor, pdfDoc, HEADING_SIZE + LINE_HEIGHT)
	cursor.y -= HEADING_SIZE
	cursor.page.drawText(`Complaint #${c.number}`, {
		x: LABEL_X, y: cursor.y, size: HEADING_SIZE, font: fonts.bold
	})
	cursor.page.drawText(c.status.toUpperCase(), {
		x: PAGE_WIDTH - MARGIN - 80, y: cursor.y, size: HEADING_SIZE, font: fonts.bold
	})
	cursor.y -= SECTION_GAP
	cursor = drawHr(cursor)
	return cursor
}

function drawHr(cursor: Cursor): Cursor {
	cursor.page.drawLine({
		start: { x: MARGIN, y: cursor.y },
		end:   { x: PAGE_WIDTH - MARGIN, y: cursor.y },
		thickness: 0.5,
		color: rgb(0.8, 0.8, 0.8)
	})
	cursor.y -= SECTION_GAP
	return cursor
}

function drawSectionHeading(cursor: Cursor, label: string, fonts: PdfFonts, pdfDoc: PDFDocument): Cursor {
	cursor = ensureSpace(cursor, pdfDoc, SECTION_HEADING_SIZE + SECTION_GAP)
	cursor.y -= SECTION_HEADING_SIZE
	cursor.page.drawText(label, {
		x: LABEL_X, y: cursor.y, size: SECTION_HEADING_SIZE, font: fonts.bold
	})
	cursor.y -= 4
	return cursor
}

function drawRow(cursor: Cursor, label: string, value: string, fonts: PdfFonts, pdfDoc: PDFDocument): Cursor {
	const valueLines = wrapText(value || '-', fonts.regular, BODY_SIZE, PAGE_WIDTH - VALUE_X - MARGIN)
	const needed = Math.max(LINE_HEIGHT, valueLines.length * LINE_HEIGHT)
	cursor = ensureSpace(cursor, pdfDoc, needed)
	cursor.page.drawText(label, {
		x: LABEL_X, y: cursor.y - LINE_HEIGHT, size: BODY_SIZE, font: fonts.bold
	})
	const result = drawWrappedText(cursor.page, valueLines, {
		x: VALUE_X,
		y: cursor.y,
		font: fonts.regular,
		size: BODY_SIZE,
		lineHeight: LINE_HEIGHT
	})
	cursor.y = result.endY
	return cursor
}

function drawGeneralSection(cursor: Cursor, data: ComplaintForExport, fonts: PdfFonts, pdfDoc: PDFDocument): Cursor {
	const c = data.complaint
	cursor = drawSectionHeading(cursor, 'General', fonts, pdfDoc)
	cursor = drawRow(cursor, 'Number', String(c.number), fonts, pdfDoc)
	cursor = drawRow(cursor, 'Status', c.status, fonts, pdfDoc)
	cursor = drawRow(cursor, 'Customer', data.customer?.email ?? c.customer_id, fonts, pdfDoc)
	cursor = drawRow(
		cursor,
		'Order',
		data.order
			? `${data.order.display_id} (created ${data.order.created_at.toISOString().slice(0, 10)})`
			: c.order_id ?? '-',
		fonts,
		pdfDoc
	)
	cursor = drawRow(cursor, 'Product', data.product?.title ?? c.product_id ?? '-', fonts, pdfDoc)
	cursor = drawRow(cursor, 'Actionable', c.actionable ? 'Yes' : 'No', fonts, pdfDoc)
	cursor = drawRow(cursor, 'Reportable', c.reportable ? 'Yes' : 'No', fonts, pdfDoc)
	cursor = drawRow(cursor, 'Tags', c.tags.map(t => t.value).join(', ') || '-', fonts, pdfDoc)
	cursor = drawRow(cursor, 'Description', c.description, fonts, pdfDoc)
	cursor.y -= SECTION_GAP
	cursor = drawHr(cursor)
	return cursor
}

function drawFilesSection(
	cursor: Cursor,
	data: ComplaintForExport,
	fonts: PdfFonts,
	embedClassifications: Record<string, EmbedResult>,
	pdfDoc: PDFDocument
): Cursor {
	cursor = drawSectionHeading(cursor, 'Files', fonts, pdfDoc)
	if (data.complaint.documents.length === 0) {
		cursor = ensureSpace(cursor, pdfDoc, LINE_HEIGHT)
		cursor.y -= LINE_HEIGHT
		cursor.page.drawText('No documents attached.', {
			x: LABEL_X, y: cursor.y, size: BODY_SIZE, font: fonts.regular, color: rgb(0.5, 0.5, 0.5)
		})
	} else {
		for (const d of data.complaint.documents) {
			cursor = ensureSpace(cursor, pdfDoc, LINE_HEIGHT)
			cursor.y -= LINE_HEIGHT
			cursor.page.drawText(d.filename, {
				x: LABEL_X, y: cursor.y, size: BODY_SIZE, font: fonts.regular
			})
			const result = embedClassifications[d.id]
			if (result && result.embedded === false) {
				const filenameWidth = fonts.regular.widthOfTextAtSize(d.filename, BODY_SIZE)
				cursor.page.drawText('(NOT EXPORTABLE)', {
					x: LABEL_X + filenameWidth + 8,
					y: cursor.y,
					size: BODY_SIZE,
					font: fonts.bold,
					color: rgb(0.8, 0.1, 0.1)
				})
			}
		}
	}
	cursor.y -= SECTION_GAP
	cursor = drawHr(cursor)
	return cursor
}

function drawActivitySection(cursor: Cursor, data: ComplaintForExport, fonts: PdfFonts, pdfDoc: PDFDocument): Cursor {
	cursor = drawSectionHeading(cursor, 'Activity', fonts, pdfDoc)
	if (data.complaint.activity.length === 0) {
		cursor = ensureSpace(cursor, pdfDoc, LINE_HEIGHT)
		cursor.y -= LINE_HEIGHT
		cursor.page.drawText('No activity.', {
			x: LABEL_X, y: cursor.y, size: BODY_SIZE, font: fonts.regular, color: rgb(0.5, 0.5, 0.5)
		})
		return cursor
	}
	for (const entry of data.complaint.activity) {
		const when = entry.created_at.toISOString().replace('T', ' ').slice(0, 16)
		const who  = entry.user?.email ?? entry.user?.id ?? '—'
		const head = `${when}  by ${who}  ${entry.type.toUpperCase()}`
		cursor = ensureSpace(cursor, pdfDoc, LINE_HEIGHT)
		cursor.y -= LINE_HEIGHT
		cursor.page.drawText(head, {
			x: LABEL_X, y: cursor.y, size: BODY_SIZE, font: fonts.bold
		})
		if (entry.note) {
			const noteLines = wrapText(entry.note, fonts.regular, BODY_SIZE, PAGE_WIDTH - VALUE_X - MARGIN)
			const needed = noteLines.length * LINE_HEIGHT
			cursor = ensureSpace(cursor, pdfDoc, needed)
			const result = drawWrappedText(cursor.page, noteLines, {
				x: VALUE_X,
				y: cursor.y,
				font: fonts.regular,
				size: BODY_SIZE,
				lineHeight: LINE_HEIGHT
			})
			cursor.y = result.endY
		}
	}
	return cursor
}
