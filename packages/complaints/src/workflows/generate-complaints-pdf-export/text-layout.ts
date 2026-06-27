import type { PDFFont, PDFPage, RGB } from 'pdf-lib'
import { rgb } from 'pdf-lib'

type DrawOpts = {
	x: number
	y: number
	font: PDFFont
	size: number
	lineHeight: number
	color?: RGB
}

export function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
	const lines: string[] = []
	for (const paragraph of text.split('\n')) {
		if (paragraph === '') {
			lines.push('')
			continue
		}
		const words = paragraph.split(/\s+/)
		let current = ''
		for (const word of words) {
			const candidate = current === '' ? word : current + ' ' + word
			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
				current = candidate
				continue
			}
			if (current !== '') {
				lines.push(current)
				current = ''
			}
			if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
				let buf = ''
				for (const ch of word) {
					if (font.widthOfTextAtSize(buf + ch, fontSize) <= maxWidth) {
						buf += ch
					} else {
						if (buf !== '') lines.push(buf)
						buf = ch
					}
				}
				current = buf
			} else {
				current = word
			}
		}
		if (current !== '') lines.push(current)
	}
	return lines
}

export function drawWrappedText(page: PDFPage, lines: string[], opts: DrawOpts): { endY: number } {
	const color = opts.color ?? rgb(0, 0, 0)
	let y = opts.y
	for (const line of lines) {
		y -= opts.lineHeight
		page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color })
	}
	return { endY: y }
}
