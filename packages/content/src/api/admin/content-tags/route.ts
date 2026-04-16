import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../modules/content'
import { ContentService } from '../../../modules/content/service'
import {
	AdminCreateContentTagType,
	AdminDeleteContentTagsType,
	AdminGetContentTagsType
} from '../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentTagsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { item_id, q } = req.validatedQuery

	const { data: content_tags, metadata } = await query.graph({
		entity: 'content_tag',
		...req.queryConfig,
		filters: {
			...(item_id ? { item_id } : {}),
			...(q ? { value: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		content_tags,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentTagType>,
	res: MedusaResponse
) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_tag = await contentService.createContentTags(req.validatedBody)
	res.json({ content_tag })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentTagsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentTags(ids)
	res.json({ deleted: ids })
}
