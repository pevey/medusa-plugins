import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
	AdminCreateCustomerTagType,
	AdminGetCustomerTagsType,
	AdminDeleteCustomerTagsType
} from '../../validators'
import { CUSTOMER_TAG_MODULE } from '../../../modules/customer-tag'
import { CustomerTagService } from '../../../modules/customer-tag/service'

export async function GET(
	req: AuthenticatedMedusaRequest<AdminGetCustomerTagsType>,
	res: MedusaResponse
) {
	const { q } = req.validatedQuery
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: customerTags, metadata } = await query.graph({
		entity: 'customer_tag',
		...req.queryConfig,
		filters: {
			...(q ? { value: { $ilike: `%${q}%` } } : {})
		}
	})
	res.json({
		customer_tags: customerTags,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateCustomerTagType>,
	res: MedusaResponse
) => {
	const customerTagService: CustomerTagService = req.scope.resolve(CUSTOMER_TAG_MODULE)
	const customerTag = await customerTagService.createCustomerTags(req.validatedBody)
	res.json({ customer_tag: customerTag })
}

export async function DELETE(
	req: AuthenticatedMedusaRequest<AdminDeleteCustomerTagsType>,
	res: MedusaResponse
) {
	const { ids } = req.validatedBody
	const customerTagService: CustomerTagService = req.scope.resolve(CUSTOMER_TAG_MODULE)
	await customerTagService.deleteCustomerTags(ids)
	const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
	await link.delete({
		[CUSTOMER_TAG_MODULE]: {
			customer_tag_id: ids
		}
	})
	res.json({ deleted: ids })
}
