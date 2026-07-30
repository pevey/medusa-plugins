import { MedusaError } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type UpdateAffiliateInput = {
	id: string
	name?: string
	email?: string
	phone?: string | null
	currency_code?: string | null
	primary_address_id?: string
}

type Snapshot = {
	id: string
	name: string
	email: string
	phone: string | null
	currency_code: string | null
	primary_address_id: string | null
}

export const updateAffiliateStep = createStep(
	'update-affiliate-step',
	async (input: UpdateAffiliateInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)

		const existing = await svc.retrieveAffiliate(input.id)

		if (input.primary_address_id !== undefined) {
			const [match] = await svc.listAffiliateAddresses({
				id: input.primary_address_id,
				affiliate_id: input.id
			})
			if (!match) {
				throw new MedusaError(MedusaError.Types.INVALID_DATA, `Address ${input.primary_address_id} does not belong to affiliate ${input.id}`)
			}
		}

		const snapshot: Snapshot = {
			id: existing.id,
			name: existing.name,
			email: existing.email,
			phone: existing.phone,
			currency_code: existing.currency_code,
			primary_address_id: existing.primary_address_id
		}

		const patch: Record<string, unknown> = { id: input.id }
		if (input.name !== undefined) patch.name = input.name
		if (input.email !== undefined) patch.email = input.email
		if (input.phone !== undefined) patch.phone = input.phone
		if (input.currency_code !== undefined) patch.currency_code = input.currency_code
		if (input.primary_address_id !== undefined) patch.primary_address_id = input.primary_address_id

		await svc.updateAffiliates(patch as any)

		return new StepResponse(undefined, snapshot)
	},
	async (snapshot: Snapshot | undefined, { container }) => {
		if (!snapshot) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		await svc.updateAffiliates({
			id: snapshot.id,
			name: snapshot.name,
			email: snapshot.email,
			phone: snapshot.phone,
			currency_code: snapshot.currency_code,
			primary_address_id: snapshot.primary_address_id
		} as any)
	}
)

export const updateAffiliateWorkflowId = 'update-affiliate'

export const updateAffiliateWorkflow = createWorkflow(updateAffiliateWorkflowId, (input: UpdateAffiliateInput) => {
	updateAffiliateStep(input)
	return new WorkflowResponse(input)
})
