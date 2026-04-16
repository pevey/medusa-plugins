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

const calculateAdjustmentStep = createStep(
	'calculate-adjustment',
	async (input: { id: string }, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		const currentStockLot = await tracingService.retrieveStockLot(input.id)
		return new StepResponse(currentStockLot.stocked_quantity)
	}
)

const deleteStockLotStep = createStep(
	'delete-stock-lot',
	async (input: { id: string }, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		const stockLot = await tracingService.retrieveStockLot(input.id)
		if (!stockLot) {
			throw new Error(`Stock lot with id ${input.id} not found`)
		}
		await tracingService.deleteStockLots([input.id])
		return new StepResponse(stockLot)
	}
)

export const deleteStockLotWorkflow = createWorkflow(
	'delete-stock-lot',
	(input: { id: string }) => {
		const adjustment = calculateAdjustmentStep(input)
		const stockLot = deleteStockLotStep(input)
		if (adjustment !== 0) {
			const adjustmentInput = transform({ adjustment, stockLot }, input => [
				{
					inventory_item_id: input.stockLot.inventory_item_id,
					location_id: input.stockLot.stock_location_id,
					adjustment: input.adjustment
				}
			])
			adjustInventoryLevelsStep(adjustmentInput)
		}
		return new WorkflowResponse(stockLot)
	}
)
