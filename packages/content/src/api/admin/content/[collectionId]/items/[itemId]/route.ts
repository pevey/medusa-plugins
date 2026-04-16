import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../../../../modules/content'
import { ContentService } from '../../../../../../modules/content/service'
import { ContentStatus } from '../../../../../../modules/content/models/content-item'
import { ContentItemActivityType } from '../../../../../../modules/content/models/content-item-activity'
import {
	AdminGetContentItemType,
	AdminUpdateContentItemType
} from '../../../../../validators'

const statusToActivityType: Partial<Record<ContentStatus, ContentItemActivityType>> = {
	[ContentStatus.PUBLISHED]: ContentItemActivityType.PUBLISH,
	[ContentStatus.ARCHIVED]: ContentItemActivityType.ARCHIVE,
	[ContentStatus.DRAFT]: ContentItemActivityType.DRAFT
}

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetContentItemType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { itemId } = req.params

	const { data: [content_item] } = await query.graph(
		{
			entity: 'content_item',
			fields: req.queryConfig.fields,
			filters: { id: itemId }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ content_item })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateContentItemType>,
	res: MedusaResponse
) => {
	const { itemId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)

	const current = await contentService.retrieveContentItem(itemId)
	const content_item = await contentService.updateItem({ id: itemId, ...req.validatedBody })

	const { status } = req.validatedBody
	if (status && status !== current.status) {
		const activityType = statusToActivityType[status]
		if (activityType) {
			await contentService.logContentItemActivity(itemId, req.auth_context.actor_id, activityType)
		}
	} else {
		await contentService.logContentItemActivity(itemId, req.auth_context.actor_id, ContentItemActivityType.EDIT)
	}

	res.json({ content_item })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const { itemId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentItems([itemId])
	res.json({ deleted: [itemId] })
}
