/// <reference types="jest" />
import { AffiliateService } from '../service'

describe('AffiliateService — options', () => {
	it('returns defaults when no options provided', () => {
		const svc = new AffiliateService({ logger: console as any })
		const opts = svc.getOptions()
		expect(opts.payoutBasis).toBe('completed')
		expect(opts.defaultCommissionBasis).toBe('net')
		expect(opts.defaultCommissionRate).toBeUndefined()
		expect(opts.allowStackingWithNonAffiliatePromotions).toBe(true)
	})

	it('preserves provided options', () => {
		const svc = new AffiliateService(
			{ logger: console as any },
			{
				payoutBasis: 'captured',
				defaultCommissionRate: 0.1,
				defaultCommissionBasis: 'gross',
				allowStackingWithNonAffiliatePromotions: false
			}
		)
		const opts = svc.getOptions()
		expect(opts.payoutBasis).toBe('captured')
		expect(opts.defaultCommissionRate).toBe(0.1)
		expect(opts.defaultCommissionBasis).toBe('gross')
		expect(opts.allowStackingWithNonAffiliatePromotions).toBe(false)
	})
})
