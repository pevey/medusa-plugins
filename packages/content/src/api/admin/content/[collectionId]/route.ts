import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../modules/content'
import { ContentService } from '../../../../modules/content/service'
import { AdminGetContentCollectionType, AdminUpdateContentCollectionType } from '../../../validators'
import { COLLECTION_DETAIL_FIELDS } from '../../../middlewares'

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
	await contentService.updateContentCollections({
		id: collectionId,
		...req.validatedBody
	})

	const eventBus = req.scope.resolve(Modules.EVENT_BUS)
	await eventBus.emit({ name: 'content-collection.updated', data: { id: collectionId } })

	// `updateContentCollections` returns the raw ORM entity (deleted_at, uninitialized
	// hasMany Collection proxies). Re-fetch through the same query.graph selection the GET
	// route uses so the response matches AdminContentCollection exactly.
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [content_collection]
	} = await query.graph({
		entity: 'content_collection',
		fields: COLLECTION_DETAIL_FIELDS,
		filters: { id: collectionId }
	})

	res.json({ content_collection })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { collectionId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCollections([collectionId])
	res.json({ deleted: [collectionId] })
}
