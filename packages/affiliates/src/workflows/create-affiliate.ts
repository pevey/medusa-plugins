import { MedusaError, Modules } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse, transform } from '@medusajs/framework/workflows-sdk'
import { createPromotionsWorkflow, createPromotionRulesWorkflow, createCampaignsWorkflow } from '@medusajs/medusa/core-flows'
import { createRemoteLinkStep } from '@medusajs/medusa/core-flows'
import { AFFILIATE_MODULE } from '../modules/affiliate'
import { AffiliateService } from '../modules/affiliate/service'

export type CreateAffiliateInput = {
	name: string
	email: string
	phone?: string | null
	currency_code?: string | null
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
	first_promotion: {
		code: string
		discount_type: 'percentage' | 'fixed'
		discount_value: number
		end_date?: string | null
	}
}

export type CreateAffiliateResult = {
	affiliate_id: string
	primary_address_id: string
	promotion_id: string
}

type AffiliateRollback = { affiliate_id: string; primary_address_id: string } | undefined

export const createAffiliateBaseStep = createStep(
	'create-affiliate-base-step',
	async (input: CreateAffiliateInput, { container }) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)

		const [affiliate] = await svc.createAffiliates([
			{
				name: input.name,
				email: input.email,
				phone: input.phone ?? null,
				currency_code: input.currency_code ?? null
			}
		])

		const [address] = await svc.createAffiliateAddresses([
			{
				affiliate_id: affiliate.id,
				first_name: input.address.first_name ?? null,
				last_name: input.address.last_name ?? null,
				company: input.address.company ?? null,
				address_1: input.address.address_1 ?? null,
				address_2: input.address.address_2 ?? null,
				city: input.address.city ?? null,
				province: input.address.province ?? null,
				country_code: input.address.country_code ?? null,
				postal_code: input.address.postal_code ?? null,
				phone: input.address.phone ?? null
			}
		])

		await svc.updateAffiliates({
			id: affiliate.id,
			primary_address_id: address.id
		})

		const rollback: AffiliateRollback = {
			affiliate_id: affiliate.id,
			primary_address_id: address.id
		}

		return new StepResponse({ affiliate_id: affiliate.id, primary_address_id: address.id }, rollback)
	},
	async (rollback: AffiliateRollback, { container }) => {
		if (!rollback) return
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		await svc.deleteAffiliates([rollback.affiliate_id])
	}
)

export const createAffiliateWorkflowId = 'create-affiliate'

export const createAffiliateWorkflow = createWorkflow(createAffiliateWorkflowId, (input: CreateAffiliateInput) => {
	const base = createAffiliateBaseStep(input)

	const campaignInput = transform({ input }, ({ input }) =>
		input.first_promotion.end_date
			? [
					{
						name: `Affiliate ${input.first_promotion.code} campaign`,
						campaign_identifier: `affiliate-${input.first_promotion.code}`,
						starts_at: new Date(),
						ends_at: new Date(input.first_promotion.end_date)
					}
				]
			: []
	)

	const campaigns = createCampaignsWorkflow.runAsStep({
		input: { campaignsData: campaignInput }
	})

	const promotionInput = transform({ input, campaigns }, ({ input, campaigns }) => [
		{
			code: input.first_promotion.code,
			type: 'standard' as const,
			is_automatic: false,
			status: 'active' as const,
			campaign_id: campaigns.length ? campaigns[0].id : undefined,
			application_method: {
				type: input.first_promotion.discount_type,
				value: input.first_promotion.discount_value,
				target_type: 'order' as const,
				currency_code: input.currency_code ?? undefined
			}
		}
	])

	const promotions = createPromotionsWorkflow.runAsStep({
		input: { promotionsData: promotionInput }
	})

	const linkInput = transform({ base, promotions }, ({ base, promotions }) => [
		{
			[AFFILIATE_MODULE]: { affiliate_id: base.affiliate_id },
			[Modules.PROMOTION]: { promotion_id: promotions[0].id }
		}
	])

	createRemoteLinkStep(linkInput)

	const result = transform({ base, promotions }, ({ base, promotions }) => ({
		affiliate_id: base.affiliate_id,
		primary_address_id: base.primary_address_id,
		promotion_id: promotions[0].id
	}))

	return new WorkflowResponse(result)
})
