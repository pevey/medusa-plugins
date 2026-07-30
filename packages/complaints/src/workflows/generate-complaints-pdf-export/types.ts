import type { PDFFont } from 'pdf-lib'

export type ActivityEntry = {
	id: string
	type: 'open' | 'close' | 'note' | string
	note: string | null
	user: { id: string; email: string } | null
	created_at: Date
}

export type DocumentMeta = {
	id: string
	filename: string
	mime_type: string
	size_bytes: number
	file_key: string
	created_at: Date
}

export type ComplaintForExport = {
	complaint: {
		id: string
		number: number
		status: 'open' | 'closed'
		description: string
		actionable: boolean
		reportable: boolean
		customer_id: string
		order_id: string | null
		product_id: string | null
		tags: { id: string; value: string }[]
		activity: ActivityEntry[]
		documents: DocumentMeta[]
	}
	customer: {
		id: string
		email: string
		first_name: string | null
		last_name: string | null
	} | null
	order: { id: string; display_id: number; created_at: Date } | null
	product: { id: string; title: string; handle: string } | null
}

export type DocumentBytes = {
	document_id: string
	bytes: Buffer | null
	error?: string
}

export type AttachmentClass = 'pdf' | 'image-native' | 'image-decode' | 'text' | 'excluded'

export type EmbedResult = { embedded: true; pages_added: number } | { embedded: false; reason: string }

export type PdfFonts = {
	regular: PDFFont
	bold: PDFFont
	mono: PDFFont
}
