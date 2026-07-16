import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { PRIVATE_ANALYTICS_MODULE } from '../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../modules/analytics/service'
import { getAllowedEventNames } from '../../../lib/rubric-gate'
import type { StoreTrackEventBatchType } from '../../validators'

export const POST = async (
	req: MedusaRequest<StoreTrackEventBatchType>,
	res: MedusaResponse
) => {
	const analyticsService = req.scope.resolve(Modules.ANALYTICS)
	const privateService = req.scope.resolve(PRIVATE_ANALYTICS_MODULE) as PrivateAnalyticsService

	// Gate the public endpoint: only store system events and events with an
	// active rubric. Everything else (arbitrary client-supplied names) is dropped.
	const allowed = await getAllowedEventNames(privateService)

	// Derive the sales channel from the publishable API key on the request
	// (server-side, unspoofable). A single-channel key attributes cleanly; a key
	// linked to multiple channels is ambiguous, so we leave attribution unset.
	const channelIds: string[] =
		(req as any).publishable_key_context?.sales_channel_ids ?? []
	const salesChannelId = channelIds.length === 1 ? channelIds[0] : null

	// Normalize a single event or a batch to one array, then dispatch per event.
	const events = Array.isArray(req.validatedBody)
		? req.validatedBody
		: [req.validatedBody]

	let accepted = 0
	for (const { event, actor_id, session_id, properties } of events) {
		if (event === '_identify') {
			await analyticsService.identify({
				actor_id: actor_id!,
				properties: {
					...properties,
					anonymous_id: properties?.anonymous_id
				}
			})
			accepted++
			continue
		}

		if (!allowed.has(event)) {
			continue
		}

		// Note: no ip/user_agent here — events are proxied through the storefront
		// server, so req.ip/user-agent are the proxy's, not the visitor's. The real
		// client IP + country are captured on the identity via `_identify` at the edge.
		await analyticsService.track({
			event,
			actor_id,
			properties: {
				...properties,
				session_id,
				...(salesChannelId ? { _sales_channel_id: salesChannelId } : {}),
				_source: 'storefront'
			}
		})
		accepted++
	}

	res.status(202).json({ tracked: true, count: accepted })
}
