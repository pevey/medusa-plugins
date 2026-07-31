import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../modules/content'
import { ContentService } from '../../../modules/content/service'
import { AdminCreateContentTagType, AdminDeleteContentTagsType, AdminGetContentTagsType } from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentTagsType>, res: MedusaResponse) => {
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

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentTagType>, res: MedusaResponse) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentTags(req.validatedBody)

	// `createContentTags` returns the raw ORM entity (`deleted_at` included). Destructure
	// down to the same flat selection both standalone GET routes use -- no relations
	// involved, so no re-fetch needed. Unlike the item-scoped add-tag route, `item_id` IS
	// part of this standalone shape (AdminContentTagWithItem) -- see types.ts.
	const { id, value, item_id, metadata, created_at, updated_at } = created
	res.json({ content_tag: { id, value, item_id, metadata, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteContentTagsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentTags(ids)
	res.json({ deleted: ids })
}
