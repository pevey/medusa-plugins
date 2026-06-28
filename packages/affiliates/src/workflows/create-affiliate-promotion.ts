import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
	transform
} from '@medusajs/framework/workflows-sdk'
import {
	createCampaignsWorkflow,
	createPromotionsWorkflow,
	createRemoteLinkStep
} from '@medusajs/medusa/core-flows'
import { AFFILIATE_MODULE } from '../modules/affiliate'

export type CreateAffiliatePromotionInput = {
	affiliate_id: string
	code: string
	discount_type: 'percentage' | 'fixed'
	discount_value: number
	end_date?: string | null
}

export type CreateAffiliatePromotionResult = {
	promotion_id: string
	campaign_id: string | null
}

export const ensureCodeUnclaimedStep = createStep(
	'ensure-promotion-code-unclaimed-step',
	async (input: { code: string }, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: 'promotion',
			fields: ['id', 'code', 'affiliate.id'],
			filters: { code: input.code }
		})
		const claimed = data.find((p: any) => p.affiliate?.id)
		if (claimed) {
			throw new MedusaError(
				MedusaError.Types.DUPLICATE_ERROR,
				`Promotion code ${input.code} is already claimed by an affiliate.`
			)
		}
		return new StepResponse({ ok: true })
	}
)

export const createAffiliatePromotionWorkflowId = 'create-affiliate-promotion'

export const createAffiliatePromotionWorkflow = createWorkflow(
	createAffiliatePromotionWorkflowId,
	(input: CreateAffiliatePromotionInput) => {
		ensureCodeUnclaimedStep({ code: input.code })

		const campaignInput = transform({ input }, ({ input }) =>
			input.end_date
				? [
						{
							name: `Affiliate ${input.code} campaign`,
							campaign_identifier: `affiliate-${input.code}`,
							starts_at: new Date(),
							ends_at: new Date(input.end_date)
						}
					]
				: []
		)

		const campaigns = createCampaignsWorkflow.runAsStep({
			input: { campaignsData: campaignInput }
		})

		const promotionInput = transform({ input, campaigns }, ({ input, campaigns }) => [
			{
				code: input.code,
				type: 'standard' as const,
				is_automatic: false,
				status: 'active' as const,
				campaign_id: campaigns.length ? campaigns[0].id : undefined,
				application_method: {
					type: input.discount_type,
					value: input.discount_value,
					target_type: 'order' as const
				}
			}
		])

		const promotions = createPromotionsWorkflow.runAsStep({
			input: { promotionsData: promotionInput }
		})

		const linkInput = transform({ input, promotions }, ({ input, promotions }) => [
			{
				[AFFILIATE_MODULE]: { affiliate_id: input.affiliate_id },
				[Modules.PROMOTION]: { promotion_id: promotions[0].id }
			}
		])

		createRemoteLinkStep(linkInput)

		const result = transform({ promotions, campaigns }, ({ promotions, campaigns }) => ({
			promotion_id: promotions[0].id,
			campaign_id: campaigns.length ? campaigns[0].id : null
		}))

		return new WorkflowResponse(result)
	}
)
