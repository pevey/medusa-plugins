import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../modules/analytics/service'
import type { AdminGetEventCountsType } from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetEventCountsType>,
	res: MedusaResponse
) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const validated = req.validatedQuery as AdminGetEventCountsType

	const counts = await privateAnalyticsService.getEventCounts({
		event: validated.event ? validated.event.split(',') : undefined,
		start_date: new Date(validated.start_date),
		end_date: new Date(validated.end_date),
		granularity: validated.granularity,
		sales_channel_id: validated.sales_channel_id
	})

	res.json({ counts })
}
