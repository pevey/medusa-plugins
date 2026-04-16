import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CUSTOMER_TAG_MODULE } from '../../../../../modules/customer-tag'
import { AdminAddCustomerTagType } from '../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminAddCustomerTagType>,
	res: MedusaResponse
) => {
	const { id } = req.params
	const { tag } = req.validatedBody

	const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

	await link.create({
		[Modules.CUSTOMER]: {
			customer_id: id
		},
		[CUSTOMER_TAG_MODULE]: {
			customer_tag_id: tag
		}
	})

	res.json({ customer_id: id, tag })
}
