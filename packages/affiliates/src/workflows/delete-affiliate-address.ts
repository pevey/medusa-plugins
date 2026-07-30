import { MedusaError } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type DeleteAffiliateAddressInput = { affiliate_id: string; address_id: string }

type Rollback = { snapshot: Record<string, unknown>; was_primary: boolean } | undefined

export const deleteAffiliateAddressStep = createStep(
	'delete-affiliate-address-step',
	async (input: DeleteAffiliateAddressInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const affiliate = await svc.retrieveAffiliate(input.affiliate_id)
		const addresses = await svc.listAffiliateAddresses({ affiliate_id: input.affiliate_id })

		const target = addresses.find(a => a.id === input.address_id)
		if (!target) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `Address ${input.address_id} not found for affiliate ${input.affiliate_id}`)
		}

		const isPrimary = affiliate.primary_address_id === input.address_id
		const others = addresses.filter(a => a.id !== input.address_id)

		if (isPrimary && others.length === 0) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Cannot delete the only address; add another address first.')
		}

		const snapshot: Rollback = {
			snapshot: { ...target, affiliate_id: input.affiliate_id },
			was_primary: isPrimary
		}

		if (isPrimary) {
			await svc.updateAffiliates({
				id: input.affiliate_id,
				primary_address_id: others[0].id
			} as any)
		}
		await svc.deleteAffiliateAddresses([input.address_id])

		return new StepResponse({ id: input.address_id }, snapshot)
	},
	async (rollback: Rollback, { container }) => {
		if (!rollback) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		await svc.createAffiliateAddresses([rollback.snapshot as any])
		if (rollback.was_primary) {
			await svc.updateAffiliates({
				id: (rollback.snapshot as any).affiliate_id,
				primary_address_id: (rollback.snapshot as any).id
			} as any)
		}
	}
)

export const deleteAffiliateAddressWorkflowId = 'delete-affiliate-address'

export const deleteAffiliateAddressWorkflow = createWorkflow(deleteAffiliateAddressWorkflowId, (input: DeleteAffiliateAddressInput) => {
	const result = deleteAffiliateAddressStep(input)
	return new WorkflowResponse(result)
})
