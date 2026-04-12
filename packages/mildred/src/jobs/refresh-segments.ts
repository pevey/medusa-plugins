import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MILDRED_MODULE } from '../modules/analytics'
import type { MildredService } from '../modules/analytics/service'

export default async function refreshSegmentsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const mildredService: MildredService = container.resolve(MILDRED_MODULE)

	try {
		const segments = await mildredService.listAnalyticsSegments({} as any)

		logger.info(`segment-refresh: evaluating ${segments.length} segments`)

		for (const segment of segments) {
			const rules = (segment as any).rules
			const salesChannelId = (segment as any).sales_channel_id

			const actorIds = await mildredService.evaluateSegmentRules(rules, salesChannelId)

			// Delete existing memberships for this segment
			const existing = await mildredService.listAnalyticsSegmentMemberships(
				{ segment_id: segment.id } as any
			)
			if (existing.length > 0) {
				await mildredService.deleteAnalyticsSegmentMemberships(
					existing.map((m: any) => m.id)
				)
			}

			// Insert new memberships in batches
			const now = new Date()
			if (actorIds.length > 0) {
				const memberships = actorIds.map(actor_id => ({
					segment_id: segment.id,
					actor_id,
					evaluated_at: now
				}))
				for (let i = 0; i < memberships.length; i += 100) {
					await mildredService.createAnalyticsSegmentMemberships(
						memberships.slice(i, i + 100) as any
					)
				}
			}

			logger.info(`segment-refresh: ${(segment as any).name} — ${actorIds.length} members`)
		}

		logger.info(`segment-refresh: completed ${segments.length} segments`)
	} catch (error: any) {
		logger.error(`segment-refresh: failed: ${error.message}`)
	}
}

export const config = {
	name: 'refresh-segments',
	schedule: '0 3 * * *'
}
