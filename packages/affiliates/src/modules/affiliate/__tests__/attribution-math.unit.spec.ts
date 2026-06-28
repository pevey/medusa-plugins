/// <reference types="jest" />
import {
	computeSubtotals,
	extractStateTimestamps,
	findAffiliatePromotionId
} from '../attribution-math'

describe('attribution-math', () => {
	describe('computeSubtotals', () => {
		it('sums item subtotals before discount as gross; subtracts promotion discount as net', () => {
			const order = {
				currency_code: 'usd',
				items: [
					{ id: 'i1', subtotal: 100 },
					{ id: 'i2', subtotal: 50 }
				],
				applied_promotions: [{ id: 'prom_aff', code: 'JANE10', discount_amount: 15 }]
			}
			const result = computeSubtotals(order as any, 'prom_aff')
			expect(result.gross_subtotal).toBe(150)
			expect(result.net_subtotal).toBe(135)
			expect(result.currency_code).toBe('usd')
		})

		it('falls back to unit_price * quantity when subtotal is missing', () => {
			const order = {
				currency_code: 'usd',
				items: [{ id: 'i1', unit_price: 25, quantity: 4 }],
				applied_promotions: [{ id: 'prom_aff', discount_amount: 10 }]
			}
			const result = computeSubtotals(order as any, 'prom_aff')
			expect(result.gross_subtotal).toBe(100)
			expect(result.net_subtotal).toBe(90)
		})

		it('zero net cannot drop below zero (defensive)', () => {
			const order = {
				currency_code: 'usd',
				items: [{ id: 'i1', subtotal: 10 }],
				applied_promotions: [{ id: 'prom_aff', discount_amount: 50 }]
			}
			const result = computeSubtotals(order as any, 'prom_aff')
			expect(result.gross_subtotal).toBe(10)
			expect(result.net_subtotal).toBe(0)
		})
	})

	describe('extractStateTimestamps', () => {
		it('treats canceled_at as voided_at', () => {
			const canceled = new Date('2026-01-15T10:00:00Z')
			const placed = new Date('2026-01-10T10:00:00Z')
			const ts = extractStateTimestamps({
				placed_at: placed,
				canceled_at: canceled
			} as any)
			expect(ts.placed_at).toEqual(placed)
			expect(ts.voided_at).toEqual(canceled)
			expect(ts.captured_at).toBeNull()
			expect(ts.completed_at).toBeNull()
		})

		it('returns all four when present', () => {
			const placed = new Date('2026-01-10T10:00:00Z')
			const captured = new Date('2026-01-11T10:00:00Z')
			const completed = new Date('2026-01-20T10:00:00Z')
			const ts = extractStateTimestamps({
				placed_at: placed,
				payment_captured_at: captured,
				completed_at: completed
			} as any)
			expect(ts.placed_at).toEqual(placed)
			expect(ts.captured_at).toEqual(captured)
			expect(ts.completed_at).toEqual(completed)
			expect(ts.voided_at).toBeNull()
		})
	})

	describe('findAffiliatePromotionId', () => {
		it('returns the id of the first applied promotion in the affiliate lookup set', () => {
			const id = findAffiliatePromotionId(
				{ applied_promotions: [{ id: 'p1' }, { id: 'p2' }] } as any,
				new Set(['p2'])
			)
			expect(id).toBe('p2')
		})

		it('returns null when no applied promotion is in the lookup set', () => {
			const id = findAffiliatePromotionId(
				{ applied_promotions: [{ id: 'p1' }] } as any,
				new Set(['pX'])
			)
			expect(id).toBeNull()
		})
	})
})
