import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../modules/content'
import { ContentService } from '../../../../modules/content/service'
import { AdminGetContentCollectionType, AdminUpdateContentCollectionType } from '../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCollectionType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { collectionId } = req.params

	const {
		data: [content_collection]
	} = await query.graph(
		{
			entity: 'content_collection',
			...req.queryConfig,
			filters: { id: collectionId }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ content_collection })
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateContentCollectionType>, res: MedusaResponse) => {
	const { collectionId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const content_collection = await contentService.updateContentCollections({
		id: collectionId,
		...req.validatedBody
	})

	const eventBus = req.scope.resolve(Modules.EVENT_BUS)
	await eventBus.emit({ name: 'content-collection.updated', data: { id: collectionId } })

	res.json({ content_collection })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { collectionId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCollections([collectionId])
	res.json({ deleted: [collectionId] })
}
