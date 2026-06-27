import { PDFDocument, StandardFonts } from 'pdf-lib'
import { wrapText, drawWrappedText } from '../text-layout'

describe('wrapText', () => {
	let helvetica: Awaited<ReturnType<PDFDocument['embedFont']>>

	beforeAll(async () => {
		const doc = await PDFDocument.create()
		helvetica = await doc.embedFont(StandardFonts.Helvetica)
	})

	it('returns one line when text fits the width', () => {
		const lines = wrapText('hello world', helvetica, 12, 500)
		expect(lines).toEqual(['hello world'])
	})

	it('breaks at word boundaries when text exceeds width', () => {
		const longText = Array(50).fill('apple').join(' ')
		const lines = wrapText(longText, helvetica, 12, 100)
		expect(lines.length).toBeGreaterThan(1)
		for (const line of lines) {
			expect(helvetica.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(100)
		}
	})

	it('falls back to character-level breaks for unbreakable runs', () => {
		const unbreakable = 'a'.repeat(200)
		const lines = wrapText(unbreakable, helvetica, 12, 50)
		expect(lines.length).toBeGreaterThan(1)
		for (const line of lines) {
			expect(helvetica.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(50)
		}
	})

	it('treats embedded newlines as forced breaks', () => {
		const lines = wrapText('one\ntwo\nthree', helvetica, 12, 500)
		expect(lines).toEqual(['one', 'two', 'three'])
	})
})

describe('drawWrappedText', () => {
	it('returns the final y after drawing all lines', async () => {
		const doc = await PDFDocument.create()
		const font = await doc.embedFont(StandardFonts.Helvetica)
		const page = doc.addPage([612, 792])
		const { endY } = drawWrappedText(page, ['line one', 'line two', 'line three'], {
			x: 50,
			y: 700,
			font,
			size: 12,
			lineHeight: 14
		})
		// Three lines at 14pt line height starting from y=700 → endY = 700 - 3*14 = 658
		expect(endY).toBe(658)
	})
})
