import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../../modules/content'
import { ContentService } from '../../../../../../../modules/content/service'
import {
	AdminAddContentTagType,
	AdminRemoveContentTagsType
} from '../../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { itemId: item_id } = req.params

	const { data: tags, metadata } = await query.graph({
		entity: 'content_tag',
		...req.queryConfig,
		filters: { item_id }
	})

	res.json({
		tags,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminAddContentTagType>,
	res: MedusaResponse
) => {
	const { itemId: item_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const tag = await contentService.createContentTags({ item_id, ...req.validatedBody })
	res.json({ tag })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminRemoveContentTagsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentTags(ids)
	res.json({ deleted: ids })
}
