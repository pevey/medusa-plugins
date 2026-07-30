import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AFFILIATE_MODULE } from '../../../../../modules/affiliate'
import { AffiliateService } from '../../../../../modules/affiliate/service'
import { bucketByCurrency, selectRowsByBasis, windowStart, StatsBasis, StatsWindow } from '../../../../../modules/affiliate/stats'
import { AdminGetStatsType } from '../../../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetStatsType>, res: MedusaResponse) => {
	const svc: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const opts = svc.getOptions()
	const basis: StatsBasis = (req.validatedQuery.basis ?? opts.payoutBasis) as StatsBasis
	const window: StatsWindow = (req.validatedQuery.window ?? 'month') as StatsWindow
	const promotionId = req.validatedQuery.promotion_id ?? null

	const { data: affiliates } = await query.graph({
		entity: 'affiliate',
		fields: ['id', 'currency_code'],
		filters: { id: req.params.id }
	})
	const affiliate = affiliates[0] as any
	const primaryCurrency = affiliate?.currency_code ?? null

	const filters: Record<string, unknown> = { affiliate_id: req.params.id }
	if (promotionId) filters.promotion_id = promotionId

	const rows = await svc.listAffiliateAttributions(filters, {
		select: ['currency_code', 'gross_subtotal', 'net_subtotal', 'placed_at', 'captured_at', 'completed_at', 'voided_at']
	})

	const cutoff = windowStart(window, new Date())
	const selected = selectRowsByBasis(rows as any, basis, cutoff)
	const buckets = bucketByCurrency(selected, primaryCurrency)

	res.json({
		basis,
		window,
		promotion_id: promotionId,
		primary_currency_code: primaryCurrency,
		buckets
	})
}
