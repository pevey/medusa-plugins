import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { STATISTICS_MODULE } from '../modules/statistics'
import { StatisticsService } from '../modules/statistics/service'

export async function computeStatsForDay(container: MedusaContainer, day: Date) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const statisticsService: StatisticsService = container.resolve(STATISTICS_MODULE)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	const startOfDay = day.toISOString()
	const endOfDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1)).toISOString()

	logger.info(`statistics: computing stats for ${startOfDay.slice(0, 10)}`)

	// ── Orders & Revenue ────────────────────────────────────────────────
	let revenueTotal = 0
	let orderCount = 0
	const productQuantities: Record<string, { title: string; quantity: number }> = {}
	const customerIdsInPeriod = new Set<string>()

	const limit = 100
	let offset = 0
	let totalCount = 0

	do {
		const { data: orders, metadata } = await query.graph({
			entity: 'order',
			fields: [
				'id', 'total', 'status',
				'customer.id',
				'items.*'
			],
			filters: {
				created_at: { $gte: startOfDay, $lt: endOfDay }
			} as any,
			pagination: { take: limit, skip: offset }
		})

		totalCount = metadata?.count || 0
		offset += limit

		for (const order of orders as any[]) {
			if (order.status === 'canceled') continue

			orderCount++
			revenueTotal += order.total ?? 0

			if (order.customer?.id) {
				customerIdsInPeriod.add(order.customer.id)
			}

			for (const item of order.items ?? []) {
				if (!item?.product_id) continue
				const existing = productQuantities[item.product_id]
				if (existing) {
					existing.quantity += item.quantity ?? 0
				} else {
					productQuantities[item.product_id] = {
						title: item.title ?? '',
						quantity: item.quantity ?? 0
					}
				}
			}
		}
	} while (offset < totalCount)

	const averageOrderValue = orderCount > 0 ? revenueTotal / orderCount : 0

	// Top 10 products by quantity sold
	const topProducts = Object.entries(productQuantities)
		.map(([product_id, { title, quantity }]) => ({ product_id, title, quantity_sold: quantity }))
		.sort((a, b) => b.quantity_sold - a.quantity_sold)
		.slice(0, 10)

	// ── Customer Counts ─────────────────────────────────────────────────
	let newCustomerCount = 0
	let customerOffset = 0
	let customerTotal = 0

	do {
		const { data: customers, metadata } = await query.graph({
			entity: 'customer',
			fields: ['id'],
			filters: {
				created_at: { $gte: startOfDay, $lt: endOfDay }
			} as any,
			pagination: { take: limit, skip: customerOffset }
		})

		customerTotal = metadata?.count || 0
		customerOffset += limit
		newCustomerCount += customers.length
	} while (customerOffset < customerTotal)

	// Returning = customers who placed orders in period but were created before it
	let returningCustomerCount = 0
	for (const customerId of customerIdsInPeriod) {
		const { data: [customer] } = await query.graph({
			entity: 'customer',
			fields: ['id', 'created_at'],
			filters: { id: customerId }
		})
		if (customer && new Date((customer as any).created_at) < day) {
			returningCustomerCount++
		}
	}

	// ── Pending Fulfillment ─────────────────────────────────────────────
	let pendingFulfillmentCount = 0
	let pendingOffset = 0
	let pendingTotal = 0

	do {
		const { data: orders, metadata } = await query.graph({
			entity: 'order',
			fields: ['id'],
			filters: {
				status: { $nin: ['completed', 'canceled', 'archived'] }
			} as any,
			pagination: { take: limit, skip: pendingOffset }
		})

		pendingTotal = metadata?.count || 0
		pendingOffset += limit
		pendingFulfillmentCount += orders.length
	} while (pendingOffset < pendingTotal)

	// ── Low Stock ───────────────────────────────────────────────────────
	const { metadata: lowStockMeta } = await query.graph({
		entity: 'inventory_item',
		fields: ['id'],
		filters: {
			location_levels: {
				stocked_quantity: { $lte: 10 }
			}
		} as any,
		pagination: { take: 1 }
	})
	const lowStockCount = lowStockMeta?.count || 0

	// ── Upsert ──────────────────────────────────────────────────────────
	const [existing] = await statisticsService.listStatisticsDailies(
		{ date: day } as any,
		{ take: 1 }
	)

	const statData = {
		date: day,
		revenue_total: revenueTotal,
		order_count: orderCount,
		average_order_value: averageOrderValue,
		new_customer_count: newCustomerCount,
		returning_customer_count: returningCustomerCount,
		pending_fulfillment_count: pendingFulfillmentCount,
		low_stock_count: lowStockCount,
		top_products: topProducts
	}

	if (existing) {
		await statisticsService.updateStatisticsDailies({ id: existing.id, ...statData } as any)
	} else {
		await statisticsService.createStatisticsDailies(statData as any)
	}

	logger.info(
		`statistics: ${startOfDay.slice(0, 10)} — ` +
		`revenue: ${revenueTotal}, orders: ${orderCount}, AOV: ${averageOrderValue.toFixed(2)}, ` +
		`new customers: ${newCustomerCount}, returning: ${returningCustomerCount}, ` +
		`pending fulfillment: ${pendingFulfillmentCount}, low stock: ${lowStockCount}`
	)
}

export default async function updateStatisticsJob(container: MedusaContainer) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	try {
		const now = new Date()
		const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
		await computeStatsForDay(container, yesterday)
	} catch (error: any) {
		logger.error(`statistics: failed to update stats: ${error.message}`)
	}
}

export const config = {
	name: 'update-statistics',
	schedule: '0 1 * * *'
}
