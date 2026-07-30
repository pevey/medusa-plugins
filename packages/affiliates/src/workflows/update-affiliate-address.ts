import { MedusaError } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type UpdateAffiliateAddressInput = {
	affiliate_id: string
	address_id: string
	patch: {
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

type Snapshot = Record<string, unknown> | undefined

export const updateAffiliateAddressStep = createStep(
	'update-affiliate-address-step',
	async (input: UpdateAffiliateAddressInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const [match] = await svc.listAffiliateAddresses({
			id: input.address_id,
			affiliate_id: input.affiliate_id
		})
		if (!match) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `Address ${input.address_id} not found for affiliate ${input.affiliate_id}`)
		}
		const snapshot: Snapshot = {
			id: match.id,
			first_name: match.first_name,
			last_name: match.last_name,
			company: match.company,
			address_1: match.address_1,
			address_2: match.address_2,
			city: match.city,
			province: match.province,
			country_code: match.country_code,
			postal_code: match.postal_code,
			phone: match.phone
		}
		await svc.updateAffiliateAddresses({ id: input.address_id, ...input.patch } as any)
		return new StepResponse({ id: input.address_id }, snapshot)
	},
	async (snapshot: Snapshot, { container }) => {
		if (!snapshot) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		await svc.updateAffiliateAddresses(snapshot as any)
	}
)

export const updateAffiliateAddressWorkflowId = 'update-affiliate-address'

export const updateAffiliateAddressWorkflow = createWorkflow(updateAffiliateAddressWorkflowId, (input: UpdateAffiliateAddressInput) => {
	const result = updateAffiliateAddressStep(input)
	return new WorkflowResponse(result)
})
