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
import { AdminUpdateStockLotType } from '../../api/validators'

const calculateAdjustmentStep = createStep(
	'calculate-adjustment',
	async (input: AdminUpdateStockLotType & { id: string }, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		const currentStockLot = await tracingService.retrieveStockLot(input.id)
		let adjustment: number = 0
		if (input.enabled !== undefined && input.enabled !== currentStockLot.enabled) {
			adjustment += input.enabled
				? currentStockLot.stocked_quantity
				: -currentStockLot.stocked_quantity
		} else if (
			input.stocked_quantity !== undefined &&
			input.stocked_quantity !== currentStockLot.stocked_quantity
		) {
			adjustment = input.stocked_quantity - currentStockLot.stocked_quantity
		}
		return new StepResponse(adjustment)
	}
)

const updateStockLotStep = createStep(
	'update-stock-lot',
	async (input: AdminUpdateStockLotType & { id: string }, { container }) => {
		const tracingService: TracingService = container.resolve(TRACING_MODULE)
		const stockLot = await tracingService.updateStockLots(input)
		return new StepResponse(stockLot, stockLot.id)
	}
)

export const updateStockLotWorkflow = createWorkflow(
	'update-stock-lot',
	(input: AdminUpdateStockLotType & { id: string }) => {
		const adjustment = calculateAdjustmentStep(input)
		const stockLot = updateStockLotStep(input)
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
