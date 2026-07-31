import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'
import { AdminCreateContentCollectionFieldType, AdminDeleteContentCollectionFieldsType, AdminGetContentCollectionFieldsType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCollectionFieldsType>, res: MedusaResponse) => {
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

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentCollectionFieldType>, res: MedusaResponse) => {
	const { collectionId: content_collection_id } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentFields({
		content_collection_id,
		...req.validatedBody
	})

	// `createContentFields` returns the raw ORM entity (`content_collection_id`, `deleted_at`
	// included). Neither GET fields route selects `content_collection_id` (see
	// AdminContentField's comment in types.ts), so destructure down to the same flat
	// selection both GET routes use -- no relations involved, so no re-fetch needed.
	const { id, name, label, field_type, required, options, default_value, sort_order, created_at, updated_at } = created
	res.json({ field: { id, name, label, field_type, required, options, default_value, sort_order, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteContentCollectionFieldsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentFields(ids)
	res.json({ deleted: ids })
}
