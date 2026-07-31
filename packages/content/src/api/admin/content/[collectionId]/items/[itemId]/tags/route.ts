import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../../modules/content'
import { ContentService } from '../../../../../../../modules/content/service'
import { AdminAddContentTagType, AdminRemoveContentTagsType } from '../../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
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

export const POST = async (req: AuthenticatedMedusaRequest<AdminAddContentTagType>, res: MedusaResponse) => {
	const { itemId: item_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentTags({ item_id, ...req.validatedBody })

	// `createContentTags` returns the raw ORM entity (`item_id`, `deleted_at` included).
	// The item-scoped GET route never selects `item_id` -- the item is already the resource
	// being scoped to (see AdminContentTag vs. AdminContentTagWithItem in types.ts).
	// Destructure down to the same flat selection the GET route uses -- no relations
	// involved, so no re-fetch needed.
	const { id, value, metadata, created_at, updated_at } = created
	res.json({ tag: { id, value, metadata, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminRemoveContentTagsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentTags(ids)
	res.json({ deleted: ids })
}
