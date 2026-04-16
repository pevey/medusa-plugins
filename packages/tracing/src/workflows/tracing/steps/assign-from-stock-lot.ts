// find stock lot and assign
// create serial number
// return data for fulfillment creation step to create fulfillment with serial number and lot info

import {
	createStep,
	StepResponse,
	createWorkflow,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { TRACING_MODULE } from '../../../modules/tracing'
import { TracingService } from '../../../modules/tracing/service'
import { Modules } from '@medusajs/framework/utils'

type AssignFromStockLotStepInput = {
	order_id: string
}

// change to use fulfillment data input, not order id
const assignFromStockLotStep = createStep(
	'assign-from-stock-lot',
	async ({ order_id }: AssignFromStockLotStepInput, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		const inventoryModuleService = container.resolve(Modules.INVENTORY)

		const query = container.resolve('query')
		const { data: orders } = await query.graph({
			entity: 'order',
			fields: [
				'id',
				'items.*',
				'items.variant.*',
				'items.variant.inventory.*',
				'items.variant.inventory.location_levels.*'
			],
			filters: { id: order_id }
		})
		const order = orders[0]

		if (order.items && order.items.length > 0) {
			for (const item of order.items) {
				if (!item?.variant || !item?.variant.inventory) continue
				for (const inv of item.variant?.inventory ?? []) {
					if (!inv?.id) continue
					for (const locLevel of inv?.location_levels ?? []) {
						if (!locLevel?.location_id) continue
						// Find the first available lot for this inventory item + location
						const lot = await tracingService.findFirstAvailable(inv.id, locLevel.location_id)
						if (!lot) continue
						// Adjust the lot's reserved quantity
						await tracingService.adjustLotQuantity(lot.id, -item.quantity)
					}
				}
			}
		}

		return new StepResponse({ order_id })
	}
)
