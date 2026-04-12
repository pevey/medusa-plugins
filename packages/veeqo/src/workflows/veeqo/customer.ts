import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { VeeqoService } from '../../modules/veeqo/service'
import {
	CustomerForVeeqoCustomerInput,
	VeeqoCustomerDTO,
	VeeqoCustomerInput
} from '../../modules/veeqo/types'

const mapCustomerToVeeqoCustomerInput = (
	customer: CustomerForVeeqoCustomerInput
): VeeqoCustomerInput => {
	if (customer.email === undefined || customer.email === null) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Customer ${customer.id} is missing required field for Veeqo customer input: email`
		)
	}
	return {
		email: customer.email,
		notes: customer.id, // store the Medusa customer ID in the notes field to link the records
		...(customer.phone !== undefined && customer.phone !== null ? { phone: customer.phone } : {})
	}
}

export const getCustomerDetailsStep = createStep(
	'get-customer-details-step',
	async (customer_id: string, { container }) => {
		const query = container.resolve('query')
		const { data: customers } = await query.graph({
			entity: 'customer',
			fields: ['id', 'email', 'phone', 'veeqo_customer.veeqo_customer_id'],
			filters: { id: customer_id }
		})
		const customer = customers[0] as CustomerForVeeqoCustomerInput | undefined
		if (!customer) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Customer with id ${customer_id} not found`
			)
		}
		return new StepResponse(customer)
	}
)

// GET --------------------------------------------------------------

export const fetchCustomerFromVeeqoStep = createStep(
	'fetch-customer-from-veeqo-step',
	async (customer_id: string, { container }) => {
		const query = container.resolve('query')
		const {
			data: [veeqo_customer]
		} = await query.graph({
			entity: 'veeqo_customer',
			fields: ['veeqo_customer_id'],
			filters: { customer_id }
		})
		const veeqoCustomerId = veeqo_customer?.veeqo_customer_id
		if (!veeqoCustomerId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo customer found for customer ${customer_id}`
			)
		}
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoCustomer = (await veeqoService.fetchCustomer(veeqoCustomerId)) as VeeqoCustomerDTO
		return new StepResponse(veeqoCustomer)
	}
)

export const getVeeqoCustomerWorkflow = createWorkflow(
	'get-veeqo-customer-workflow',
	(customer_id: string) => {
		const veeqoCustomer = fetchCustomerFromVeeqoStep(customer_id)
		return new WorkflowResponse(veeqoCustomer)
	}
)

// ADD -----------------------------------------------------------

export const addCustomerToVeeqoStep = createStep(
	'add-customer-to-veeqo-step',
	async (customer: CustomerForVeeqoCustomerInput, { container }) => {
		if (customer.veeqo_customer?.veeqo_customer_id) {
			return new StepResponse(void 0)
		}
		const veeqoCustomerInput = mapCustomerToVeeqoCustomerInput(customer)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoCustomer = await veeqoService.addCustomer(customer.id, veeqoCustomerInput)
		return new StepResponse(veeqoCustomer)
	}
)

export const addCustomerToVeeqoWorkflow = createWorkflow(
	'add-customer-to-veeqo-workflow',
	(customer_id: string) => {
		const customer = getCustomerDetailsStep(customer_id)
		const veeqoCustomer = addCustomerToVeeqoStep(customer)
		return new WorkflowResponse(veeqoCustomer)
	}
)

// UPDATE -----------------------------------------------------------

export const updateCustomerInVeeqoStep = createStep(
	'update-customer-in-veeqo-step',
	async (customer: CustomerForVeeqoCustomerInput, { container }) => {
		const veeqoCustomerId = customer.veeqo_customer?.veeqo_customer_id
		if (!veeqoCustomerId) {
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No linked Veeqo customer found for customer ${customer.id}`
			)
		}
		const veeqoCustomerInput = mapCustomerToVeeqoCustomerInput(customer)
		const veeqoService: VeeqoService = container.resolve('veeqo')
		const veeqoCustomer = await veeqoService.updateCustomer(veeqoCustomerId, veeqoCustomerInput)
		return new StepResponse(veeqoCustomer)
	}
)

export const updateCustomerInVeeqoWorkflow = createWorkflow(
	'update-customer-in-veeqo-workflow',
	(customer_id: string) => {
		const customer = getCustomerDetailsStep(customer_id)
		const veeqoCustomer = updateCustomerInVeeqoStep(customer)
		return new WorkflowResponse(veeqoCustomer)
	}
)

// SYNC -------------------------------------------------------------

export const addOrUpdateCustomerInVeeqoStep = createStep(
	'add-or-update-customer-in-veeqo-step',
	async (customer: CustomerForVeeqoCustomerInput, { container }) => {
		const veeqoService = container.resolve('veeqo')
		const veeqoCustomerId = customer.veeqo_customer?.veeqo_customer_id
		if (!veeqoCustomerId) {
			const veeqoCustomerInput = mapCustomerToVeeqoCustomerInput(customer)
			const veeqoService: VeeqoService = container.resolve('veeqo')
			const veeqoCustomer = await veeqoService.addCustomer(customer.id, veeqoCustomerInput)
			return new StepResponse(veeqoCustomer)
		} else {
			const veeqoCustomerInput = mapCustomerToVeeqoCustomerInput(customer)
			const veeqoService: VeeqoService = container.resolve('veeqo')
			const veeqoCustomer = await veeqoService.updateCustomer(
				veeqoCustomerId,
				veeqoCustomerInput
			)
			return new StepResponse(veeqoCustomer)
		}
	}
)

export const syncCustomerToVeeqoWorkflow = createWorkflow(
	'sync-customer-to-veeqo-workflow',
	(customer_id: string) => {
		const customer = getCustomerDetailsStep(customer_id)
		const veeqoCustomer = addOrUpdateCustomerInVeeqoStep(customer)
		return new WorkflowResponse(veeqoCustomer)
	}
)

// DELETE -----------------------------------------------------------

export const findAndDeleteCustomerFromVeeqoStep = createStep(
	'find-and-delete-customer-from-veeqo-step',
	async (customer_id: string, { container }) => {
		const veeqoService: VeeqoService = container.resolve('veeqo')
		await veeqoService.deleteCustomer(customer_id)
		return new StepResponse(void 0)
	}
)

export const deleteCustomerFromVeeqoWorkflow = createWorkflow(
	'delete-customer-from-veeqo-workflow',
	(customer_id: string) => {
		const result = findAndDeleteCustomerFromVeeqoStep(customer_id)
		return new WorkflowResponse(result)
	}
)
