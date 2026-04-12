export type AdminRubric = {
	id: string
	name: string
	label: string
	description?: string | null
	expected_properties?: Record<string, unknown> | null
	active: boolean
	created_at?: string
	updated_at?: string
}

export type AdminRubricsResponse = {
	rubrics: AdminRubric[]
	count: number
	limit: number
	offset: number
}

export type AdminRubricResponse = {
	rubric: AdminRubric
}

export type AdminFunnel = {
	id: string
	name: string
	label: string
	description?: string | null
	steps: string[]
	sales_channel_id?: string | null
	is_default: boolean
	created_at?: string
	updated_at?: string
}

export type AdminFunnelsResponse = {
	funnels: AdminFunnel[]
	count: number
	limit: number
	offset: number
}

export type AdminFunnelResponse = {
	funnel: AdminFunnel
}

export type FunnelStep = {
	event: string
	count: number
	conversion_rate: number
}

export type AdminFunnelQueryResponse = {
	funnel: { id: string; name: string; label: string }
	results: FunnelStep[]
}

export type AdminEvent = {
	id: string
	event: string
	actor_id?: string | null
	source: 'storefront' | 'backend'
	sales_channel_id?: string | null
	properties?: Record<string, unknown> | null
	timestamp: string
	created_at?: string
}

export type AdminEventsResponse = {
	events: AdminEvent[]
	count: number
	limit: number
	offset: number
}
