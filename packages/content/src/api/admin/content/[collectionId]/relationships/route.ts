import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import {
	AdminCreateContentCollectionRelationshipType,
	AdminGetContentCollectionRelationshipsType
} from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCollectionRelationshipsType>,
	res: MedusaResponse
) => {
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

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentCollectionRelationshipType>,
	res: MedusaResponse
) => {
	const { collectionId: source_collection_id } = req.params
	const { target_collection_id, relationship_type } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const relationship = await contentService.createContentRelationships({
		source_collection_id,
		target_collection_id,
		relationship_type
	})
	res.json({ relationship })
}
