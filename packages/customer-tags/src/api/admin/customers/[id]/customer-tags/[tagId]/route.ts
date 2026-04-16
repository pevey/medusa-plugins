import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CUSTOMER_TAG_MODULE } from '../../../../../../modules/customer-tag'

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id, tagId } = req.params

	const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

	await link.dismiss({
		[Modules.CUSTOMER]: {
			customer_id: id
		},
		[CUSTOMER_TAG_MODULE]: {
			customer_tag_id: tagId
		}
	})

	res.json({ customer_id: id, tag_id: tagId, deleted: true })
}
