import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { STATISTICS_MODULE } from '../../../modules/statistics'
import { StatisticsService } from '../../../modules/statistics/service'
import { AdminGetStatisticsType } from '../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetStatisticsType>,
	res: MedusaResponse
) => {
	const statisticsService: StatisticsService = req.scope.resolve(STATISTICS_MODULE)
	const { period, start_date, end_date } = req.validatedQuery as AdminGetStatisticsType

	const now = new Date()
	let startDate: Date
	let endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

	if (start_date && end_date) {
		startDate = new Date(start_date)
		endDate = new Date(end_date)
	} else {
		switch (period) {
			case 'today':
				startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
				break
			case 'month':
				startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30))
				break
			case 'week':
			default:
				startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7))
				break
		}
	}

	const statistics = await statisticsService.listStatisticsDailies(
		{
			date: {
				$gte: startDate,
				$lt: endDate
			}
		} as any,
		{ order: { date: 'ASC' } }
	)

	// Compute aggregated totals across the period
	const totals = {
		revenue_total: 0,
		order_count: 0,
		average_order_value: 0,
		new_customer_count: 0,
		returning_customer_count: 0,
		pending_fulfillment_count: statistics.length > 0 ? (statistics[statistics.length - 1] as any).pending_fulfillment_count : 0,
		low_stock_count: statistics.length > 0 ? (statistics[statistics.length - 1] as any).low_stock_count : 0
	}

	for (const stat of statistics as any[]) {
		totals.revenue_total += stat.revenue_total
		totals.order_count += stat.order_count
		totals.new_customer_count += stat.new_customer_count
		totals.returning_customer_count += stat.returning_customer_count
	}

	totals.average_order_value = totals.order_count > 0 ? totals.revenue_total / totals.order_count : 0

	res.json({ statistics, totals, period })
}
