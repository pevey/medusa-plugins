export enum AffiliateStatus {
	ACTIVE = 'active',
	RESTRICTED = 'restricted',
	INACTIVE = 'inactive'
}

export type AffiliateOptions = {
	payoutBasis?: 'placed' | 'captured' | 'completed'
	defaultCommissionBasis?: 'gross' | 'net'
	defaultCommissionRate?: number
	allowStackingWithNonAffiliatePromotions?: boolean
}
