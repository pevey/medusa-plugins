import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'
import {
	computeSubtotals,
	extractStateTimestamps,
	findAffiliatePromotionId
} from '../modules/affiliate/attribution-math'

export type RecalculateInput = { affiliate_id: string }

export const recalculateStep = createStep(
	'recalculate-affiliate-attributions-step',
	async (input: RecalculateInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const { data: affiliates } = await query.graph({
			entity: 'affiliate',
			fields: ['id', 'promotions.id', 'promotions.code'],
			filters: { id: input.affiliate_id }
		})
		const affiliate = (affiliates ?? [])[0] as any
		if (!affiliate) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Affiliate ${input.affiliate_id} not found`
			)
		}
		const promotionIds = new Set<string>(((affiliate.promotions ?? []) as any[]).map(p => p.id))
		if (promotionIds.size === 0) {
			return new StepResponse({ upserted: 0 })
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
					'items.id',
					'items.subtotal',
					'items.unit_price',
					'items.quantity',
					'applied_promotions.id',
					'applied_promotions.code',
					'applied_promotions.discount_amount'
				],
				pagination: { take: limit, skip: offset }
			})

			total = metadata?.count ?? 0
			offset += limit

			for (const o of orders as any[]) {
				const affiliatePromotionId = findAffiliatePromotionId(o, promotionIds)
				if (!affiliatePromotionId) continue

				const subtotals = computeSubtotals(o, affiliatePromotionId)
				const ts = extractStateTimestamps(o)

				const [existing] = await svc.listAffiliateAttributions({ order_id: o.id })

				const row = {
					affiliate_id: input.affiliate_id,
					promotion_id: affiliatePromotionId,
					order_id: o.id,
					currency_code: subtotals.currency_code,
					gross_subtotal: subtotals.gross_subtotal,
					net_subtotal: subtotals.net_subtotal,
					placed_at: ts.placed_at,
					captured_at: ts.captured_at,
					completed_at: ts.completed_at,
					voided_at: ts.voided_at
				}

				if (existing) {
					await svc.updateAffiliateAttributions({ id: existing.id, ...row } as any)
				} else {
					await svc.createAffiliateAttributions([row as any])
				}
				upserted++
			}
		} while (offset < total)

		return new StepResponse({ upserted })
	}
)

export const recalculateAffiliateAttributionsWorkflowId = 'recalculate-affiliate-attributions'

export const recalculateAffiliateAttributionsWorkflow = createWorkflow(
	recalculateAffiliateAttributionsWorkflowId,
	(input: RecalculateInput) => {
		const result = recalculateStep(input)
		return new WorkflowResponse(result)
	}
)
