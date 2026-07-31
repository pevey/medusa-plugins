/**
 * Stripe payment-session helpers.
 *
 * Background — why the session is created at place-order rather than on mount:
 * Medusa DELETES a cart's payment sessions whenever the cart total changes
 * (`refreshPaymentCollectionForCartWorkflow` → `deletePaymentSessionsWorkflow`). Selecting a
 * shipping method, applying a discount, or changing a quantity therefore invalidates any
 * PaymentIntent created earlier, leaving its client_secret pointing at a canceled intent
 * ("This PaymentIntent is in a terminal state and cannot be used to initialize Elements").
 *
 * So <Elements> is created in Stripe's DEFERRED mode (`{mode:'payment', amount, currency}`)
 * with no session at all, and the intent is created once, at submit, against the final total.
 */

/** Currencies Stripe treats as having no minor unit — the amount is passed as-is. */
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])

/** Currencies Stripe bills in thousandths. */
const THREE_DECIMAL = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd'])

/**
 * Convert a Medusa total (major units, e.g. `20.5`) to the integer minor-unit amount Stripe
 * expects (e.g. `2050`). Medusa stores prices in major units; Stripe's `amount` is always an
 * integer in the currency's smallest unit.
 */
export function toMinorUnits(total: number, currencyCode: string): number {
	const currency = (currencyCode || '').toLowerCase()
	const exponent = ZERO_DECIMAL.has(currency) ? 0 : THREE_DECIMAL.has(currency) ? 3 : 2
	// Round rather than truncate: floating-point totals like 20.499999999999996 must land on 2050.
	return Math.round(total * 10 ** exponent)
}

/**
 * Stripe rejects Elements in deferred mode unless the amount is a positive integer, so an empty
 * or zero-total cart must not attempt to mount. Callers render their loading/empty state instead.
 */
export function canMountElements(amount: number | null | undefined): amount is number {
	return typeof amount === 'number' && Number.isInteger(amount) && amount > 0
}
