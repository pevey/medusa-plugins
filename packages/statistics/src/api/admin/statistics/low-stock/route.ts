import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetLowStockType } from '../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetLowStockType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
	const { threshold } = req.validatedQuery as AdminGetLowStockType

	// `stock_lot` is a model owned entirely by the separate `medusa-plugin-tracing`
	// package (`src/modules/tracing/models/stock-lot.ts`). This plugin deliberately
	// does NOT declare a dependency on it -- a statistics dashboard must not
	// hard-require an unrelated inventory-tracing plugin -- so `stock_lot` may or
	// may not be queryable depending on what the installer has registered.
	//
	// Detection approach chosen: registration-check, not try/catch-as-control-flow.
	// Medusa registers every loaded module into the container under its module
	// *definition key* (see `@medusajs/framework`'s `medusa-app-loader.js`:
	// `container.register(loadedModule.__definition.key, asValue(moduleService))`).
	// `stock_lot` only becomes a valid `query.graph()` entity alias once the
	// tracing module's joiner config has been folded into the Query module, which
	// only happens when the tracing module itself is loaded and registered. So
	// checking `req.scope.hasRegistration('tracing')` -- tracing's own module key
	// (`TRACING_MODULE` in that package) -- is a reliable, throw-free proxy for
	// "is `stock_lot` queryable", without importing anything from
	// medusa-plugin-tracing (which would reintroduce the dependency we're avoiding).
	// The literal 'tracing' is intentionally hardcoded for that reason. Note this is
	// a soft/duck-typed integration point: if medusa-plugin-tracing ever renames its
	// module key, this check fails CLOSED (treats lots as unavailable) rather than
	// crashing -- the safe direction for a best-effort enrichment feature.
	//
	// Belt-and-suspenders: the actual `stock_lot` query below is still wrapped in
	// its own narrowly-scoped try/catch (never the whole handler) so that even if
	// the registration check is ever wrong, or the query fails for some unrelated
	// reason, a single item/location falls back to "no lot data" instead of 500ing
	// the whole request.
	let lotDataAvailable = req.scope.hasRegistration('tracing')

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
			fields: ['id', 'sku', 'title', 'location_levels.id', 'location_levels.stocked_quantity', 'location_levels.location_id'],
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

		// Fallback used whenever lot-level detail isn't available (either because
		// the tracing module isn't registered at all, or because a per-item
		// `stock_lot` query unexpectedly failed): treat the inventory item's own
		// `location_levels.stocked_quantity` as the available quantity. We cannot
		// tell "zero enabled lots" from "some lots" without lot data, so this path
		// only ever emits `reason: 'low_stock'`, never `'no_lots'`.
		const pushInventoryLevelWarning = (item: any, locationId: string, locationName: string, stockedQuantity: number) => {
			if (stockedQuantity < threshold) {
				warnings.push({
					inventory_item_id: item.id,
					sku: item.sku,
					title: item.title,
					location_name: locationName,
					location_id: locationId,
					reason: 'low_stock',
					available_quantity: stockedQuantity
				})
			}
		}

		for (const item of items as any[]) {
			for (const level of item.location_levels ?? []) {
				const locationId = level.location_id
				if (!locationId) continue

				const locationName = locationMap.get(locationId) ?? 'Unknown'
				const rawStockedQuantity = level.stocked_quantity ?? 0

				if (!lotDataAvailable) {
					pushInventoryLevelWarning(item, locationId, locationName, rawStockedQuantity)
					continue
				}

				// Query stock lots for this item at this location. See the
				// belt-and-suspenders note above the `lotDataAvailable` check --
				// this try/catch is scoped to ONLY this query, never the handler.
				let lots: any[]
				try {
					const result = await query.graph({
						entity: 'stock_lot',
						fields: ['id', 'stocked_quantity', 'enabled'],
						filters: {
							inventory_item_id: item.id,
							stock_location_id: locationId
						}
					})
					lots = result.data as any[]
				} catch (lotErr: any) {
					logger.warn(
						`low-stock: stock_lot query failed despite tracing module being registered, falling back to inventory-level quantity: ${lotErr.message}`
					)
					// A failure here means lot-level enrichment isn't actually usable
					// for this request, even though the registration check passed --
					// reflect that in the top-level flag too.
					lotDataAvailable = false
					pushInventoryLevelWarning(item, locationId, locationName, rawStockedQuantity)
					continue
				}

				const enabledLots = lots.filter(l => l.enabled)

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

		res.json({ warnings, lot_data_available: lotDataAvailable })
	} catch (err: any) {
		logger.error(`low-stock error: ${err.message}`)
		res.status(500).json({ error: err.message })
	}
}
