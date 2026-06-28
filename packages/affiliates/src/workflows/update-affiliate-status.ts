import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse,
	transform
} from '@medusajs/framework/workflows-sdk'
import { updatePromotionsWorkflow } from '@medusajs/medusa/core-flows'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'
import { AffiliateStatus } from '../modules/affiliate/types'

export type UpdateAffiliateStatusInput = {
	id: string
	status: AffiliateStatus
}

type StatusSnapshot =
	| {
			id: string
			previous: AffiliateStatus
			deactivated_promotion_ids: string[]
	  }
	| undefined

type StatusStepOutput = {
	going_inactive: boolean
	snapshot: StatusSnapshot
}

type NonNullStatusSnapshot = {
	id: string
	previous: AffiliateStatus
	deactivated_promotion_ids: string[]
}

export const updateAffiliateStatusStep = createStep(
	'update-affiliate-status-step',
	async (input: UpdateAffiliateStatusInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)

		const existing = await svc.retrieveAffiliate(input.id)
		const previous = existing.status as AffiliateStatus

		if (previous === input.status) {
			return new StepResponse<StatusStepOutput, NonNullStatusSnapshot>(
				{ going_inactive: false, snapshot: undefined },
				null as unknown as NonNullStatusSnapshot
			)
		}

		await svc.updateAffiliates({ id: input.id, status: input.status } as any)

		const snapshot: NonNullStatusSnapshot = {
			id: input.id,
			previous,
			deactivated_promotion_ids: []
		}

		return new StepResponse<StatusStepOutput, NonNullStatusSnapshot>(
			{ snapshot, going_inactive: input.status === AffiliateStatus.INACTIVE },
			snapshot
		)
	},
	async (snapshot: NonNullStatusSnapshot | undefined, { container }) => {
		if (!snapshot) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		await svc.updateAffiliates({ id: snapshot.id, status: snapshot.previous } as any)
	}
)

export const collectActivePromotionIdsStep = createStep(
	'collect-active-promotion-ids-step',
	async (input: { affiliate_id: string; going_inactive: boolean }, { container }) => {
		if (!input.going_inactive) {
			return new StepResponse({ promotionIds: [] as string[] })
		}
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: 'affiliate',
			fields: ['id', 'promotions.id', 'promotions.status'],
			filters: { id: input.affiliate_id }
		})
		const promotionIds: string[] = []
		for (const a of data) {
			for (const p of (a as any).promotions ?? []) {
				if (p?.status === 'active' && p.id) promotionIds.push(p.id)
			}
		}
		return new StepResponse({ promotionIds })
	}
)

export const updateAffiliateStatusWorkflowId = 'update-affiliate-status'

export const updateAffiliateStatusWorkflow = createWorkflow(
	updateAffiliateStatusWorkflowId,
	function (input: UpdateAffiliateStatusInput) {
		const statusResult = updateAffiliateStatusStep(input)

		const collectInput = transform({ input, statusResult }, ({ input, statusResult }) => ({
			affiliate_id: input.id,
			going_inactive: statusResult.going_inactive
		}))

		const ids = collectActivePromotionIdsStep(collectInput)

		const promotionsData = transform({ ids }, ({ ids }) =>
			ids.promotionIds.map(id => ({ id, status: 'inactive' as const }))
		)

		updatePromotionsWorkflow.runAsStep({
			input: { promotionsData }
		})

		return new WorkflowResponse(statusResult)
	}
)
