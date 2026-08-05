/// <reference types="jest" />
import { reconcileOrder } from '../update-affiliate-attributions'

describe('reconcileOrder', () => {
	it('produces a fresh insert payload when no existing row', () => {
		const result = reconcileOrder({
			order: {
				id: 'order_1',
				currency_code: 'usd',
				placed_at: new Date('2026-01-10'),
				payment_captured_at: null,
				completed_at: null,
				canceled_at: null,
				items: [{ subtotal: 100 }],
				applied_promotions: [{ id: 'p1', discount_amount: 10 }]
			} as any,
			affiliateId: 'aff_1',
			affiliatePromotionIds: new Set(['p1']),
			existing: null
		})
		expect(result.kind).toBe('insert')
		if (result.kind === 'insert') {
			expect(result.row.gross_subtotal).toBe(100)
			expect(result.row.net_subtotal).toBe(90)
			expect(result.row.placed_at).toEqual(new Date('2026-01-10'))
		}
	})

	it('produces an update payload that only flips newly-true timestamps', () => {
		const result = reconcileOrder({
			order: {
				id: 'order_1',
				currency_code: 'usd',
				placed_at: new Date('2026-01-10'),
				payment_captured_at: new Date('2026-01-11'),
				completed_at: null,
				canceled_at: null,
				items: [{ subtotal: 100 }],
				applied_promotions: [{ id: 'p1', discount_amount: 10 }]
			} as any,
			affiliateId: 'aff_1',
			affiliatePromotionIds: new Set(['p1']),
			existing: {
				id: 'attr_1',
				placed_at: new Date('2026-01-10'),
				captured_at: null,
				completed_at: null,
				voided_at: null
			} as any
		})
		expect(result.kind).toBe('update')
		if (result.kind === 'update') {
			expect(result.patch.captured_at).toEqual(new Date('2026-01-11'))
			expect(result.patch.placed_at).toBeUndefined()
		}
	})

	it('returns skip when order has no affiliate-linked promotion', () => {
		const result = reconcileOrder({
			order: {
				id: 'order_1',
				applied_promotions: [{ id: 'pX' }]
			} as any,
			affiliateId: 'aff_1',
			affiliatePromotionIds: new Set(['p1']),
			existing: null
		})
		expect(result.kind).toBe('skip')
	})
})
