import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { updateAffiliateAddressWorkflow } from '../../../../../../workflows/update-affiliate-address'
import { deleteAffiliateAddressWorkflow } from '../../../../../../workflows/delete-affiliate-address'
import { AdminUpdateAddressType } from '../../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateAddressType>,
	res: MedusaResponse
) => {
	const { result } = await updateAffiliateAddressWorkflow(req.scope).run({
		input: {
			affiliate_id: req.params.id,
			address_id: req.params.addressId,
			patch: req.validatedBody
		}
	})
	res.json({ address: result })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	await deleteAffiliateAddressWorkflow(req.scope).run({
		input: { affiliate_id: req.params.id, address_id: req.params.addressId }
	})
	res.json({ id: req.params.addressId, deleted: true })
}
