import { PDFDocument, StandardFonts } from 'pdf-lib'
import { classify, embedAttachment } from '../embed-attachment'
import type { DocumentMeta, PdfFonts } from '../types'

async function makeFonts(doc: PDFDocument): Promise<PdfFonts> {
	return {
		regular: await doc.embedFont(StandardFonts.Helvetica),
		bold:    await doc.embedFont(StandardFonts.HelveticaBold),
		mono:    await doc.embedFont(StandardFonts.Courier)
	}
}

function makeDoc(overrides: Partial<DocumentMeta> = {}): DocumentMeta {
	return {
		id: 'doc_1',
		filename: 'test.bin',
		mime_type: 'application/octet-stream',
		size_bytes: 100,
		file_key: 'key1',
		created_at: new Date('2026-06-26'),
		...overrides
	}
}

describe('classify', () => {
	it.each([
		['application/pdf',  'pdf'],
		['image/png',        'image-native'],
		['image/jpeg',       'image-native'],
		['image/gif',        'image-decode'],
		['image/bmp',        'image-decode'],
		['image/tiff',       'image-decode'],
		['image/webp',       'image-decode'],
		['text/plain',       'text'],
		['text/csv',         'text'],
		['application/zip',  'excluded'],
		['application/x-zip-compressed', 'excluded'],
		['application/octet-stream',     'excluded'],
		['video/mp4',        'excluded']
	])('classifies %s as %s', (mime, expected) => {
		expect(classify(mime)).toBe(expected)
	})
})

describe('embedAttachment', () => {
	it('returns excluded for null bytes', async () => {
		const pdf = await PDFDocument.create()
		const fonts = await makeFonts(pdf)
		const result = await embedAttachment(pdf, 1, makeDoc(), null, fonts)
		expect(result).toEqual({ embedded: false, reason: expect.stringMatching(/fetch failed/i) })
		expect(pdf.getPageCount()).toBe(0)
	})

	it('returns excluded for unsupported mime types', async () => {
		const pdf = await PDFDocument.create()
		const fonts = await makeFonts(pdf)
		const doc = makeDoc({ mime_type: 'application/zip', filename: 'a.zip' })
		const result = await embedAttachment(pdf, 1, doc, Buffer.from([1, 2, 3]), fonts)
		expect(result).toEqual({ embedded: false, reason: expect.stringMatching(/unsupported/i) })
		expect(pdf.getPageCount()).toBe(0)
	})

	it('embeds a plain-text attachment as at least one page', async () => {
		const pdf = await PDFDocument.create()
		const fonts = await makeFonts(pdf)
		const doc = makeDoc({ mime_type: 'text/plain', filename: 'notes.txt' })
		const result = await embedAttachment(pdf, 42, doc, Buffer.from('hello world\nsecond line'), fonts)
		expect(result.embedded).toBe(true)
		if (result.embedded) expect(result.pages_added).toBeGreaterThanOrEqual(1)
		expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1)
	})

	it('embeds a PNG image as one page', async () => {
		const pdf = await PDFDocument.create()
		const fonts = await makeFonts(pdf)
		const pngB64 =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
		const bytes = Buffer.from(pngB64, 'base64')
		const doc = makeDoc({ mime_type: 'image/png', filename: 'pixel.png' })
		const result = await embedAttachment(pdf, 1, doc, bytes, fonts)
		expect(result.embedded).toBe(true)
		if (result.embedded) expect(result.pages_added).toBe(1)
	})

	it('embeds a PDF attachment, copying its pages', async () => {
		const sourceDoc = await PDFDocument.create()
		sourceDoc.addPage([200, 200])
		sourceDoc.addPage([200, 200])
		const sourceBytes = Buffer.from(await sourceDoc.save())

		const pdf = await PDFDocument.create()
		const fonts = await makeFonts(pdf)
		const doc = makeDoc({ mime_type: 'application/pdf', filename: 'invoice.pdf' })
		const result = await embedAttachment(pdf, 1, doc, sourceBytes, fonts)
		expect(result.embedded).toBe(true)
		if (result.embedded) expect(result.pages_added).toBe(2)
		expect(pdf.getPageCount()).toBe(2)
	})
})
