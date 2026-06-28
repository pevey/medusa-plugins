import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { recalculateAffiliateAttributionsWorkflow } from '../../../../../../workflows/recalculate-affiliate-attributions'

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { result } = await recalculateAffiliateAttributionsWorkflow(req.scope).run({
		input: { affiliate_id: req.params.id }
	})
	res.json(result)
}
