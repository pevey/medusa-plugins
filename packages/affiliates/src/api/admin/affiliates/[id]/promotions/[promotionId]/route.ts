import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { updateAffiliatePromotionWorkflow } from '../../../../../../workflows/update-affiliate-promotion'
import { deleteAffiliatePromotionWorkflow } from '../../../../../../workflows/delete-affiliate-promotion'
import { AdminUpdateAffiliatePromotionType } from '../../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateAffiliatePromotionType>,
	res: MedusaResponse
) => {
	const { result } = await updateAffiliatePromotionWorkflow(req.scope).run({
		input: {
			affiliate_id: req.params.id,
			promotion_id: req.params.promotionId,
			...req.validatedBody
		}
	})
	res.json({ promotion: result })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	await deleteAffiliatePromotionWorkflow(req.scope).run({
		input: { affiliate_id: req.params.id, promotion_id: req.params.promotionId }
	})
	res.json({ id: req.params.promotionId, deleted: true })
}
