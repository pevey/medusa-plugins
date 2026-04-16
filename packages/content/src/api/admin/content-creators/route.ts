import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../modules/content'
import { ContentService } from '../../../modules/content/service'
import {
	AdminCreateContentCreatorType,
	AdminDeleteContentCreatorsType,
	AdminGetContentCreatorsType
} from '../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCreatorsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q } = req.validatedQuery

	const { data: content_creators, metadata } = await query.graph({
		entity: 'content_creator',
		...req.queryConfig,
		filters: {
			...(q ? { name: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		content_creators,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentCreatorType>,
	res: MedusaResponse
) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_creator = await contentService.createContentCreators(req.validatedBody)
	res.json({ content_creator })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentCreatorsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCreators(ids)
	res.json({ deleted: ids })
}
