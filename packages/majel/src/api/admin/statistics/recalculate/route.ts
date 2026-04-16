import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AdminRecalculateStatisticsType } from '../../../validators'
import { STATISTICS_MODULE } from '../../../../modules/statistics'
import { StatisticsService } from '../../../../modules/statistics/service'
import { computeStatsForDay } from '../../../../jobs/update-statistics'

async function recalculateAll(req: AuthenticatedMedusaRequest) {
	const statisticsService: StatisticsService = req.scope.resolve(STATISTICS_MODULE)

	// Find the earliest existing stat to know how far back to go
	const allStats = await statisticsService.listStatisticsDailies({}, { order: { date: 'ASC' }, take: 1 })

	const now = new Date()
	const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

	// Default to 30 days back if no existing stats
	let startDate = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)
	)
	if (allStats.length > 0) {
		const earliest = new Date((allStats[0] as any).date)
		if (earliest < startDate) {
			startDate = earliest
		}
	}

	// Recompute each day from startDate through today
	const current = new Date(startDate)
	while (current <= today) {
		await computeStatsForDay(req.scope, new Date(current))
		current.setUTCDate(current.getUTCDate() + 1)
	}
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminRecalculateStatisticsType>,
	res: MedusaResponse
) => {
	await recalculateAll(req)
	res.json({ success: true })
}
