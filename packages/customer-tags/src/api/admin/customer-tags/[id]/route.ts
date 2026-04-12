import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CUSTOMER_TAG_MODULE } from '../../../../modules/customer-tag'
import { CustomerTagService } from '../../../../modules/customer-tag/service'
import { AdminGetCustomerTagType, AdminUpdateCustomerTagType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetCustomerTagType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [customerTag]
	} = await query.graph(
		{
			entity: 'customer_tag',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ customer_tag: customerTag })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateCustomerTagType>,
	res: MedusaResponse
) => {
	const customerTagService: CustomerTagService = req.scope.resolve(CUSTOMER_TAG_MODULE)
	const { id } = req.params
	const customerTag = await customerTagService.updateCustomerTags({
		id,
		...req.validatedBody
	})
	res.json({ customer_tag: customerTag })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const customerTagService: CustomerTagService = req.scope.resolve(CUSTOMER_TAG_MODULE)
	await customerTagService.deleteCustomerTags([id])
	const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
	await link.delete({
		[CUSTOMER_TAG_MODULE]: {
			customer_tag_id: id
		}
	})
	res.json({ deleted: [id] })
}
