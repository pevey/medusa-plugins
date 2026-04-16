import { MedusaService } from '@medusajs/framework/utils'
import { InferTypeOf, Logger } from '@medusajs/framework/types'
import { StockLot } from './models/stock-lot'
import { SerialNumber } from './models/serial-number'
import { InvalidationReason } from './models/invalidation-reason'

type StockLotType = InferTypeOf<typeof StockLot>

export class TracingService extends MedusaService({
	StockLot,
	SerialNumber,
	InvalidationReason
}) {
	protected logger_: Logger

	constructor(container: { logger: Logger }, _options?: any) {
		super(...arguments)
		this.logger_ = container.logger
	}

	/**
	 * Finds the first available lot for a given inventory item and location.
	 * "Available" means stocked_quantity > reserved_quantity.
	 * Ordered by expiry_date ascending (FIFO/FEFO logic).
	 */
	async findFirstAvailable(
		inventoryItemId: string,
		stockLocationId: string
	): Promise<StockLotType | null> {
		const [lots] = await this.listAndCountStockLots(
			{
				inventory_item_id: inventoryItemId,
				stock_location_id: stockLocationId
			},
			{
				order: { created_at: 'ASC' }
			}
		)

		// Return the first lot where available quantity > 0
		const availableLot = lots.find(lot => lot.stocked_quantity > 0)

		return availableLot ?? null
	}

	/**
	 * Adjusts the stocked_quantity of a lot by the given adjustment value.
	 * Pass a negative value to subtract (e.g., on fulfillment).
	 * Pass a positive value to add (e.g., on receiving new stock).
	 */
	async adjustLotQuantity(lotId: string, adjustment: number): Promise<StockLotType> {
		const [lot] = await this.listStockLots({ id: lotId })

		if (!lot) {
			throw new Error(`StockLot with id ${lotId} not found`)
		}

		const updatedLot = await this.updateStockLots({
			id: lotId,
			stocked_quantity: lot.stocked_quantity + adjustment
		})
		this.logger_.info(
			`Adjusted lot ${lotId} quantity by ${adjustment}. New stocked quantity: ${(updatedLot as any).stocked_quantity}`
		)
		return updatedLot as StockLotType
	}
}
