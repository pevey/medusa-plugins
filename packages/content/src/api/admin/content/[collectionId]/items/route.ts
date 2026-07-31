import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import { AdminCreateContentItemType, AdminDeleteContentItemsType, AdminGetContentItemsType } from '../../../../validators'
import { ITEM_DETAIL_FIELDS } from '../../../../middlewares'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentItemsType>, res: MedusaResponse) => {
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

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentItemType>, res: MedusaResponse) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentItems({
		...req.validatedBody,
		content_collection_id: req.params.collectionId
	})

	const eventBus = req.scope.resolve(Modules.EVENT_BUS)
	await eventBus.emit({ name: 'content-item.created', data: { id: created.id } })

	// `createContentItems` returns the raw ORM entity: uninitialized hasMany Collection
	// proxies for `tags`/`outgoing_links`/`incoming_links`/`activity`, no nested
	// content_collection/creator objects, and `deleted_at`. Re-fetch through the same
	// query.graph selection the item detail GET route uses so the response matches
	// AdminContentItem exactly.
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [content_item]
	} = await query.graph({
		entity: 'content_item',
		fields: ITEM_DETAIL_FIELDS,
		filters: { id: created.id }
	})

	res.json({ content_item })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteContentItemsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentItems(ids)

	const eventBus = req.scope.resolve(Modules.EVENT_BUS)
	await eventBus.emit(ids.map(id => ({ name: 'content-item.deleted', data: { id } })))

	res.json({ deleted: ids })
}
