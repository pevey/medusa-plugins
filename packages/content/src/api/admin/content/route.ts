import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../modules/content'
import { ContentService } from '../../../modules/content/service'
import { AdminCreateContentCollectionType, AdminDeleteContentCollectionsType, AdminGetContentCollectionsType } from '../../validators'
import { COLLECTION_DETAIL_FIELDS } from '../../middlewares'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCollectionsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q } = req.validatedQuery

	const { data: content_collections, metadata } = await query.graph({
		entity: 'content_collection',
		...req.queryConfig,
		filters: {
			...(q ? { label: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		content_collections,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentCollectionType>, res: MedusaResponse) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentCollections(req.validatedBody)

	// `createContentCollections` returns the raw ORM entity, which carries `deleted_at`,
	// `searchable`, and uninitialized hasMany Collection proxies (`content_fields`,
	// `source_relationships`, `target_relationships`, `items`) -- none of which are part of
	// the admin contract. Re-fetch through the same query.graph selection the collection
	// detail GET route uses so the response matches AdminContentCollection exactly.
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [content_collection]
	} = await query.graph({
		entity: 'content_collection',
		fields: COLLECTION_DETAIL_FIELDS,
		filters: { id: created.id }
	})

	res.json({ content_collection })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteContentCollectionsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCollections(ids)
	res.json({ deleted: ids })
}
