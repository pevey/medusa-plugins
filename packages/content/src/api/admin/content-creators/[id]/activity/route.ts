import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import { AdminCreateContentCreatorActivityType, AdminDeleteContentCreatorActivityType, AdminGetContentCreatorActivityType } from '../../../../validators'
import { CREATOR_ACTIVITY_FIELDS } from '../../../../middlewares'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCreatorActivityType>, res: MedusaResponse) => {
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

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentCreatorActivityType>, res: MedusaResponse) => {
	const { id: creator_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentCreatorActivities({
		creator_id,
		user_id: req.auth_context.actor_id,
		...req.validatedBody
	})

	// See POST /admin/content/:collectionId/items/:itemId/activity -- re-fetch through the
	// same query.graph selection the list route uses so `user` is populated and
	// `deleted_at` doesn't leak.
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [entry]
	} = await query.graph({
		entity: 'content_creator_activity',
		fields: CREATOR_ACTIVITY_FIELDS,
		filters: { id: created.id }
	})

	res.json({ entry })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteContentCreatorActivityType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCreatorActivities(ids)
	res.json({ deleted: ids })
}
