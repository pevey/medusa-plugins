import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
	transform
} from '@medusajs/framework/workflows-sdk'
import {
	createCampaignsWorkflow,
	updateCampaignsWorkflow,
	updatePromotionsWorkflow
} from '@medusajs/medusa/core-flows'

export type UpdateAffiliatePromotionInput = {
	affiliate_id: string
	promotion_id: string
	code?: string
	discount_value?: number
	end_date?: string | null
}

export const updateAffiliatePromotionStep = createStep(
	'update-affiliate-promotion-step',
	async (input: UpdateAffiliatePromotionInput, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: 'promotion',
			fields: [
				'id',
				'code',
				'campaign.id',
				'campaign.ends_at',
				'affiliate.id',
				'application_method.value'
			],
			filters: { id: input.promotion_id }
		})
		const promotion = data[0] as any
		if (!promotion) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Promotion ${input.promotion_id} not found`
			)
		}
		if (promotion.affiliate?.id !== input.affiliate_id) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				`Promotion ${input.promotion_id} does not belong to affiliate ${input.affiliate_id}`
			)
		}
		return new StepResponse({ existing: promotion })
	}
)

export const updateAffiliatePromotionWorkflowId = 'update-affiliate-promotion'

export const updateAffiliatePromotionWorkflow = createWorkflow(
	updateAffiliatePromotionWorkflowId,
	(input: UpdateAffiliatePromotionInput) => {
		const { existing } = updateAffiliatePromotionStep(input)

		updatePromotionsWorkflow
			.runAsStep({
				input: {
					promotionsData: [
						{
							id: input.promotion_id,
							code: input.code,
							application_method:
								input.discount_value !== undefined
									? ({ value: input.discount_value } as any)
									: undefined
						} as any
					]
				}
			})
			.config({ name: 'update-promotion-fields' })

		// Campaign update for end_date. Three cases:
		//   1) end_date provided + existing campaign → update ends_at
		//   2) end_date provided + no campaign → create one and attach (via updatePromotions)
		//   3) end_date null + existing campaign → set ends_at far in the future (effectively perpetual)
		// Implementation note: we use updateCampaignsWorkflow when an existing campaign exists,
		// and createCampaignsWorkflow + updatePromotionsWorkflow.campaign_id otherwise.
		const updateCampaignInput = transform({ input, existing }, ({ input, existing }) => ({
			campaignsData:
				input.end_date !== undefined && existing.campaign?.id
					? [
							{
								id: existing.campaign.id,
								ends_at: input.end_date ? new Date(input.end_date) : null
							} as any
						]
					: []
		}))

		updateCampaignsWorkflow.runAsStep({
			input: updateCampaignInput
		})

		const createCampaignInput = transform({ input, existing }, ({ input, existing }) => ({
			campaignsData:
				input.end_date && !existing.campaign?.id
					? [
							{
								name: `Affiliate ${existing.code} campaign`,
								campaign_identifier: `affiliate-${existing.code}-${Date.now()}`,
								starts_at: new Date(),
								ends_at: new Date(input.end_date as string)
							}
						]
					: []
		}))

		const newCampaigns = createCampaignsWorkflow.runAsStep({
			input: createCampaignInput
		})

		const linkCampaignInput = transform({ input, newCampaigns }, ({ input, newCampaigns }) => ({
			promotionsData: newCampaigns.length
				? [{ id: input.promotion_id, campaign_id: newCampaigns[0].id } as any]
				: []
		}))

		updatePromotionsWorkflow
			.runAsStep({
				input: linkCampaignInput
			})
			.config({ name: 'link-campaign-to-promotion' })

		return new WorkflowResponse({ promotion_id: input.promotion_id })
	}
)
