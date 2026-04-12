import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { VeeqoService } from '../../modules/veeqo/service'
import {
	ShippingOptionForVeeqoDeliveryMethodInput,
	VeeqoDeliveryMethodDTO,
	VeeqoDeliveryMethodInput
} from '../../modules/veeqo/types'

const mapShippingOptionToVeeqoDeliveryMethodInput = (
	shipping_option: ShippingOptionForVeeqoDeliveryMethodInput
): VeeqoDeliveryMethodInput => {
	const requiredFields = {
		name: shipping_option.name?.replace(/[^a-zA-Z0-9 ]/g, ''),
		cost: shipping_option.prices?.[0]?.amount
	}
	const missingFields = Object.entries(requiredFields)
		.filter(([, value]) => value === undefined || value === null)
		.map(([field]) => field)
	if (missingFields.length) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Shipping option ${shipping_option.id} is missing required fields for Veeqo delivery method input: ${missingFields.join(', ')}`
		)
	}
	return {
		name: requiredFields.name!,
		cost: requiredFields.cost!
	}
}

export const getShippingOptionDetailsStep = createStep(
	'get-shipping-option-details-step',
	async (shipping_option_id: string, { container }) => {
		const query = container.resolve('query')
		const { data: shipping_options } = await query.graph({
			entity: 'shipping_option',
			fields: ['id', 'name', 'prices.amount', 'veeqo_delivery_method.veeqo_delivery_method_id'],
			filters: { id: shipping_option_id }
		})
		const shipping_option = shipping_options[0] as
			| ShippingOptionForVeeqoDeliveryMethodInput
			| undefined
		if (!shipping_option) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Shipping option with id ${shipping_option_id} not found`
			)
		}
		return new StepResponse(shipping_option)
	}
)

// GET --------------------------------------------------------------

export const fetchDeliveryMethodFromVeeqoStep = createStep(
	'fetch-delivery-method-from-veeqo-step',
	async (shipping_option_id: string, { container }) => {
		const query = container.resolve('query')
		const {
			data: [veeqo_delivery_method]
		} = await query.graph({
			entity: 'veeqo_delivery_method',
			fields: ['veeqo_delivery_method_id'],
			filters: { shipping_option_id }
		})
		const veeqoDeliveryMethodId = veeqo_delivery_method?.veeqo_delivery_method_id
		if (!veeqoDeliveryMethodId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo delivery method found for shipping option ${shipping_option_id}`
			)
		}
		const veeqoService = container.resolve('veeqo') as VeeqoService
		const veeqoDeliveryMethod = (await veeqoService.fetchDeliveryMethod(
			veeqoDeliveryMethodId
		)) as VeeqoDeliveryMethodDTO
		return new StepResponse(veeqoDeliveryMethod)
	}
)

export const getVeeqoDeliveryMethodWorkflow = createWorkflow(
	'get-veeqo-delivery-method-workflow',
	(shipping_option_id: string) => {
		const veeqoDeliveryMethod = fetchDeliveryMethodFromVeeqoStep(shipping_option_id)
		return new WorkflowResponse(veeqoDeliveryMethod)
	}
)

// ADD --------------------------------------------------------------

export const addDeliveryMethodToVeeqoStep = createStep(
	'add-delivery-method-to-veeqo-step',
	async (shipping_option: ShippingOptionForVeeqoDeliveryMethodInput, { container }) => {
		if (shipping_option.veeqo_delivery_method?.veeqo_delivery_method_id) {
			return new StepResponse(void 0)
		}
		const veeqoDeliveryMethodInput = mapShippingOptionToVeeqoDeliveryMethodInput(shipping_option)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoDeliveryMethod = await veeqoService.addDeliveryMethod(
			shipping_option.id,
			veeqoDeliveryMethodInput
		)
		return new StepResponse(veeqoDeliveryMethod)
	}
)

export const addDeliveryMethodToVeeqoWorkflow = createWorkflow(
	'add-delivery-method-to-veeqo-workflow',
	(shipping_option_id: string) => {
		const shippingOption = getShippingOptionDetailsStep(shipping_option_id)
		const veeqoDeliveryMethod = addDeliveryMethodToVeeqoStep(shippingOption)
		return new WorkflowResponse(veeqoDeliveryMethod)
	}
)

// UPDATE -----------------------------------------------------------

export const updateDeliveryMethodInVeeqoStep = createStep(
	'update-delivery-method-in-veeqo-step',
	async (shipping_option: ShippingOptionForVeeqoDeliveryMethodInput, { container }) => {
		const veeqoDeliveryMethodId = shipping_option.veeqo_delivery_method?.veeqo_delivery_method_id
		if (!veeqoDeliveryMethodId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo delivery method found for shipping option ${shipping_option.id}`
			)
		}
		const veeqoDeliveryMethodInput = mapShippingOptionToVeeqoDeliveryMethodInput(shipping_option)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoDeliveryMethod = await veeqoService.updateDeliveryMethod(
			veeqoDeliveryMethodId,
			veeqoDeliveryMethodInput
		)
		return new StepResponse(veeqoDeliveryMethod)
	}
)

export const updateDeliveryMethodInVeeqoWorkflow = createWorkflow(
	'update-delivery-method-in-veeqo-workflow',
	(shipping_option_id: string) => {
		const shippingOption = getShippingOptionDetailsStep(shipping_option_id)
		const veeqoDeliveryMethod = updateDeliveryMethodInVeeqoStep(shippingOption)
		return new WorkflowResponse(veeqoDeliveryMethod)
	}
)

// SYNC -------------------------------------------------------------

export const addOrUpdateDeliveryMethodInVeeqoStep = createStep(
	'add-or-update-delivery-method-in-veeqo-step',
	async (shipping_option: ShippingOptionForVeeqoDeliveryMethodInput, { container }) => {
		const veeqoDeliveryMethodId = shipping_option.veeqo_delivery_method?.veeqo_delivery_method_id
		const veeqoService: VeeqoService = container.resolve('veeqo')
		if (!veeqoDeliveryMethodId) {
			const veeqoDeliveryMethodInput =
				mapShippingOptionToVeeqoDeliveryMethodInput(shipping_option)
			const veeqoDeliveryMethod = await veeqoService.addDeliveryMethod(
				shipping_option.id,
				veeqoDeliveryMethodInput
			)
			return new StepResponse(veeqoDeliveryMethod)
		} else {
			const veeqoDeliveryMethodInput =
				mapShippingOptionToVeeqoDeliveryMethodInput(shipping_option)
			const veeqoDeliveryMethod = await veeqoService.updateDeliveryMethod(
				veeqoDeliveryMethodId,
				veeqoDeliveryMethodInput
			)
			return new StepResponse(veeqoDeliveryMethod)
		}
	}
)

export const syncDeliveryMethodToVeeqoWorkflow = createWorkflow(
	'sync-delivery-method-to-veeqo-workflow',
	(shipping_option_id: string) => {
		const shippingOption = getShippingOptionDetailsStep(shipping_option_id)
		const veeqoDeliveryMethod = addOrUpdateDeliveryMethodInVeeqoStep(shippingOption)
		return new WorkflowResponse(veeqoDeliveryMethod)
	}
)

// DELETE -----------------------------------------------------------

export const findAndDeleteDeliveryMethodFromVeeqoStep = createStep(
	'find-and-delete-delivery-method-from-veeqo-step',
	async (shipping_option_id: string, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		await veeqoService.deleteDeliveryMethod(shipping_option_id)
		return new StepResponse(void 0)
	}
)

export const deleteDeliveryMethodFromVeeqoWorkflow = createWorkflow(
	'delete-delivery-method-from-veeqo-workflow',
	(shipping_option_id: string) => {
		const result = findAndDeleteDeliveryMethodFromVeeqoStep(shipping_option_id)
		return new WorkflowResponse(result)
	}
)
