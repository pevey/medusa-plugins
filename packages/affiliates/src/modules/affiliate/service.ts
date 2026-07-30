import { MedusaService } from '@medusajs/framework/utils'
import { Logger } from '@medusajs/framework/types'
import { Affiliate } from './models/affiliate'
import { AffiliateAddress } from './models/affiliate-address'
import { AffiliateAttribution } from './models/affiliate-attribution'
import { AffiliateOptions } from './types'

export class AffiliateService extends MedusaService({
	Affiliate,
	AffiliateAddress,
	AffiliateAttribution
}) {
	protected logger_: Logger
	protected readonly options_: AffiliateOptions

	constructor(container: { logger: Logger }, options?: AffiliateOptions) {
		super(...arguments)
		this.logger_ = container.logger
		this.options_ = {
			...(options ?? {})
		}
		if (!this.options_.payoutBasis) this.options_.payoutBasis = 'completed'
		if (!this.options_.defaultCommissionBasis) this.options_.defaultCommissionBasis = 'net'
		if (this.options_.allowStackingWithNonAffiliatePromotions === undefined) this.options_.allowStackingWithNonAffiliatePromotions = true
	}

	getOptions(): AffiliateOptions {
		return this.options_
	}
}
