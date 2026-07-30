export type StatsWindow = 'day' | 'week' | 'month' | 'year' | 'all'
export type StatsBasis = 'placed' | 'captured' | 'completed'

export type AttributionRow = {
	currency_code: string
	gross_subtotal: number
	net_subtotal: number
	placed_at: Date
	captured_at: Date | null
	completed_at: Date | null
	voided_at: Date | null
}

export type StatsBucket = {
	currency_code: string
	order_count: number
	gross_total: number
	net_total: number
	average_order_value_gross: number
	average_order_value_net: number
}

const DAY_MS = 86_400_000

const WINDOW_DAYS: Record<Exclude<StatsWindow, 'all'>, number> = {
	day: 1,
	week: 7,
	month: 30,
	year: 365
}

export function windowStart(window: StatsWindow, now: Date): Date | null {
	if (window === 'all') return null
	return new Date(now.getTime() - WINDOW_DAYS[window] * DAY_MS)
}

export function selectRowsByBasis(rows: AttributionRow[], basis: StatsBasis, cutoff: Date | null): AttributionRow[] {
	return rows.filter(r => {
		if (r.voided_at) return false
		const ts = basis === 'placed' ? r.placed_at : basis === 'captured' ? r.captured_at : r.completed_at
		if (!ts) return false
		if (cutoff && ts < cutoff) return false
		return true
	})
}

export function bucketByCurrency(rows: AttributionRow[], primaryCurrency: string | null): StatsBucket[] {
	const map = new Map<string, StatsBucket>()
	for (const r of rows) {
		const c = r.currency_code || 'unknown'
		let b = map.get(c)
		if (!b) {
			b = {
				currency_code: c,
				order_count: 0,
				gross_total: 0,
				net_total: 0,
				average_order_value_gross: 0,
				average_order_value_net: 0
			}
			map.set(c, b)
		}
		b.order_count += 1
		b.gross_total += r.gross_subtotal
		b.net_total += r.net_subtotal
	}
	const buckets = Array.from(map.values()).map(b => ({
		...b,
		average_order_value_gross: b.order_count ? b.gross_total / b.order_count : 0,
		average_order_value_net: b.order_count ? b.net_total / b.order_count : 0
	}))

	buckets.sort((a, b) => {
		if (a.currency_code === primaryCurrency) return -1
		if (b.currency_code === primaryCurrency) return 1
		return a.currency_code.localeCompare(b.currency_code)
	})
	return buckets
}
