// Medusa returns amounts in major units. `locale` is pinned (default 'en-US') so server + client
// render identically (avoids a hydration mismatch from host-locale differences).
export function formatPrice(
	amount: number | null | undefined,
	currencyCode: string | null | undefined,
	locale = 'en-US'
): string {
	if (amount == null || !currencyCode) return ''
	return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode.toUpperCase() }).format(amount)
}
