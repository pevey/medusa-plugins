type OrderItem = {
	id?: string
	subtotal?: number | null
	unit_price?: number | null
	quantity?: number | null
}

type AppliedPromotion = {
	id?: string
	code?: string
	discount_amount?: number | null
}

type OrderShape = {
	currency_code?: string | null
	items?: OrderItem[] | null
	applied_promotions?: AppliedPromotion[] | null
	placed_at?: string | Date | null
	payment_captured_at?: string | Date | null
	completed_at?: string | Date | null
	canceled_at?: string | Date | null
}

export type ComputedSubtotals = {
	gross_subtotal: number
	net_subtotal: number
	currency_code: string
}

export type StateTimestamps = {
	placed_at: Date
	captured_at: Date | null
	completed_at: Date | null
	voided_at: Date | null
}

const toDate = (v: string | Date | null | undefined): Date | null =>
	v ? (v instanceof Date ? v : new Date(v)) : null

export function computeSubtotals(
	order: OrderShape,
	affiliatePromotionId: string
): ComputedSubtotals {
	const items = order.items ?? []
	let gross = 0
	for (const item of items) {
		const subtotal =
			item.subtotal != null ? item.subtotal : (item.unit_price ?? 0) * (item.quantity ?? 0)
		gross += subtotal
	}

	const affiliatePromotion = (order.applied_promotions ?? []).find(
		p => p?.id === affiliatePromotionId
	)
	const discount = affiliatePromotion?.discount_amount ?? 0
	const net = Math.max(0, gross - discount)

	return {
		gross_subtotal: gross,
		net_subtotal: net,
		currency_code: order.currency_code ?? ''
	}
}

export function extractStateTimestamps(order: OrderShape): StateTimestamps {
	const placed = toDate(order.placed_at) ?? new Date()
	return {
		placed_at: placed,
		captured_at: toDate(order.payment_captured_at),
		completed_at: toDate(order.completed_at),
		voided_at: toDate(order.canceled_at)
	}
}

export function findAffiliatePromotionId(
	order: OrderShape,
	affiliatePromotionIds: Set<string>
): string | null {
	for (const p of order.applied_promotions ?? []) {
		if (p?.id && affiliatePromotionIds.has(p.id)) return p.id
	}
	return null
}
