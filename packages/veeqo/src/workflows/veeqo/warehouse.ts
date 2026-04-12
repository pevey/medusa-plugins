import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { VeeqoService } from '../../modules/veeqo/service'
import {
	StockLocationForVeeqoWarehouseInput,
	VeeqoWarehouseDTO,
	VeeqoWarehouseInput
} from '../../modules/veeqo/types'

const mapStockLocationToVeeqoWarehouseInput = (
	stock_location: StockLocationForVeeqoWarehouseInput
): VeeqoWarehouseInput => {
	const requiredFields = {
		name: stock_location.name,
		address_line_1: stock_location.address?.address_1,
		city: stock_location.address?.city,
		state: stock_location.address?.province?.toUpperCase(),
		country: stock_location.address?.country_code?.toUpperCase(),
		post_code: stock_location.address?.postal_code?.toUpperCase()
	}
	const missingFields = Object.entries(requiredFields)
		.filter(([, value]) => value === undefined || value === null)
		.map(([field]) => field)
	if (missingFields.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Stock location ${stock_location.id} is missing required fields for Veeqo warehouse input: ${missingFields.join(', ')}`
		)
	}
	return {
		name: requiredFields.name,
		address_line_1: requiredFields.address_line_1!,
		city: requiredFields.city!,
		region: requiredFields.state!,
		country: requiredFields.country!,
		post_code: requiredFields.post_code!
	}
}

export const getStockLocationDetailsStep = createStep(
	'get-stock-location-details-step',
	async (stock_location_id: string, { container }) => {
		const query = container.resolve('query')
		const { data: stock_locations } = await query.graph({
			entity: 'stock_location',
			fields: [
				'id',
				'name',
				'address.address_1',
				'address.city',
				'address.province',
				'address.country_code',
				'address.postal_code',
				'veeqo_warehouse.veeqo_warehouse_id'
			],
			filters: { id: stock_location_id }
		})
		const stockLocation = stock_locations[0] as StockLocationForVeeqoWarehouseInput | undefined
		if (!stockLocation) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Stock location with id ${stock_location_id} not found`
			)
		}
		return new StepResponse(stockLocation)
	}
)

// GET --------------------------------------------------------------

export const fetchWarehouseFromVeeqoStep = createStep(
	'fetch-warehouse-from-veeqo-step',
	async (stock_location_id: string, { container }) => {
		const query = container.resolve('query')
		const {
			data: [veeqo_warehouse]
		} = await query.graph({
			entity: 'veeqo_warehouse',
			fields: ['veeqo_warehouse_id'],
			filters: { stock_location_id }
		})
		const veeqoWarehouseId = veeqo_warehouse?.veeqo_warehouse_id
		if (!veeqoWarehouseId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo warehouse found for stock location ${stock_location_id}`
			)
		}
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqo = (await veeqoService.fetchWarehouse(veeqoWarehouseId)) as VeeqoWarehouseDTO
		return new StepResponse({ veeqo_warehouse: veeqo })
	}
)

export const getVeeqoWarehouseWorkflow = createWorkflow(
	'get-veeqo-warehouse-workflow',
	(stock_location_id: string) => {
		const result = fetchWarehouseFromVeeqoStep(stock_location_id)
		return new WorkflowResponse(result)
	}
)

// ADD --------------------------------------------------------------

export const addWarehouseToVeeqoStep = createStep(
	'add-warehouse-to-veeqo-step',
	async (stock_location: StockLocationForVeeqoWarehouseInput, { container }) => {
		if (stock_location.veeqo_warehouse?.veeqo_warehouse_id) {
			return new StepResponse(void 0)
		}
		const veeqoWarehouseInput = mapStockLocationToVeeqoWarehouseInput(stock_location)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoWarehouse = await veeqoService.addWarehouse(stock_location.id, veeqoWarehouseInput)
		return new StepResponse(veeqoWarehouse)
	}
)

export const addWarehouseToVeeqoWorkflow = createWorkflow(
	'add-warehouse-to-veeqo-workflow',
	(stock_location_id: string) => {
		const stockLocation = getStockLocationDetailsStep(stock_location_id)
		const veeqoWarehouse = addWarehouseToVeeqoStep(stockLocation)
		return new WorkflowResponse(veeqoWarehouse)
	}
)

// UPDATE --------------------------------------------------------------

export const updateWarehouseInVeeqoStep = createStep(
	'update-warehouse-in-veeqo-step',
	async (stock_location: StockLocationForVeeqoWarehouseInput, { container }) => {
		const veeqoWarehouseId = stock_location.veeqo_warehouse?.veeqo_warehouse_id
		if (!veeqoWarehouseId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo warehouse found for stock location ${stock_location.id}`
			)
		}
		const veeqoWarehouseInput = mapStockLocationToVeeqoWarehouseInput(stock_location)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoWarehouse = await veeqoService.updateWarehouse(
			veeqoWarehouseId,
			veeqoWarehouseInput
		)
		return new StepResponse(veeqoWarehouse)
	}
)

export const updateWarehouseInVeeqoWorkflow = createWorkflow(
	'update-warehouse-in-veeqo-workflow',
	(stock_location_id: string) => {
		const stockLocation = getStockLocationDetailsStep(stock_location_id)
		const veeqoWarehouse = updateWarehouseInVeeqoStep(stockLocation)
		return new WorkflowResponse(veeqoWarehouse)
	}
)

// SYNC --------------------------------------------------------------

export const addOrUpdateWarehouseInVeeqoStep = createStep(
	'add-or-update-warehouse-in-veeqo-step',
	async (stock_location: StockLocationForVeeqoWarehouseInput, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoWarehouseId = stock_location.veeqo_warehouse?.veeqo_warehouse_id
		if (!veeqoWarehouseId) {
			const veeqoWarehouseInput = mapStockLocationToVeeqoWarehouseInput(stock_location)
			const veeqoWarehouse = await veeqoService.addWarehouse(
				stock_location.id,
				veeqoWarehouseInput
			)
			return new StepResponse(veeqoWarehouse)
		} else {
			const veeqoWarehouseInput = mapStockLocationToVeeqoWarehouseInput(stock_location)
			const veeqoWarehouse = await veeqoService.updateWarehouse(
				veeqoWarehouseId,
				veeqoWarehouseInput
			)
			return new StepResponse(veeqoWarehouse)
		}
	}
)

export const syncWarehouseToVeeqoWorkflow = createWorkflow(
	'sync-warehouse-to-veeqo-workflow',
	(stock_location_id: string) => {
		const stockLocation = getStockLocationDetailsStep(stock_location_id)
		const veeqoWarehouse = addOrUpdateWarehouseInVeeqoStep(stockLocation)
		return new WorkflowResponse(veeqoWarehouse)
	}
)

// DELETE --------------------------------------------------------------

export const findAndDeleteWarehouseFromVeeqoStep = createStep(
	'find-and-delete-warehouse-from-veeqo-step',
	async (stock_location_id: string, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		await veeqoService.deleteWarehouse(stock_location_id)
		return new StepResponse(void 0)
	}
)

export const deleteWarehouseFromVeeqoWorkflow = createWorkflow(
	'delete-warehouse-from-veeqo-workflow',
	(stock_location_id: string) => {
		const result = findAndDeleteWarehouseFromVeeqoStep(stock_location_id)
		return new WorkflowResponse(result)
	}
)
