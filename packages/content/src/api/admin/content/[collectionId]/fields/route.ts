import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import {
	AdminCreateContentCollectionFieldType,
	AdminDeleteContentCollectionFieldsType,
	AdminGetContentCollectionFieldsType
} from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCollectionFieldsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { collectionId: content_collection_id } = req.params

	const { data: fields, metadata } = await query.graph({
		entity: 'content_field',
		...req.queryConfig,
		filters: { content_collection_id }
	})

	res.json({
		fields,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentCollectionFieldType>,
	res: MedusaResponse
) => {
	const { collectionId: content_collection_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const field = await contentService.createContentFields({ content_collection_id, ...req.validatedBody })
	res.json({ field })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteContentCollectionFieldsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentFields(ids)
	res.json({ deleted: ids })
}
