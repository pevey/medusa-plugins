import {
	createStep,
	StepResponse,
	createWorkflow,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { TRACING_MODULE } from '../../modules/tracing'
import { TracingService } from '../../modules/tracing/service'

type AdjustStockLotStepInput = {
	order_id: string
}

const adjustStockLotStep = createStep(
	'adjust-stock-lot',
	async ({ order_id }: AdjustStockLotStepInput, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)

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

type AdjustStockOrderWorkflowInput = {
	order_id: string
}

export const adjustStockOrderWorkflow = createWorkflow(
	'adjust-stock-order',
	({ order_id }: AdjustStockOrderWorkflowInput) => {
		const result = adjustStockLotStep({ order_id })
		return new WorkflowResponse(result)
	}
)
