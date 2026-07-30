import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type AddAffiliateAddressInput = {
	affiliate_id: string
	address: {
		first_name?: string | null
		last_name?: string | null
		company?: string | null
		address_1?: string | null
		address_2?: string | null
		city?: string | null
		province?: string | null
		country_code?: string | null
		postal_code?: string | null
		phone?: string | null
	}
}

export const addAffiliateAddressStep = createStep(
	'add-affiliate-address-step',
	async (input: AddAffiliateAddressInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const [created] = await svc.createAffiliateAddresses([{ affiliate_id: input.affiliate_id, ...input.address }])
		return new StepResponse({ id: created.id }, created.id)
	},
	async (rollbackId: string | undefined, { container }) => {
		if (!rollbackId) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		await svc.deleteAffiliateAddresses([rollbackId])
	}
)

export const addAffiliateAddressWorkflowId = 'add-affiliate-address'

export const addAffiliateAddressWorkflow = createWorkflow(addAffiliateAddressWorkflowId, (input: AddAffiliateAddressInput) => {
	const result = addAffiliateAddressStep(input)
	return new WorkflowResponse(result)
})
