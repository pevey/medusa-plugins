import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MILDRED_MODULE } from '../../../../../../modules/analytics'
import type { MildredService } from '../../../../../../modules/analytics/service'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const mildredService: MildredService = req.scope.resolve(MILDRED_MODULE)
	const segment = await mildredService.retrieveAnalyticsSegment(req.params.id)
	const rules = segment.rules as any

	const actorIds = await mildredService.evaluateSegmentRules(
		rules,
		segment.sales_channel_id as string | undefined
	)

	res.json({
		count: actorIds.length,
		sample: actorIds.slice(0, 20)
	})
}
