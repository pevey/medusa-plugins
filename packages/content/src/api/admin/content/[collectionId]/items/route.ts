import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import {
	AdminCreateContentItemType,
	AdminDeleteContentItemsType,
	AdminGetContentItemsType
} from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentItemsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { creator_id, status, q } = req.validatedQuery

	const { data: content_items, metadata } = await query.graph({
		entity: 'content_item',
		...req.queryConfig,
		filters: {
			content_collection_id: req.params.collectionId,
			...(creator_id ? { creator_id } : {}),
			...(status ? { status } : {}),
			...(q ? { title: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		content_items,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentItemType>,
	res: MedusaResponse
) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_item = await contentService.createContentItems({
		...req.validatedBody,
		content_collection_id: req.params.collectionId
	})
	res.json({ content_item })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentItemsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentItems(ids)
	res.json({ deleted: ids })
}
