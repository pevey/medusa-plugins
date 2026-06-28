import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { reactivateAffiliatePromotionWorkflow } from '../../../../../../../workflows/reactivate-affiliate-promotion'

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { result } = await reactivateAffiliatePromotionWorkflow(req.scope).run({
		input: { affiliate_id: req.params.id, promotion_id: req.params.promotionId }
	})
	res.json({ promotion: result })
}
