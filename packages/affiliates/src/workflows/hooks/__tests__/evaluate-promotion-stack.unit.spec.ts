/// <reference types="jest" />
import { evaluatePromotionStack } from '../lib/evaluate-promotion-stack'

const aff = (s: string[]) => new Set(s)

describe('evaluatePromotionStack', () => {
	it('accepts incoming non-affiliate code with empty cart', () => {
		const d = evaluatePromotionStack({
			currentCodes: [],
			incomingCodes: ['SUMMER'],
			affiliateCodes: aff([]),
			allowStacking: true,
			action: 'add'
		})
		expect(d).toEqual({ accept: true, codesToRemove: [] })
	})

	it('accepts incoming affiliate code with empty cart', () => {
		const d = evaluatePromotionStack({
			currentCodes: [],
			incomingCodes: ['JANE10'],
			affiliateCodes: aff(['JANE10']),
			allowStacking: true,
			action: 'add'
		})
		expect(d.accept).toBe(true)
		expect(d.codesToRemove).toEqual([])
	})

	it('swaps out previous affiliate code when a new affiliate code is applied (last-wins)', () => {
		const d = evaluatePromotionStack({
			currentCodes: ['JANE10'],
			incomingCodes: ['BOB15'],
			affiliateCodes: aff(['JANE10', 'BOB15']),
			allowStacking: true,
			action: 'add'
		})
		expect(d.accept).toBe(true)
		expect(d.codesToRemove).toEqual(['JANE10'])
	})

	it('rejects affiliate code when cart has non-affiliate and stacking disallowed', () => {
		const d = evaluatePromotionStack({
			currentCodes: ['SUMMER'],
			incomingCodes: ['JANE10'],
			affiliateCodes: aff(['JANE10']),
			allowStacking: false,
			action: 'add'
		})
		expect(d.accept).toBe(false)
		expect(d.reason).toMatch(/cannot be combined/i)
	})

	it('rejects non-affiliate code when cart has affiliate and stacking disallowed', () => {
		const d = evaluatePromotionStack({
			currentCodes: ['JANE10'],
			incomingCodes: ['SUMMER'],
			affiliateCodes: aff(['JANE10']),
			allowStacking: false,
			action: 'add'
		})
		expect(d.accept).toBe(false)
	})

	it('allows stacking of affiliate + non-affiliate when allowStacking=true', () => {
		const d = evaluatePromotionStack({
			currentCodes: ['JANE10'],
			incomingCodes: ['SUMMER'],
			affiliateCodes: aff(['JANE10']),
			allowStacking: true,
			action: 'add'
		})
		expect(d.accept).toBe(true)
		expect(d.codesToRemove).toEqual([])
	})

	it('rejects a single batch containing two affiliate codes', () => {
		const d = evaluatePromotionStack({
			currentCodes: [],
			incomingCodes: ['JANE10', 'BOB15'],
			affiliateCodes: aff(['JANE10', 'BOB15']),
			allowStacking: true,
			action: 'add'
		})
		expect(d.accept).toBe(false)
		expect(d.reason).toMatch(/one affiliate code/i)
	})
})
