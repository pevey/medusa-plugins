import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MILDRED_MODULE } from '../modules/analytics'
import type { MildredService } from '../modules/analytics/service'

export default async function rollupAnalyticsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const mildredService: MildredService = container.resolve(MILDRED_MODULE)

	try {
		const now = new Date()
		const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
		const startOfDay = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate()))
		const endOfDay = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate() + 1))

		logger.info(`analytics-rollup: aggregating events for ${startOfDay.toISOString().slice(0, 10)}`)

		const manager = (mildredService as any).__container__?.manager
		if (!manager) {
			logger.error('analytics-rollup: database manager not available')
			return
		}
		const knex = manager.getKnex()

		const rows = await knex('analytics_event')
			.select('event')
			.select('sales_channel_id')
			.count('* as count')
			.countDistinct('actor_id as unique_actors')
			.whereBetween('timestamp', [startOfDay, endOfDay])
			.whereNull('deleted_at')
			.groupBy('event', 'sales_channel_id')

		let upserted = 0
		for (const row of rows) {
			const existing = await mildredService.listAnalyticsEventDailies({
				event: row.event,
				date: startOfDay,
				sales_channel_id: row.sales_channel_id ?? null
			} as any)

			const data = {
				event: row.event,
				date: startOfDay,
				sales_channel_id: row.sales_channel_id ?? null,
				count: Number(row.count),
				unique_actors: Number(row.unique_actors)
			}

			if (existing[0]) {
				await mildredService.updateAnalyticsEventDailies({ id: existing[0].id, ...data } as any)
			} else {
				await mildredService.createAnalyticsEventDailies(data as any)
			}
			upserted++
		}

		logger.info(`analytics-rollup: upserted ${upserted} daily aggregates for ${startOfDay.toISOString().slice(0, 10)}`)
	} catch (error: any) {
		logger.error(`analytics-rollup: failed: ${error.message}`)
	}
}

export const config = {
	name: 'rollup-analytics',
	schedule: '30 1 * * *'
}
