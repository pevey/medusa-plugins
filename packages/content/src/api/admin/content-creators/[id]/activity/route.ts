import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import {
	AdminCreateContentCreatorActivityType,
	AdminDeleteContentCreatorActivityType,
	AdminGetContentCreatorActivityType
} from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCreatorActivityType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id: creator_id } = req.params

	const { data: activity, metadata } = await query.graph({
		entity: 'content_creator_activity',
		...req.queryConfig,
		filters: { creator_id }
	})

	res.json({
		activity,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentCreatorActivityType>,
	res: MedusaResponse
) => {
	const { id: creator_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const entry = await contentService.createContentCreatorActivities({
		creator_id,
		user_id: req.auth_context.actor_id,
		...req.validatedBody
	})
	res.json({ entry })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentCreatorActivityType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCreatorActivities(ids)
	res.json({ deleted: ids })
}
