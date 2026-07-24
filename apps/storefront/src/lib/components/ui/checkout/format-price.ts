export function formatPrice(
	amount: number | null | undefined,
	currencyCode: string | null | undefined,
	locale = 'en-US'
): string {
	if (amount == null || !currencyCode) return ''
	return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode.toUpperCase() }).format(amount)
}
