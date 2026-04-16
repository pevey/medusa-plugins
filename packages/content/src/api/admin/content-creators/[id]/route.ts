import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../modules/content'
import { ContentService } from '../../../../modules/content/service'
import {
	AdminGetContentCreatorType,
	AdminUpdateContentCreatorType
} from '../../../validators'
import { ContentCreatorActivityType } from '../../../../modules/content/models/content-creator-activity'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCreatorType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const { data: [content_creator] } = await query.graph(
		{
			entity: 'content_creator',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ content_creator })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateContentCreatorType>,
	res: MedusaResponse
) => {
	const { id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_creator = await contentService.updateContentCreators({ id, ...req.validatedBody })
	await contentService.logContentCreatorActivity(id, req.auth_context.actor_id, ContentCreatorActivityType.EDIT)
	res.json({ content_creator })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const { id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCreators([id])
	res.json({ deleted: [id] })
}
