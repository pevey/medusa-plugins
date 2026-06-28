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

export type AdminAffiliatePromotion = {
	id: string
	code: string
	status: 'active' | 'inactive' | 'draft'
	is_automatic: boolean
	campaign?: { id: string; ends_at: string | null } | null
	application_method?: { type: 'percentage' | 'fixed'; value: number } | null
}

export type AdminAffiliateStatus = 'active' | 'restricted' | 'inactive'

export type AdminAffiliate = {
	id: string
	name: string
	email: string
	phone: string | null
	currency_code: string | null
	status: AdminAffiliateStatus
	primary_address_id: string | null
	created_at: string
	updated_at: string
	addresses?: AdminAffiliateAddress[]
	promotions?: AdminAffiliatePromotion[]
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
