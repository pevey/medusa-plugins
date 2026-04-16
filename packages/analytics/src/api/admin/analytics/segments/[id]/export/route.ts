import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { PRIVATE_ANALYTICS_MODULE } from '../../../../../../modules/analytics'
import type { PrivateAnalyticsService } from '../../../../../../modules/analytics/service'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const privateAnalyticsService: PrivateAnalyticsService =
		req.scope.resolve(PRIVATE_ANALYTICS_MODULE)
	const segment = await privateAnalyticsService.retrieveAnalyticsSegment(req.params.id)

	const members = await privateAnalyticsService.listAnalyticsSegmentMemberships({
		segment_id: req.params.id
	} as any)
	const actorIds = members.map((m: any) => m.actor_id)

	const identities =
		actorIds.length > 0
			? await privateAnalyticsService.listAnalyticsIdentities({ actor_id: actorIds } as any)
			: []

	const identityMap = new Map(identities.map((i: any) => [i.actor_id, i]))

	const rows = ['actor_id,customer_id,email,properties,evaluated_at']
	for (const member of members) {
		const identity = identityMap.get((member as any).actor_id)
		const props = identity?.properties as Record<string, unknown> | null
		rows.push(
			[
				(member as any).actor_id,
				identity?.customer_id || '',
				(props?.email as string) || '',
				props ? JSON.stringify(props).replace(/"/g, '""') : '',
				(member as any).evaluated_at
			]
				.map(v => `"${v}"`)
				.join(',')
		)
	}

	const csv = rows.join('\n')
	res.setHeader('Content-Type', 'text/csv')
	res.setHeader('Content-Disposition', `attachment; filename="${segment.name}-members.csv"`)
	res.send(csv)
}
