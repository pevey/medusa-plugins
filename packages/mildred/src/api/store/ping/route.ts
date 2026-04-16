import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import type { StoreTrackEventType } from '../../validators'

export const POST = async (
	req: MedusaRequest<StoreTrackEventType>,
	res: MedusaResponse
) => {
	const analyticsService = req.scope.resolve(Modules.ANALYTICS)
	const { event, actor_id, session_id, properties, sales_channel_id } = req.validatedBody

	if (event === '_identify') {
		await analyticsService.identify({
			actor_id: actor_id!,
			properties: {
				...properties,
				anonymous_id: properties?.anonymous_id
			}
		})
		res.status(202).json({ tracked: true })
		return
	}

	await analyticsService.track({
		event,
		actor_id,
		properties: {
			...properties,
			session_id,
			ip: req.ip,
			user_agent: req.headers['user-agent']
		}
	})

	res.status(202).json({ tracked: true })
}
