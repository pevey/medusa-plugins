import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'
import {
	computeSubtotals,
	extractStateTimestamps,
	findAffiliatePromotionId
} from '../modules/affiliate/attribution-math'

type ReconcileInput = {
	order: any
	affiliateId: string
	affiliatePromotionIds: Set<string>
	existing: {
		id: string
		placed_at: Date | null
		captured_at: Date | null
		completed_at: Date | null
		voided_at: Date | null
	} | null
}

export type ReconcileResult =
	| { kind: 'skip' }
	| { kind: 'insert'; row: Record<string, unknown> }
	| { kind: 'update'; patch: Record<string, unknown> }

export function reconcileOrder(input: ReconcileInput): ReconcileResult {
	const promotionId = findAffiliatePromotionId(input.order, input.affiliatePromotionIds)
	if (!promotionId) return { kind: 'skip' }

	const subtotals = computeSubtotals(input.order, promotionId)
	const ts = extractStateTimestamps(input.order)

	if (!input.existing) {
		return {
			kind: 'insert',
			row: {
				affiliate_id: input.affiliateId,
				promotion_id: promotionId,
				order_id: input.order.id,
				currency_code: subtotals.currency_code,
				gross_subtotal: subtotals.gross_subtotal,
				net_subtotal: subtotals.net_subtotal,
				placed_at: ts.placed_at,
				captured_at: ts.captured_at,
				completed_at: ts.completed_at,
				voided_at: ts.voided_at
			}
		}
	}

	const patch: Record<string, unknown> = { id: input.existing.id }
	let changed = false
	if (!input.existing.captured_at && ts.captured_at) {
		patch.captured_at = ts.captured_at
		changed = true
	}
	if (!input.existing.completed_at && ts.completed_at) {
		patch.completed_at = ts.completed_at
		changed = true
	}
	if (!input.existing.voided_at && ts.voided_at) {
		patch.voided_at = ts.voided_at
		changed = true
	}
	if (!changed) return { kind: 'skip' }
	return { kind: 'update', patch }
}

export default async function updateAffiliateAttributionsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	try {
		// Watermark: latest timestamp in the ledger, minus 24h overlap.
		const allAttrs = await svc.listAffiliateAttributions(
			{},
			{
				select: ['placed_at', 'captured_at', 'completed_at', 'voided_at'],
				order: { placed_at: 'DESC' },
				take: 1
			}
		)
		const latest = allAttrs[0]
			? Math.max(
					allAttrs[0].placed_at?.getTime() ?? 0,
					allAttrs[0].captured_at?.getTime() ?? 0,
					allAttrs[0].completed_at?.getTime() ?? 0,
					allAttrs[0].voided_at?.getTime() ?? 0
				)
			: 0
		const watermark = latest ? new Date(latest - 24 * 60 * 60 * 1000) : new Date(0)

		// Affiliate-linked promotion id → affiliate id lookup.
		const { data: affiliates } = await query.graph({
			entity: 'affiliate',
			fields: ['id', 'promotions.id']
		})
		const promotionToAffiliate = new Map<string, string>()
		const affiliatePromotionIds = new Set<string>()
		for (const a of affiliates as any[]) {
			for (const p of a.promotions ?? []) {
				if (p?.id) {
					promotionToAffiliate.set(p.id, a.id)
					affiliatePromotionIds.add(p.id)
				}
			}
		}
		if (affiliatePromotionIds.size === 0) {
			logger.info('No affiliate-linked promotions; nothing to reconcile.')
			return
		}

		const limit = 100
		let offset = 0
		let total = 0
		let upserted = 0

		do {
			const { data: orders, metadata } = await query.graph({
				entity: 'order',
				fields: [
					'id',
					'currency_code',
					'placed_at',
					'payment_captured_at',
					'completed_at',
					'canceled_at',
					'updated_at',
					'items.id',
					'items.subtotal',
					'items.unit_price',
					'items.quantity',
					'applied_promotions.id',
					'applied_promotions.discount_amount'
				],
				filters: { updated_at: { $gte: watermark } } as any,
				pagination: { take: limit, skip: offset }
			})
			total = metadata?.count ?? 0
			offset += limit

			for (const order of orders as any[]) {
				const promotionId = findAffiliatePromotionId(order, affiliatePromotionIds)
				if (!promotionId) continue
				const affiliateId = promotionToAffiliate.get(promotionId)!

				const [existing] = await svc.listAffiliateAttributions({ order_id: order.id })

				const result = reconcileOrder({
					order,
					affiliateId,
					affiliatePromotionIds,
					existing: existing
						? {
								id: existing.id,
								placed_at: existing.placed_at,
								captured_at: existing.captured_at,
								completed_at: existing.completed_at,
								voided_at: existing.voided_at
							}
						: null
				})

				if (result.kind === 'insert') {
					await svc.createAffiliateAttributions([result.row as any])
					upserted++
				} else if (result.kind === 'update') {
					await svc.updateAffiliateAttributions(result.patch as any)
					upserted++
				}
			}
		} while (offset < total)

		logger.info(`Affiliate attribution sync complete: ${upserted} rows touched.`)
	} catch (err: any) {
		logger.error(`Affiliate attribution sync failed: ${err.message}`)
	}
}

export const config = {
	name: 'update-affiliate-attributions',
	schedule: '0 1 * * *'
}
