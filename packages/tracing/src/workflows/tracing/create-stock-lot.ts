import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse,
	transform
} from '@medusajs/framework/workflows-sdk'
import { adjustInventoryLevelsStep } from '@medusajs/medusa/core-flows'
import { TRACING_MODULE } from '../../modules/tracing'
import { TracingService } from '../../modules/tracing/service'
import { AdminCreateStockLotType } from '../../api/validators'

const createStockLotStep = createStep(
	'create-stock-lot',
	async (input: AdminCreateStockLotType, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		const stockLot = await tracingService.createStockLots(input)
		return new StepResponse(stockLot, stockLot.id)
	},
	// Compensation: delete the lot if a later step fails
	async (stockLotId: string | undefined, { container }) => {
		if (!stockLotId) return
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		await tracingService.deleteStockLots([stockLotId])
	}
)

export const createStockLotWorkflow = createWorkflow(
	'create-stock-lot',
	(input: AdminCreateStockLotType) => {
		const stockLot = createStockLotStep(input)

		const adjustmentInput = transform({ input }, data => {
			const adjustment = Math.max(
				data.input.stocked_quantity || 0,
				data.input.initial_quantity || 0
			)
			return [
				{
					inventory_item_id: data.input.inventory_item_id,
					location_id: data.input.stock_location_id,
					adjustment: adjustment
				}
			]
		})
		adjustInventoryLevelsStep(adjustmentInput)

		return new WorkflowResponse(stockLot)
	}
)
