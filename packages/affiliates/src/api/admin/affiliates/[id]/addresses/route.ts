import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { addAffiliateAddressWorkflow } from '../../../../../workflows/add-affiliate-address'
import { AdminAddAddressType } from '../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminAddAddressType>,
	res: MedusaResponse
) => {
	const { result } = await addAffiliateAddressWorkflow(req.scope).run({
		input: { affiliate_id: req.params.id, address: req.validatedBody }
	})
	res.json({ address: result })
}
