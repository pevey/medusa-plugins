import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CONTENT_MODULE } from '../../../modules/content'
import { ContentService } from '../../../modules/content/service'
import { AdminCreateContentCreatorType, AdminDeleteContentCreatorsType, AdminGetContentCreatorsType } from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetContentCreatorsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q } = req.validatedQuery

	const { data: content_creators, metadata } = await query.graph({
		entity: 'content_creator',
		...req.queryConfig,
		filters: {
			...(q ? { name: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		content_creators,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateContentCreatorType>, res: MedusaResponse) => {
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const created = await contentService.createContentCreators(req.validatedBody)

	// `createContentCreators` returns the raw ORM entity (`deleted_at`, uninitialized hasMany
	// Collection proxies for `items`/`activity`). Destructure down to the same flat
	// selection both GET routes use -- we never touch the Collection proxies, so no
	// re-fetch is needed here.
	const { id, name, bio, avatar_url, metadata, created_at, updated_at } = created
	res.json({ content_creator: { id, name, bio, avatar_url, metadata, created_at, updated_at } })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteContentCreatorsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentCreators(ids)
	res.json({ deleted: ids })
}
