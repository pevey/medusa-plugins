import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../modules/content'
import { ContentService } from '../../../../modules/content/service'
import {
	AdminGetContentTagType,
	AdminUpdateContentTagType
} from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentTagType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const { data: [content_tag] } = await query.graph(
		{
			entity: 'content_tag',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ content_tag })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateContentTagType>,
	res: MedusaResponse
) => {
	const { id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_tag = await contentService.updateContentTags({ id, ...req.validatedBody })
	res.json({ content_tag })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const { id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentTags([id])
	res.json({ deleted: [id] })
}
