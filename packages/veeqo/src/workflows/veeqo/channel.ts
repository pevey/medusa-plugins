import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { VeeqoService } from '../../modules/veeqo/service'
import {
	SalesChannelForVeeqoChannelInput,
	VeeqoChannelDTO,
	VeeqoChannelInput
} from '../../modules/veeqo/types'

const mapSalesChannelToVeeqoChannelInput = (
	sales_channel: SalesChannelForVeeqoChannelInput
): VeeqoChannelInput => {
	if (sales_channel.name === undefined || sales_channel.name === null) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Sales channel ${sales_channel.id} is missing required field for Veeqo channel input: name`
		)
	}
	return {
		name: sales_channel.name?.replace(/[^a-zA-Z0-9 ]/g, ''), // veeqo api rejects if name has special characters
		type_code: 'direct',
		...(sales_channel.default_warehouse_id && {
			default_warehouse_id: sales_channel.default_warehouse_id
		})
	}
}

export const getSalesChannelDetailsStep = createStep(
	'get-sales-channel-details-step',
	async (sales_channel_id: string, { container }) => {
		const query = container.resolve('query')
		const { data: sales_channels } = await query.graph({
			entity: 'sales_channel',
			fields: ['id', 'name', 'type_code', 'veeqo_channel.veeqo_channel_id'],
			filters: { id: sales_channel_id }
		})
		// get linked stock location ids for sales channel
		const { data: links } = await query.graph({
			entity: 'sales_channel_location',
			fields: ['stock_location_id'],
			filters: { sales_channel_id }
		})
		// get veeqo warehouse id for first linked stock location, if exists
		let defaultVeeqoWarehouseId: number | undefined
		if (links.length > 0) {
			const stock_location_id = links[0].stock_location_id
			const { data: stockLocations } = await query.graph({
				entity: 'stock_location',
				fields: ['id', 'veeqo_warehouse.veeqo_warehouse_id'],
				filters: { id: stock_location_id }
			})
			defaultVeeqoWarehouseId = stockLocations[0]?.veeqo_warehouse?.veeqo_warehouse_id
		}
		const sales_channel = {
			...sales_channels[0],
			...(defaultVeeqoWarehouseId !== undefined && {
				default_warehouse_id: defaultVeeqoWarehouseId
			})
		} as SalesChannelForVeeqoChannelInput
		if (!sales_channel) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Sales channel with id ${sales_channel_id} not found`
			)
		}
		return new StepResponse(sales_channel)
	}
)

// GET --------------------------------------------------------------

export const fetchChannelFromVeeqoStep = createStep(
	'fetch-channel-from-veeqo-step',
	async (sales_channel_id: string, { container }) => {
		const query = container.resolve('query')
		const {
			data: [veeqo_channel]
		} = await query.graph({
			entity: 'veeqo_channel',
			fields: ['veeqo_channel_id'],
			filters: { sales_channel_id }
		})
		const veeqoChannelId = veeqo_channel?.veeqo_channel_id
		if (!veeqoChannelId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo channel found for sales channel ${sales_channel_id}`
			)
		}
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoChannel = (await veeqoService.fetchChannel(veeqoChannelId)) as VeeqoChannelDTO
		return new StepResponse(veeqoChannel)
	}
)

export const getVeeqoChannelWorkflow = createWorkflow(
	'get-veeqo-channel-workflow',
	(sales_channel_id: string) => {
		const veeqoChannel = fetchChannelFromVeeqoStep(sales_channel_id)
		return new WorkflowResponse(veeqoChannel)
	}
)

// ADD -----------------------------------------------------------

export const addChannelToVeeqoStep = createStep(
	'add-channel-to-veeqo-step',
	async (sales_channel: SalesChannelForVeeqoChannelInput, { container }) => {
		if (sales_channel.veeqo_channel?.veeqo_channel_id) {
			return new StepResponse(void 0)
		}
		const veeqoChannelInput = mapSalesChannelToVeeqoChannelInput(sales_channel)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoChannel = await veeqoService.addChannel(sales_channel.id, veeqoChannelInput)
		if (!veeqoChannel) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Unable to create channel in Veeqo for sales channel ${sales_channel.id}`
			)
		}
		return new StepResponse(veeqoChannel)
	}
)

export const addSalesChannelToVeeqoWorkflow = createWorkflow(
	'add-sales-channel-to-veeqo-workflow',
	(sales_channel: SalesChannelForVeeqoChannelInput) => {
		addChannelToVeeqoStep(sales_channel)
		return new WorkflowResponse(void 0)
	}
)

// UPDATE -----------------------------------------------------------

export const updateChannelInVeeqoStep = createStep(
	'update-channel-in-veeqo-step',
	async (sales_channel: SalesChannelForVeeqoChannelInput, { container }) => {
		if (!sales_channel.veeqo_channel?.veeqo_channel_id) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo channel found for sales channel ${sales_channel.id}`
			)
		}
		const veeqoChannelInput = mapSalesChannelToVeeqoChannelInput(sales_channel)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoChannel = await veeqoService.updateChannel(
			sales_channel.veeqo_channel.veeqo_channel_id,
			veeqoChannelInput
		)
		if (!veeqoChannel) {
			throw new MedusaError(
				MedusaError.Types.UNEXPECTED_STATE,
				`Unable to update channel in Veeqo for sales channel ${sales_channel.id}`
			)
		}
		return new StepResponse(veeqoChannel)
	}
)

export const updateSalesChannelInVeeqoWorkflow = createWorkflow(
	'update-sales-channel-in-veeqo-workflow',
	(sales_channel: SalesChannelForVeeqoChannelInput) => {
		const veeqoChannel = updateChannelInVeeqoStep(sales_channel)
		return new WorkflowResponse(veeqoChannel)
	}
)

// SYNC -------------------------------------------------------------

export const addOrUpdateChannelInVeeqoStep = createStep(
	'add-or-update-channel-in-veeqo-step',
	async (sales_channel: SalesChannelForVeeqoChannelInput, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoChannelId = sales_channel.veeqo_channel?.veeqo_channel_id
		if (!veeqoChannelId) {
			const veeqoChannelInput = mapSalesChannelToVeeqoChannelInput(sales_channel)
			const veeqoChannel = await veeqoService.addChannel(sales_channel.id, veeqoChannelInput)
			return new StepResponse(veeqoChannel)
		} else {
			const veeqoChannelInput = mapSalesChannelToVeeqoChannelInput(sales_channel)
			const veeqoChannel = await veeqoService.updateChannel(veeqoChannelId, veeqoChannelInput)
			return new StepResponse(veeqoChannel)
		}
	}
)

export const syncChannelToVeeqoWorkflow = createWorkflow(
	'sync-channel-in-veeqo-workflow',
	(sales_channel_id: string) => {
		const salesChannel = getSalesChannelDetailsStep(sales_channel_id)
		const veeqoChannel = addOrUpdateChannelInVeeqoStep(salesChannel)
		return new WorkflowResponse(veeqoChannel)
	}
)

// DELETE -----------------------------------------------------------

export const findAndDeleteChannelInVeeqoStep = createStep(
	'find-and-delete-channel-in-veeqo-step',
	async (sales_channel_id: string, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		await veeqoService.deleteChannel(sales_channel_id)
		return new StepResponse(void 0)
	}
)

export const deleteChannelInVeeqoWorkflow = createWorkflow(
	'delete-channel-in-veeqo-workflow',
	(sales_channel_id: string) => {
		const result = findAndDeleteChannelInVeeqoStep(sales_channel_id)
		return new WorkflowResponse(result)
	}
)
