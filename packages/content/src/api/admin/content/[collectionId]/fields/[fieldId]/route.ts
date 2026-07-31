import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../modules/content'
import { ContentService } from '../../../../../../modules/content/service'
import { AdminGetContentCollectionFieldType, AdminUpdateContentCollectionFieldType } from '../../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCollectionFieldType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { fieldId } = req.params

	const {
		data: [field]
	} = await query.graph(
		{
			entity: 'content_field',
			fields: req.queryConfig.fields,
			filters: { id: fieldId }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ field })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateContentCollectionFieldType>, res: MedusaResponse) => {
	const { fieldId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const updated = await contentService.updateContentFields({ id: fieldId, ...req.validatedBody })

	// See POST /admin/content/:collectionId/fields -- destructure down to the same flat
	// selection both GET routes use.
	const { id, name, label, field_type, required, options, default_value, sort_order, created_at, updated_at } = updated
	res.json({ field: { id, name, label, field_type, required, options, default_value, sort_order, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { fieldId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentFields([fieldId])
	res.json({ deleted: [fieldId] })
}
