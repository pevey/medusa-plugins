export type AdminAffiliateAddress = {
	id: string
	affiliate_id: string
	first_name: string | null
	last_name: string | null
	company: string | null
	address_1: string | null
	address_2: string | null
	city: string | null
	province: string | null
	country_code: string | null
	postal_code: string | null
	phone: string | null
}

// A hand-selected subset of the core Medusa `Promotion` entity (via the
// affiliate<->promotion module link), not the full `AdminPromotion` type --
// `campaign_id`/`campaign.id`/`application_method.id` are always present
// alongside the fields the admin UI actually reads (see middlewares.ts'
// `promotions.*` defaults for the detail route).
export type AdminAffiliatePromotion = {
	id: string
	code: string
	status: 'active' | 'inactive' | 'draft'
	is_automatic: boolean
	campaign_id: string | null
	campaign?: { id: string; ends_at: string | null } | null
	application_method?: { id: string; type: 'percentage' | 'fixed'; value: number } | null
}

export type AdminAffiliateStatus = 'active' | 'restricted' | 'inactive'

export type AdminAffiliate = {
	id: string
	name: string
	email: string
	phone: string | null
	currency_code: string | null
	status: AdminAffiliateStatus
	// Only present on the detail route (`GET /admin/affiliates/:id`) -- the
	// list route's `defaults` never requests it, so it's optional here.
	primary_address_id?: string | null
	created_at: string
	addresses?: AdminAffiliateAddress[]
	promotions?: AdminAffiliatePromotion[]
}

export type AdminAffiliatesResponse = {
	affiliates: AdminAffiliate[]
	count: number
	offset: number
	limit: number
}

export type AdminAffiliateResponse = {
	affiliate: AdminAffiliate
}

export type AdminAffiliateStatsBucket = {
	currency_code: string
	order_count: number
	gross_total: number
	net_total: number
	average_order_value_gross: number
	average_order_value_net: number
}

export type AdminAffiliateStatsResponse = {
	basis: 'placed' | 'captured' | 'completed'
	window: 'day' | 'week' | 'month' | 'year' | 'all'
	promotion_id: string | null
	primary_currency_code: string | null
	buckets: AdminAffiliateStatsBucket[]
}
