import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type DeleteAffiliateInput = { id: string }

type PromotionSnapshot = {
	id: string
	previous_status: 'active' | 'inactive' | 'draft'
}

type Snapshot =
	| {
			affiliate_id: string
			promotions: PromotionSnapshot[]
	  }
	| undefined

export const deleteAffiliateStep = createStep(
	'delete-affiliate-step',
	async (input: DeleteAffiliateInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const link = container.resolve(ContainerRegistrationKeys.LINK)
		const promotionService = container.resolve(Modules.PROMOTION)

		// 1) Collect the affiliate's linked promotions + current statuses for rollback.
		const { data } = await query.graph({
			entity: 'affiliate',
			fields: ['id', 'promotions.id', 'promotions.status'],
			filters: { id: input.id }
		})
		const affiliate = data[0] as any
		if (!affiliate) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `Affiliate ${input.id} not found`)
		}
		const promotions: PromotionSnapshot[] = (affiliate.promotions ?? [])
			.filter((p: any) => p?.id)
			.map((p: any) => ({
				id: p.id as string,
				previous_status: (p.status ?? 'active') as PromotionSnapshot['previous_status']
			}))

		const snapshot: Snapshot = {
			affiliate_id: input.id,
			promotions
		}

		// 2) Retire each currently-active promotion. Already-inactive codes are
		//    left alone so rollback never re-activates a code the merchant had
		//    already deliberately retired.
		const toRetire = promotions.filter(p => p.previous_status === 'active')
		if (toRetire.length) {
			await promotionService.updatePromotions(toRetire.map(p => ({ id: p.id, status: 'inactive' as const })))
		}

		// 3) Dismiss the affiliate ↔ promotion links.
		if (promotions.length) {
			await link.dismiss(
				promotions.map(p => ({
					[AFFILIATE_MODULE]: { affiliate_id: input.id },
					[Modules.PROMOTION]: { promotion_id: p.id }
				}))
			)
		}

		// 4) Soft-delete the affiliate (cascades addresses via the model).
		await svc.softDeleteAffiliates([input.id])

		return new StepResponse({ id: input.id }, snapshot)
	},
	async (snapshot: Snapshot, { container }) => {
		if (!snapshot) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const link = container.resolve(ContainerRegistrationKeys.LINK)
		const promotionService = container.resolve(Modules.PROMOTION)

		// Compensation runs in reverse order.
		// 4') Restore the affiliate first so the link-recreation below has a valid parent.
		await svc.restoreAffiliates([snapshot.affiliate_id])

		// 3') Recreate the dismissed links.
		if (snapshot.promotions.length) {
			await link.create(
				snapshot.promotions.map(p => ({
					[AFFILIATE_MODULE]: { affiliate_id: snapshot.affiliate_id },
					[Modules.PROMOTION]: { promotion_id: p.id }
				}))
			)
		}

		// 2') Restore each promotion to its previous status.
		if (snapshot.promotions.length) {
			await promotionService.updatePromotions(snapshot.promotions.map(p => ({ id: p.id, status: p.previous_status })))
		}
	}
)

export const deleteAffiliateWorkflowId = 'delete-affiliate'

export const deleteAffiliateWorkflow = createWorkflow(deleteAffiliateWorkflowId, (input: DeleteAffiliateInput) => {
	const result = deleteAffiliateStep(input)
	return new WorkflowResponse(result)
})
