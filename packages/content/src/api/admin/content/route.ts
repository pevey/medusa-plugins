import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../modules/content'
import { ContentService } from '../../../modules/content/service'
import {
	AdminCreateContentCollectionType,
	AdminDeleteContentCollectionsType,
	AdminGetContentCollectionsType
} from '../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCollectionsType>,
	res: MedusaResponse
) => {
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

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentCollectionType>,
	res: MedusaResponse
) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_collection = await contentService.createContentCollections(req.validatedBody)
	res.json({ content_collection })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentCollectionsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCollections(ids)
	res.json({ deleted: ids })
}
