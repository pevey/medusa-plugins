import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import { AdminCreateContentCollectionRelationshipType, AdminGetContentCollectionRelationshipsType } from '../../../../validators'
import { CONTENT_RELATIONSHIP_FIELDS } from '../../../../middlewares'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCollectionRelationshipsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { collectionId } = req.params

	const { data: relationships, metadata } = await query.graph({
		entity: 'content_relationship',
		...req.queryConfig,
		filters: {
			$or: [{ source_collection_id: collectionId }, { target_collection_id: collectionId }]
		}
	})

	res.json({
		relationships,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentCollectionRelationshipType>, res: MedusaResponse) => {
	const { collectionId: source_collection_id } = req.params
	const { target_collection_id, relationship_type } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentRelationships({
		source_collection_id,
		target_collection_id,
		relationship_type
	})

	// `createContentRelationships` returns the raw ORM entity: no nested
	// source_collection/target_collection objects (label/slug), and -- per the content
	// module's `content_relationship` -> `content_collection` FK trap -- the belongsTo FK
	// scalars are NOT auto-included by query.graph the way they are for `content_item` ->
	// `content_collection` (two belongsTo relations pointing at the same target entity).
	// Re-fetch through the same query.graph selection the GET routes use so the response
	// matches AdminContentRelationship exactly.
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [relationship]
	} = await query.graph({
		entity: 'content_relationship',
		fields: CONTENT_RELATIONSHIP_FIELDS,
		filters: { id: created.id }
	})

	res.json({ relationship })
}
