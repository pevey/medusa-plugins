import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { updateCartPromotionsWorkflow } from '@medusajs/medusa/core-flows'
import { AFFILIATE_MODULE } from '../../modules/affiliate'
import { AffiliateService } from '../../modules/affiliate/service'
import { evaluatePromotionStack } from './lib/evaluate-promotion-stack'

updateCartPromotionsWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
	const svc: AffiliateService = container.resolve(AFFILIATE_MODULE)
	const query = container.resolve(ContainerRegistrationKeys.QUERY)
	const opts = svc.getOptions()

	const action: 'add' | 'remove' | 'replace' = (input as any).action ?? 'add'
	const incomingCodes: string[] = ((input as any).promo_codes ?? []) as string[]
	const currentCodes: string[] = ((cart as any).promotions ?? []).map((p: any) => p?.code).filter((c: any): c is string => typeof c === 'string')

	const allCodes = Array.from(new Set([...incomingCodes, ...currentCodes]))
	if (allCodes.length === 0) return

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
		action
	})

	if (!decision.accept) {
		throw new MedusaError(MedusaError.Types.NOT_ALLOWED, decision.reason ?? 'Promotion not allowed.')
	}

	if (decision.codesToRemove.length) {
		;(input as any).promo_codes = Array.from(new Set([...currentCodes.filter(c => !decision.codesToRemove.includes(c)), ...incomingCodes]))
		;(input as any).action = 'replace'
	}
})

export {}
