import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { createAffiliatePromotionWorkflow } from '../../../../../workflows/create-affiliate-promotion'
import { AdminCreateAffiliatePromotionType } from '../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateAffiliatePromotionType>,
	res: MedusaResponse
) => {
	const { result } = await createAffiliatePromotionWorkflow(req.scope).run({
		input: { affiliate_id: req.params.id, ...req.validatedBody }
	})
	res.json({ promotion: result })
}
