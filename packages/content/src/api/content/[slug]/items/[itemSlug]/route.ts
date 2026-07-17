import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import type { ICachingModuleService } from '@medusajs/types'
import { ContentStatus } from '../../../../../modules/content/models/content-item'
import { StoreGetContentItemType } from '../../../../validators'
import { renderMarkdown, RENDERER_VERSION } from '../../../../../lib/markdown'

const TTL = 300 // 5 minutes

export const GET = async (
	req: MedusaRequest<StoreGetContentItemType>,
	res: MedusaResponse
) => {
	let caching: ICachingModuleService | null = null
	try { caching = req.scope.resolve(Modules.CACHING) ?? null } catch { /* noop */ }
	const { itemSlug } = req.params
	const wantsHtml = (req.validatedQuery as StoreGetContentItemType)?.render === 'html'

	const cacheKey = wantsHtml
		? `store:content-item:${itemSlug}:render=html:${RENDERER_VERSION}`
		: `store:content-item:${itemSlug}`
	const cached = caching ? await caching.get({ key: cacheKey }) : null
	if (cached) {
		res.json(cached)
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: [content_item] } = await query.graph({
		entity: 'content_item',
		...req.queryConfig,
		filters: { slug: itemSlug, status: ContentStatus.PUBLISHED }
	})

	if (!content_item) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Content item "${itemSlug}" not found`)
	}

	// Opt-in, markdown-only: derive body_html from the raw markdown body. The DB
	// is never touched — the rendering exists only in this response and the cache.
	if (wantsHtml && content_item.content_collection?.format === 'md' && content_item.body) {
		content_item.body_html = await renderMarkdown(content_item.body)
	}

	const body = { content_item }
	if (caching) await caching.set({ key: cacheKey, data: body as unknown as object, ttl: TTL })
	res.json(body)
}
