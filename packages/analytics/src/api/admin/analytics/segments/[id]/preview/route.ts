import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../../modules/analytics/service'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const segment = await privateAnalyticsService.retrieveAnalyticsSegment(req.params.id)
	const rules = segment.rules as any

	const actorIds = await privateAnalyticsService.evaluateSegmentRules(
		rules,
		segment.sales_channel_id as string | undefined
	)

	res.json({
		count: actorIds.length,
		sample: actorIds.slice(0, 20)
	})
}
