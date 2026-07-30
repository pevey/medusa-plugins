import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { updatePromotionsWorkflow } from '@medusajs/medusa/core-flows'

export type AffiliatePromotionRefInput = {
	affiliate_id: string
	promotion_id: string
}

export const verifyAffiliateOwnsPromotionStep = createStep('verify-affiliate-owns-promotion-step', async (input: AffiliatePromotionRefInput, { container }) => {
	const query = container.resolve(ContainerRegistrationKeys.QUERY)
	const { data } = await query.graph({
		entity: 'promotion',
		fields: ['id', 'affiliate.id', 'campaign.id'],
		filters: { id: input.promotion_id }
	})
	const promotion = data[0] as any
	if (!promotion) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Promotion ${input.promotion_id} not found`)
	}
	if (promotion.affiliate?.id !== input.affiliate_id) {
		throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Promotion ${input.promotion_id} does not belong to affiliate ${input.affiliate_id}`)
	}
	return new StepResponse({ campaign_id: promotion.campaign?.id ?? null })
})

export const retireAffiliatePromotionWorkflowId = 'retire-affiliate-promotion'

export const retireAffiliatePromotionWorkflow = createWorkflow(retireAffiliatePromotionWorkflowId, (input: AffiliatePromotionRefInput) => {
	verifyAffiliateOwnsPromotionStep(input)
	updatePromotionsWorkflow.runAsStep({
		input: {
			promotionsData: [{ id: input.promotion_id, status: 'inactive' as const } as any]
		}
	})
	return new WorkflowResponse({ promotion_id: input.promotion_id })
})
