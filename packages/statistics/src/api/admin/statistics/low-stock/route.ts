import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetLowStockType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetLowStockType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
	const { threshold } = req.validatedQuery as AdminGetLowStockType

	try {
		// Get all stock locations
		const { data: locations } = await query.graph({
			entity: 'stock_location',
			fields: ['id', 'name']
		})
		const locationMap = new Map((locations as any[]).map(l => [l.id, l.name]))

		// Get all inventory items with location levels
		const { data: items } = await query.graph({
			entity: 'inventory_item',
			fields: [
				'id', 'sku', 'title',
				'location_levels.id',
				'location_levels.stocked_quantity',
				'location_levels.location_id'
			],
			pagination: { take: 200 }
		})

		type Warning = {
			inventory_item_id: string
			sku: string | null
			title: string | null
			location_name: string
			location_id: string
			reason: 'no_lots' | 'low_stock'
			available_quantity: number
		}

		const warnings: Warning[] = []

		for (const item of items as any[]) {
			for (const level of item.location_levels ?? []) {
				const locationId = level.location_id
				if (!locationId) continue

				const locationName = locationMap.get(locationId) ?? 'Unknown'

				// Query stock lots for this item at this location
				const { data: lots } = await query.graph({
					entity: 'stock_lot',
					fields: ['id', 'stocked_quantity', 'enabled'],
					filters: {
						inventory_item_id: item.id,
						stock_location_id: locationId
					}
				})

				const enabledLots = (lots as any[]).filter(l => l.enabled)

				if (enabledLots.length === 0) {
					warnings.push({
						inventory_item_id: item.id,
						sku: item.sku,
						title: item.title,
						location_name: locationName,
						location_id: locationId,
						reason: 'no_lots',
						available_quantity: 0
					})
				} else {
					const totalAvailable = enabledLots.reduce((sum: number, l: any) => sum + (l.stocked_quantity ?? 0), 0)
					if (totalAvailable < threshold) {
						warnings.push({
							inventory_item_id: item.id,
							sku: item.sku,
							title: item.title,
							location_name: locationName,
							location_id: locationId,
							reason: 'low_stock',
							available_quantity: totalAvailable
						})
					}
				}
			}
		}

		// Sort: no_lots first, then by available_quantity ascending
		warnings.sort((a, b) => {
			if (a.reason !== b.reason) return a.reason === 'no_lots' ? -1 : 1
			return a.available_quantity - b.available_quantity
		})

		res.json({ warnings })
	} catch (err: any) {
		logger.error(`low-stock error: ${err.message}`)
		res.status(500).json({ error: err.message })
	}
}
