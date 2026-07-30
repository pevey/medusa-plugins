import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { updatePromotionsWorkflow } from '@medusajs/medusa/core-flows'
import { AffiliatePromotionRefInput, verifyAffiliateOwnsPromotionStep } from './retire-affiliate-promotion'

export const reactivateAffiliatePromotionWorkflowId = 'reactivate-affiliate-promotion'

export const reactivateAffiliatePromotionWorkflow = createWorkflow(reactivateAffiliatePromotionWorkflowId, (input: AffiliatePromotionRefInput) => {
	verifyAffiliateOwnsPromotionStep(input)
	updatePromotionsWorkflow.runAsStep({
		input: {
			promotionsData: [{ id: input.promotion_id, status: 'active' as const } as any]
		}
	})
	return new WorkflowResponse({ promotion_id: input.promotion_id })
})
