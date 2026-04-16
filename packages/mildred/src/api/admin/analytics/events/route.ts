import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type { AdminGetEventsType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetEventsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { event, actor_id, source, sales_channel_id, start_date, end_date } = req.validatedQuery

	const filters: Record<string, unknown> = {}
	if (event) filters.event = event
	if (actor_id) filters.actor_id = actor_id
	if (source) filters.source = source
	if (sales_channel_id) filters.sales_channel_id = sales_channel_id
	if (start_date || end_date) {
		filters.timestamp = {
			...(start_date ? { $gte: start_date } : {}),
			...(end_date ? { $lte: end_date } : {})
		}
	}

	const { data: events, metadata } = await query.graph({
		entity: 'analytics_event',
		...req.queryConfig,
		filters
	})

	res.json({
		events,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}
