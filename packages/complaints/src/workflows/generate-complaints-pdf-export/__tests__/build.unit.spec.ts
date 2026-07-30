import { PDFDocument } from 'pdf-lib'
import { buildComplaintsPdf } from '../build'
import type { ComplaintForExport } from '../types'

function makeComplaint(id: string, number: number, opts: Partial<ComplaintForExport['complaint']> = {}): ComplaintForExport {
	return {
		complaint: {
			id,
			number,
			status: 'open',
			description: 'A short description.',
			actionable: false,
			reportable: false,
			customer_id: 'cus_1',
			order_id: null,
			product_id: null,
			tags: [],
			activity: [],
			documents: [],
			...opts
		},
		customer: { id: 'cus_1', email: 'jane@example.com', first_name: 'Jane', last_name: null },
		order: null,
		product: null
	}
}

const PNG_1x1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('buildComplaintsPdf', () => {
	it('produces a loadable PDF for a single complaint with no documents', async () => {
		const bytes = await buildComplaintsPdf({
			complaints: [makeComplaint('cmp_1', 1)],
			docBytes: {}
		})
		expect(bytes.length).toBeGreaterThan(100)
		const reloaded = await PDFDocument.load(bytes)
		expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(1)
	})

	it('starts each complaint on a fresh page', async () => {
		const bytes = await buildComplaintsPdf({
			complaints: [makeComplaint('cmp_1', 1), makeComplaint('cmp_2', 2)],
			docBytes: {}
		})
		const reloaded = await PDFDocument.load(bytes)
		expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(2)
	})

	it('embeds a PNG document on its own page after the detail pages', async () => {
		const doc = {
			id: 'doc_a',
			filename: 'photo.png',
			mime_type: 'image/png',
			size_bytes: 100,
			file_key: 'k1',
			created_at: new Date('2026-06-26')
		}
		const complaint = makeComplaint('cmp_1', 7, { documents: [doc] })
		const bytes = await buildComplaintsPdf({
			complaints: [complaint],
			docBytes: { doc_a: { document_id: 'doc_a', bytes: Buffer.from(PNG_1x1_B64, 'base64') } }
		})
		const reloaded = await PDFDocument.load(bytes)
		expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(2)
	})

	it('does not add a page for excluded document types', async () => {
		const zipDoc = {
			id: 'doc_b',
			filename: 'a.zip',
			mime_type: 'application/zip',
			size_bytes: 100,
			file_key: 'k2',
			created_at: new Date('2026-06-26')
		}
		const complaint = makeComplaint('cmp_1', 8, { documents: [zipDoc] })
		const withZip = await PDFDocument.load(
			await buildComplaintsPdf({
				complaints: [complaint],
				docBytes: { doc_b: { document_id: 'doc_b', bytes: Buffer.from([0, 0, 0]) } }
			})
		)
		const withoutDoc = await PDFDocument.load(
			await buildComplaintsPdf({
				complaints: [makeComplaint('cmp_1', 8)],
				docBytes: {}
			})
		)
		expect(withZip.getPageCount()).toBe(withoutDoc.getPageCount())
	})
})
