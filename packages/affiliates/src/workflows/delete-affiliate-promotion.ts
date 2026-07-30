import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse, transform } from '@medusajs/framework/workflows-sdk'
import { deleteCampaignsWorkflow, deletePromotionsWorkflow, dismissRemoteLinkStep } from '@medusajs/medusa/core-flows'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type AffiliatePromotionRefInput = {
	affiliate_id: string
	promotion_id: string
}

export const guardAndCollectStep = createStep('guard-and-collect-promotion-step', async (input: AffiliatePromotionRefInput, { container }) => {
	const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	const [, count] = await svc.listAndCountAffiliateAttributions({
		affiliate_id: input.affiliate_id,
		promotion_id: input.promotion_id
	})
	if (count > 0) {
		throw new MedusaError(
			MedusaError.Types.NOT_ALLOWED,
			`Cannot delete promotion ${input.promotion_id} — ${count} attribution row(s) reference it. Retire it instead.`
		)
	}

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

export const deleteAffiliatePromotionWorkflowId = 'delete-affiliate-promotion'

export const deleteAffiliatePromotionWorkflow = createWorkflow(deleteAffiliatePromotionWorkflowId, (input: AffiliatePromotionRefInput) => {
	const { campaign_id } = guardAndCollectStep(input)

	const dismissLinks = transform({ input }, ({ input }) => [
		{
			[AFFILIATE_MODULE]: { affiliate_id: input.affiliate_id },
			[Modules.PROMOTION]: { promotion_id: input.promotion_id }
		}
	])

	dismissRemoteLinkStep(dismissLinks)

	const deletePromotionInput = transform({ input }, ({ input }) => ({
		ids: [input.promotion_id]
	}))

	deletePromotionsWorkflow.runAsStep({ input: deletePromotionInput })

	const deleteCampaignInput = transform({ campaign_id }, ({ campaign_id }) => ({
		ids: campaign_id ? [campaign_id] : []
	}))

	deleteCampaignsWorkflow.runAsStep({
		input: deleteCampaignInput
	})

	return new WorkflowResponse({ promotion_id: input.promotion_id })
})
