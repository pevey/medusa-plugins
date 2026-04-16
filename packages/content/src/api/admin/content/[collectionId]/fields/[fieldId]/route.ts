import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../modules/content'
import { ContentService } from '../../../../../../modules/content/service'
import {
	AdminGetContentCollectionFieldType,
	AdminUpdateContentCollectionFieldType
} from '../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCollectionFieldType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { fieldId } = req.params

	const { data: [field] } = await query.graph(
		{
			entity: 'content_field',
			fields: req.queryConfig.fields,
			filters: { id: fieldId }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ field })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateContentCollectionFieldType>,
	res: MedusaResponse
) => {
	const { fieldId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const field = await contentService.updateContentFields({ id: fieldId, ...req.validatedBody })
	res.json({ field })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const { fieldId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentFields([fieldId])
	res.json({ deleted: [fieldId] })
}
