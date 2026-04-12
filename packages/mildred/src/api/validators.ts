import { z } from '@medusajs/framework/zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

// ── Admin Rubrics ───────────────────────────────────────────────────────────

export type AdminGetRubricsType = z.infer<typeof AdminGetRubrics>
export const AdminGetRubrics = createFindParams({ limit: 50, offset: 0 }).extend({
	q: z.string().optional(),
	active: z.preprocess((val) => {
		if (val === 'true') return true
		if (val === 'false') return false
		return val
	}, z.boolean().optional())
})

export type AdminGetRubricType = z.infer<typeof AdminGetRubric>
export const AdminGetRubric = createFindParams()

export type AdminCreateRubricType = z.infer<typeof AdminCreateRubric>
export const AdminCreateRubric = z.object({
	name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case (e.g. product_viewed)'),
	label: z.string().min(1),
	description: z.string().optional(),
	expected_properties: z.record(z.unknown()).optional(),
	active: z.boolean().optional()
})

export type AdminUpdateRubricType = z.infer<typeof AdminUpdateRubric>
export const AdminUpdateRubric = z.object({
	name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case').optional(),
	label: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	expected_properties: z.record(z.unknown()).nullable().optional(),
	active: z.boolean().optional()
})

export type AdminDeleteRubricsType = z.infer<typeof AdminDeleteRubrics>
export const AdminDeleteRubrics = z.object({
	ids: z.array(z.string()).min(1)
})

// ── Admin Events ────────────────────────────────────────────────────────

export type AdminGetEventsType = z.infer<typeof AdminGetEvents>
export const AdminGetEvents = createFindParams({ limit: 50, offset: 0 }).extend({
	event: z.string().optional(),
	actor_id: z.string().optional(),
	source: z.enum(['storefront', 'backend']).optional(),
	sales_channel_id: z.string().optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional()
})

export type AdminGetEventCountsType = z.infer<typeof AdminGetEventCounts>
export const AdminGetEventCounts = z.object({
	event: z.string().optional(),
	start_date: z.string(),
	end_date: z.string(),
	granularity: z.enum(['hour', 'day', 'week']),
	sales_channel_id: z.string().optional()
})

export type AdminGetFunnelQueryType = z.infer<typeof AdminGetFunnelQuery>
export const AdminGetFunnelQuery = z.object({
	funnel_id: z.string().optional(),
	start_date: z.string(),
	end_date: z.string(),
	sales_channel_id: z.string().optional()
})

// ── Admin Funnels ───────────────────────────────────────────────────────

export type AdminGetFunnelsType = z.infer<typeof AdminGetFunnels>
export const AdminGetFunnels = createFindParams({ limit: 50, offset: 0 })

export type AdminGetFunnelType = z.infer<typeof AdminGetFunnel>
export const AdminGetFunnel = createFindParams()

export type AdminCreateFunnelType = z.infer<typeof AdminCreateFunnel>
export const AdminCreateFunnel = z.object({
	name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case'),
	label: z.string().min(1),
	description: z.string().optional(),
	steps: z.array(z.string()).min(1),
	sales_channel_id: z.string().nullable().optional(),
	is_default: z.boolean().optional()
})

export type AdminUpdateFunnelType = z.infer<typeof AdminUpdateFunnel>
export const AdminUpdateFunnel = z.object({
	name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case').optional(),
	label: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	steps: z.array(z.string()).min(1).optional(),
	sales_channel_id: z.string().nullable().optional(),
	is_default: z.boolean().optional()
})

export type AdminDeleteFunnelsType = z.infer<typeof AdminDeleteFunnels>
export const AdminDeleteFunnels = z.object({
	ids: z.array(z.string()).min(1)
})

// ── Admin Segments ──────────────────────────────────────────────────────

export type AdminGetSegmentsType = z.infer<typeof AdminGetSegments>
export const AdminGetSegments = createFindParams({ limit: 50, offset: 0 })

export type AdminGetSegmentType = z.infer<typeof AdminGetSegment>
export const AdminGetSegment = createFindParams()

export type AdminCreateSegmentType = z.infer<typeof AdminCreateSegment>
export const AdminCreateSegment = z.object({
	name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case'),
	label: z.string().min(1),
	description: z.string().optional(),
	rules: z.object({
		operator: z.enum(['AND', 'OR']),
		conditions: z.array(z.object({
			type: z.enum(['event_performed', 'event_not_performed', 'identity_property']),
			event: z.string().optional(),
			count: z.record(z.number()).optional(),
			timeframe_days: z.number().optional(),
			key: z.string().optional(),
			operator: z.string().optional()
		})).min(1)
	}),
	sales_channel_id: z.string().nullable().optional()
})

export type AdminUpdateSegmentType = z.infer<typeof AdminUpdateSegment>
export const AdminUpdateSegment = z.object({
	name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Must be snake_case').optional(),
	label: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	rules: z.object({
		operator: z.enum(['AND', 'OR']),
		conditions: z.array(z.object({
			type: z.enum(['event_performed', 'event_not_performed', 'identity_property']),
			event: z.string().optional(),
			count: z.record(z.number()).optional(),
			timeframe_days: z.number().optional(),
			key: z.string().optional(),
			operator: z.string().optional()
		})).min(1)
	}).optional(),
	sales_channel_id: z.string().nullable().optional()
})

export type AdminDeleteSegmentsType = z.infer<typeof AdminDeleteSegments>
export const AdminDeleteSegments = z.object({
	ids: z.array(z.string()).min(1)
})

export type AdminGetSegmentMembersType = z.infer<typeof AdminGetSegmentMembers>
export const AdminGetSegmentMembers = createFindParams({ limit: 50, offset: 0 })

// ── Store Track ─────────────────────────────────────────────────────────────

export type StoreTrackEventType = z.infer<typeof StoreTrackEvent>
export const StoreTrackEvent = z.object({
	event: z.string().min(1),
	actor_id: z.string().optional(),
	session_id: z.string().uuid().optional(),
	properties: z.record(z.unknown()).optional(),
	sales_channel_id: z.string().optional()
})
