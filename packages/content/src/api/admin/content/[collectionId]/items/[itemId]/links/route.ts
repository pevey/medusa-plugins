import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../../modules/content'
import { ContentService } from '../../../../../../../modules/content/service'
import {
	AdminCreateContentItemLinkType,
	AdminGetContentItemLinksType
} from '../../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentItemLinksType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { itemId: source_item_id } = req.params

	const { data: links, metadata } = await query.graph({
		entity: 'content_link',
		...req.queryConfig,
		filters: { source_item_id }
	})

	res.json({
		links,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateContentItemLinkType>,
	res: MedusaResponse
) => {
	const { itemId: source_item_id } = req.params
	const { target_item_id, relationship_id } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const link = await contentService.createContentLinks({
		source_item_id,
		target_item_id,
		relationship_id
	})
	res.json({ link })
}
