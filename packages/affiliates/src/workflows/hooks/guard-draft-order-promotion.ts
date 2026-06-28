// Draft-order promotion hook. The exact core workflow id may evolve;
// the import below is the v2.16 entry point.
// NOTE: As of Medusa 2.16, updateDraftOrderWorkflow.hooks does NOT expose a
// 'validate' hook point (hooks is empty). The registration is gated behind
// optional chaining (?.) so the module loads safely. When Medusa adds
// hooks.validate to this workflow in a future release, this guard will
// activate automatically without any code change.
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { updateDraftOrderWorkflow } from '@medusajs/medusa/core-flows'
import { AFFILIATE_MODULE } from '../../modules/affiliate'
import { AffiliateService } from '../../modules/affiliate/service'
import { evaluatePromotionStack } from './lib/evaluate-promotion-stack'
;(updateDraftOrderWorkflow.hooks as any).validate?.(
	async ({ input, cart }: any, { container }: any) => {
		const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
		const query = container.resolve(ContainerRegistrationKeys.QUERY)
		const opts = svc.getOptions()

		const incomingCodes: string[] = ((input as any).promo_codes ?? []) as string[]
		if (!incomingCodes.length) return

		const currentCodes: string[] = ((cart as any)?.promotions ?? [])
			.map((p: any) => p?.code)
			.filter((c: any): c is string => typeof c === 'string')

		const allCodes = Array.from(new Set([...incomingCodes, ...currentCodes]))
		const { data: promotions } = await query.graph({
			entity: 'promotion',
			fields: ['id', 'code', 'affiliate.id'],
			filters: { code: allCodes }
		})
		const affiliateCodes = new Set<string>()
		for (const p of promotions as any[]) {
			if (p?.code && p?.affiliate?.id) affiliateCodes.add(p.code)
		}

		const decision = evaluatePromotionStack({
			currentCodes,
			incomingCodes,
			affiliateCodes,
			allowStacking: opts.allowStackingWithNonAffiliatePromotions!,
			action: 'add'
		})

		if (!decision.accept) {
			throw new MedusaError(
				MedusaError.Types.NOT_ALLOWED,
				decision.reason ?? 'Promotion not allowed.'
			)
		}
		if (decision.codesToRemove.length) {
			;(input as any).promo_codes = Array.from(
				new Set([
					...currentCodes.filter(c => !decision.codesToRemove.includes(c)),
					...incomingCodes
				])
			)
		}
	}
)

export {}
