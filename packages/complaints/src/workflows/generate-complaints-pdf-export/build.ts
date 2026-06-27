import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { ComplaintForExport, DocumentBytes, EmbedResult, PdfFonts } from './types'
import { classify, embedAttachment } from './embed-attachment'
import { renderComplaintDetailPages } from './render-detail'

export async function buildComplaintsPdf(input: {
	complaints: ComplaintForExport[]
	docBytes: Record<string, DocumentBytes>
}): Promise<Uint8Array> {
	const pdf = await PDFDocument.create()
	const fonts: PdfFonts = {
		regular: await pdf.embedFont(StandardFonts.Helvetica),
		bold:    await pdf.embedFont(StandardFonts.HelveticaBold),
		mono:    await pdf.embedFont(StandardFonts.Courier)
	}

	for (const c of input.complaints) {
		const embedClassifications: Record<string, EmbedResult> = {}
		for (const d of c.complaint.documents) {
			const cls = classify(d.mime_type)
			const bytes = input.docBytes[d.id]
			if (cls === 'excluded') {
				embedClassifications[d.id] = { embedded: false, reason: `unsupported type ${d.mime_type}` }
			} else if (!bytes || bytes.bytes === null) {
				embedClassifications[d.id] = { embedded: false, reason: bytes?.error ?? 'fetch failed' }
			}
		}

		renderComplaintDetailPages(pdf, c, fonts, embedClassifications)

		for (const d of c.complaint.documents) {
			if (embedClassifications[d.id]?.embedded === false) continue
			const bytes = input.docBytes[d.id]?.bytes ?? null
			const result = await embedAttachment(pdf, c.complaint.number, d, bytes, fonts)
			if (result.embedded === false) embedClassifications[d.id] = result
		}
	}

	return pdf.save()
}
