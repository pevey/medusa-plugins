import { windowStart, selectRowsByBasis, bucketByCurrency, AttributionRow } from '../stats'

const NOW = new Date('2026-06-27T12:00:00Z')

const row = (overrides: Partial<AttributionRow>): AttributionRow => ({
	currency_code: 'usd',
	gross_subtotal: 100,
	net_subtotal: 90,
	placed_at: new Date('2026-06-25'),
	captured_at: null,
	completed_at: null,
	voided_at: null,
	...overrides
})

describe('windowStart', () => {
	it('returns null for all', () => {
		expect(windowStart('all', NOW)).toBeNull()
	})
	it('subtracts the right amount for each window', () => {
		expect(windowStart('day', NOW)!.getTime()).toBe(NOW.getTime() - 86_400_000)
		expect(windowStart('week', NOW)!.getTime()).toBe(NOW.getTime() - 7 * 86_400_000)
		expect(windowStart('month', NOW)!.getTime()).toBe(NOW.getTime() - 30 * 86_400_000)
		expect(windowStart('year', NOW)!.getTime()).toBe(NOW.getTime() - 365 * 86_400_000)
	})
})

describe('selectRowsByBasis', () => {
	it('excludes voided rows always', () => {
		const r = row({ completed_at: new Date('2026-06-20'), voided_at: new Date('2026-06-21') })
		expect(selectRowsByBasis([r], 'completed', null)).toEqual([])
	})

	it('basis=completed excludes rows with null completed_at', () => {
		const r = row({ completed_at: null, captured_at: new Date('2026-06-20') })
		expect(selectRowsByBasis([r], 'completed', null)).toEqual([])
		expect(selectRowsByBasis([r], 'captured', null)).toEqual([r])
	})

	it('applies window cutoff to the basis column', () => {
		const old = row({ completed_at: new Date('2026-01-01') })
		const recent = row({ completed_at: new Date('2026-06-26') })
		const cutoff = new Date('2026-06-20')
		expect(selectRowsByBasis([old, recent], 'completed', cutoff)).toEqual([recent])
	})
})

describe('bucketByCurrency', () => {
	it('returns primary currency first when present', () => {
		const a = row({ currency_code: 'eur', gross_subtotal: 50, net_subtotal: 50 })
		const b = row({ currency_code: 'usd', gross_subtotal: 100, net_subtotal: 80 })
		const result = bucketByCurrency([a, b], 'usd')
		expect(result[0].currency_code).toBe('usd')
		expect(result[1].currency_code).toBe('eur')
	})

	it('computes averages correctly', () => {
		const rows = [row({ currency_code: 'usd', gross_subtotal: 100, net_subtotal: 80 }), row({ currency_code: 'usd', gross_subtotal: 200, net_subtotal: 160 })]
		const [bucket] = bucketByCurrency(rows, 'usd')
		expect(bucket.order_count).toBe(2)
		expect(bucket.gross_total).toBe(300)
		expect(bucket.net_total).toBe(240)
		expect(bucket.average_order_value_gross).toBe(150)
		expect(bucket.average_order_value_net).toBe(120)
	})

	it('returns empty array for empty input', () => {
		expect(bucketByCurrency([], 'usd')).toEqual([])
	})

	it('alphabetically orders non-primary currencies', () => {
		const rs = [row({ currency_code: 'gbp' }), row({ currency_code: 'aud' }), row({ currency_code: 'eur' })]
		const result = bucketByCurrency(rs, null)
		expect(result.map(b => b.currency_code)).toEqual(['aud', 'eur', 'gbp'])
	})
})
