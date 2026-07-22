export type CalculatedPrice = {
	calculated_amount?: number | null
	original_amount?: number | null
	currency_code?: string | null
}

// Medusa returns amounts in major units. Formats with the price's own currency.
// `locale` is pinned (default 'en-US') so server + client render identically — passing
// `undefined` would use the host locale (Node vs browser) and cause a hydration mismatch.
export function formatPrice(cp: CalculatedPrice | null | undefined, locale = 'en-US'): string {
	if (!cp || cp.calculated_amount == null || !cp.currency_code) return ''
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: cp.currency_code.toUpperCase()
	}).format(cp.calculated_amount)
}
