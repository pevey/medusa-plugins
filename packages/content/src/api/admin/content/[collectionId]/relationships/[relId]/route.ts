import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../modules/content'
import { ContentService } from '../../../../../../modules/content/service'
import { AdminGetContentCollectionRelationshipType } from '../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentCollectionRelationshipType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { relId } = req.params

	const { data: [relationship] } = await query.graph(
		{
			entity: 'content_relationship',
			fields: req.queryConfig.fields,
			filters: { id: relId }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ relationship })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const { relId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentRelationships([relId])
	res.json({ deleted: [relId] })
}
