import { PDFDocument, PDFPage, rgb } from 'pdf-lib'
import type { AttachmentClass, DocumentMeta, EmbedResult, PdfFonts } from './types'
import { wrapText } from './text-layout'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 36
const HEADER_FONT_SIZE = 8
const HEADER_OFFSET = 12
const TEXT_BODY_FONT_SIZE = 9
const TEXT_BODY_LINE_HEIGHT = 11

const IMAGE_DECODE_MIMES = new Set(['image/gif', 'image/bmp', 'image/tiff', 'image/webp'])

export function classify(mime: string): AttachmentClass {
	const bare = (mime ?? '').split(';')[0].trim().toLowerCase()
	if (bare === 'application/pdf') return 'pdf'
	if (bare === 'image/png' || bare === 'image/jpeg') return 'image-native'
	if (IMAGE_DECODE_MIMES.has(bare)) return 'image-decode'
	if (bare.startsWith('text/')) return 'text'
	return 'excluded'
}

export async function embedAttachment(
	pdfDoc: PDFDocument,
	complaintNumber: number,
	doc: DocumentMeta,
	bytes: Buffer | null,
	fonts: PdfFonts
): Promise<EmbedResult> {
	if (bytes === null) return { embedded: false, reason: 'fetch failed' }
	const cls = classify(doc.mime_type)
	if (cls === 'excluded') return { embedded: false, reason: `unsupported type ${doc.mime_type}` }

	let addedPages: PDFPage[] = []
	try {
		switch (cls) {
			case 'pdf':
				addedPages = await embedPdfPages(pdfDoc, bytes)
				break
			case 'image-native':
				addedPages = [await embedImageNative(pdfDoc, bytes, doc.mime_type)]
				break
			case 'image-decode':
				addedPages = [await embedImageViaJimp(pdfDoc, bytes)]
				break
			case 'text':
				addedPages = embedText(pdfDoc, bytes, fonts)
				break
		}
	} catch (e) {
		const reason = e instanceof Error ? e.message : String(e)
		return { embedded: false, reason: `decode failed: ${reason}` }
	}

	for (const page of addedPages) {
		stampHeaderFooter(page, complaintNumber, doc, fonts)
	}
	return { embedded: true, pages_added: addedPages.length }
}

async function embedPdfPages(target: PDFDocument, bytes: Buffer): Promise<PDFPage[]> {
	const src = await PDFDocument.load(new Uint8Array(bytes))
	const pages = await target.copyPages(src, src.getPageIndices())
	const added: PDFPage[] = []
	for (const p of pages) added.push(target.addPage(p))
	return added
}

async function embedImageNative(target: PDFDocument, bytes: Buffer, mime: string): Promise<PDFPage> {
	const data = new Uint8Array(bytes)
	const image = mime === 'image/png' ? await target.embedPng(data) : await target.embedJpg(data)
	const page = target.addPage([PAGE_WIDTH, PAGE_HEIGHT])
	const usableW = PAGE_WIDTH - 2 * MARGIN
	const usableH = PAGE_HEIGHT - 2 * MARGIN
	const scale = Math.min(usableW / image.width, usableH / image.height, 1)
	const w = image.width * scale
	const h = image.height * scale
	page.drawImage(image, {
		x: (PAGE_WIDTH - w) / 2,
		y: (PAGE_HEIGHT - h) / 2,
		width: w,
		height: h
	})
	return page
}

async function embedImageViaJimp(target: PDFDocument, bytes: Buffer): Promise<PDFPage> {
	// Lazily required so jimp (a heavy dep) only loads for formats pdf-lib can't
	// embed natively. Cast to the type-only import so the 1.x API stays type-checked
	// without eagerly loading the module.
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { Jimp } = require('jimp') as typeof import('jimp')
	const image = await Jimp.read(bytes)
	const pngBuf = Buffer.from(await image.getBuffer('image/png'))
	return embedImageNative(target, pngBuf, 'image/png')
}

function embedText(target: PDFDocument, bytes: Buffer, fonts: PdfFonts): PDFPage[] {
	const text = bytes.toString('utf-8')
	const usableW = PAGE_WIDTH - 2 * MARGIN
	const lines = wrapText(text, fonts.mono, TEXT_BODY_FONT_SIZE, usableW)
	const linesPerPage = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / TEXT_BODY_LINE_HEIGHT)
	const pages: PDFPage[] = []
	for (let i = 0; i < lines.length; i += linesPerPage) {
		const slice = lines.slice(i, i + linesPerPage)
		const page = target.addPage([PAGE_WIDTH, PAGE_HEIGHT])
		let y = PAGE_HEIGHT - MARGIN
		for (const line of slice) {
			y -= TEXT_BODY_LINE_HEIGHT
			page.drawText(line, { x: MARGIN, y, size: TEXT_BODY_FONT_SIZE, font: fonts.mono })
		}
		pages.push(page)
	}
	if (pages.length === 0) {
		pages.push(target.addPage([PAGE_WIDTH, PAGE_HEIGHT]))
	}
	return pages
}

function stampHeaderFooter(page: PDFPage, complaintNumber: number, doc: DocumentMeta, fonts: PdfFonts): void {
	const { height } = page.getSize()
	const grey = rgb(0.4, 0.4, 0.4)
	const headerText = `Complaint #${complaintNumber} — ${doc.filename}`
	const footerText = `Uploaded ${formatDate(doc.created_at)}`
	page.drawText(headerText, {
		x: MARGIN,
		y: height - HEADER_OFFSET,
		size: HEADER_FONT_SIZE,
		font: fonts.regular,
		color: grey
	})
	page.drawText(footerText, {
		x: MARGIN,
		y: HEADER_OFFSET,
		size: HEADER_FONT_SIZE,
		font: fonts.regular,
		color: grey
	})
}

function formatDate(d: Date): string {
	const yyyy = d.getUTCFullYear()
	const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
	const dd = String(d.getUTCDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}
