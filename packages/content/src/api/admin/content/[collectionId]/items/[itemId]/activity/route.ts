import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../../modules/content'
import { ContentService } from '../../../../../../../modules/content/service'
import {
	AdminCreateContentItemActivityType,
	AdminDeleteContentItemActivityType,
	AdminGetContentItemActivityType
} from '../../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentItemActivityType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { itemId: item_id } = req.params

	const { data: activity, metadata } = await query.graph({
		entity: 'content_item_activity',
		...req.queryConfig,
		filters: { item_id }
	})

	res.json({
		activity,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentItemActivityType>,
	res: MedusaResponse
) => {
	const { itemId: item_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const entry = await contentService.createContentItemActivities({
		item_id,
		user_id: req.auth_context.actor_id,
		...req.validatedBody
	})
	res.json({ entry })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentItemActivityType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentItemActivities(ids)
	res.json({ deleted: ids })
}
