import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MILDRED_MODULE } from '../modules/analytics'
import type { MildredService } from '../modules/analytics/service'

const RETENTION_DAYS = 90
const BATCH_SIZE = 1000

export default async function archiveAnalyticsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const mildredService: MildredService = container.resolve(MILDRED_MODULE)

	try {
		const cutoff = new Date()
		cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

		logger.info(`analytics-archive: deleting raw events older than ${cutoff.toISOString().slice(0, 10)} (${RETENTION_DAYS} day retention)`)

		const manager = (mildredService as any).__container__?.manager
		if (!manager) {
			logger.error('analytics-archive: database manager not available')
			return
		}
		const knex = manager.getKnex()

		let totalDeleted = 0
		let batchDeleted: number

		do {
			const result = await knex.raw(`
				DELETE FROM analytics_event
				WHERE id IN (
					SELECT id FROM analytics_event
					WHERE "timestamp" < ?
					AND deleted_at IS NULL
					LIMIT ?
				)
			`, [cutoff, BATCH_SIZE])

			batchDeleted = result.rowCount ?? 0
			totalDeleted += batchDeleted
		} while (batchDeleted === BATCH_SIZE)

		logger.info(`analytics-archive: deleted ${totalDeleted} raw events older than ${cutoff.toISOString().slice(0, 10)}`)
	} catch (error: any) {
		logger.error(`analytics-archive: failed: ${error.message}`)
	}
}

export const config = {
	name: 'archive-analytics',
	schedule: '0 2 * * *'
}
