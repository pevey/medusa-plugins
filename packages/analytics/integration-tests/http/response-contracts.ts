/**
 * Response contracts for the analytics admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types/analytics`. Nothing previously verified
 * those hand-written types actually matched what the routes return -- the admin
 * dashboard is bundled by Vite and never typechecked against a real HTTP response,
 * and the test harness fakes the SDK, so it only ever sees fixtures a test author
 * wrote. This module plus the `.parse()` calls in `analytics.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-analytics typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in analytics.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file). A view that reads a field the type no longer
 *                           declares fails to compile.
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (and by extension the components that read it),
 * never a reason to loosen the schema. See task-4c-analytics-report.md for every
 * mismatch found while building this file and which side was fixed.
 *
 * Unlike complaints (the pilot) or plugins with embedded customer/order/product
 * relations, none of analytics' admin responses embed a core-Medusa entity, and
 * none carry money/BigNumber fields -- every response here is either a plain
 * plugin-owned row (rubric/funnel/event) or a hand-rolled aggregate. So this file
 * has no `CoreEntityRef` machinery; every two-way check below compares the schema
 * directly against the real exported admin type.
 *
 * Two schemas at the bottom (`AdminEventCountsResponseSchema`,
 * `AdminSegmentPreviewResponseSchema`) are "route-only" contracts: they cover real
 * routes flagged in the task brief as aggregate/rollup shapes worth pinning down,
 * but neither has a hand-written admin type to check against -- no admin UI consumes
 * either route yet (see the per-schema comment and task-4c-analytics-report.md for
 * why). They get a `z.strictObject` and a `.parse()` assertion like everything else,
 * just no two-way assignability consts.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminEvent,
	AdminEventsResponse,
	AdminFunnel,
	AdminFunnelQueryResponse,
	AdminFunnelResponse,
	AdminFunnelsResponse,
	AdminRubric,
	AdminRubricResponse,
	AdminRubricsResponse,
	FunnelStep
} from '../../src/admin/types/analytics'

// ── Rubrics ───────────────────────────────────────────────────────────────────

export const AdminRubricSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	label: z.string(),
	description: z.string().nullable(),
	expected_properties: z.record(z.string(), z.unknown()).nullable().optional(),
	active: z.boolean(),
	created_at: z.string(),
	updated_at: z.string()
})
const _rubricSchemaMatchesType: AdminRubric = {} as z.infer<typeof AdminRubricSchema>
const _rubricTypeMatchesSchema: z.infer<typeof AdminRubricSchema> = {} as AdminRubric

export const AdminRubricResponseSchema = z.strictObject({
	rubric: AdminRubricSchema
})
const _rubricResponseSchemaMatchesType: AdminRubricResponse = {} as z.infer<typeof AdminRubricResponseSchema>
const _rubricResponseTypeMatchesSchema: z.infer<typeof AdminRubricResponseSchema> = {} as AdminRubricResponse

export const AdminRubricsResponseSchema = z.strictObject({
	rubrics: z.array(AdminRubricSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _rubricsResponseSchemaMatchesType: AdminRubricsResponse = {} as z.infer<typeof AdminRubricsResponseSchema>
const _rubricsResponseTypeMatchesSchema: z.infer<typeof AdminRubricsResponseSchema> = {} as AdminRubricsResponse

// ── Events ────────────────────────────────────────────────────────────────────

export const AdminEventSchema = z.strictObject({
	id: z.string(),
	event: z.string(),
	actor_id: z.string().nullable(),
	source: z.enum(['storefront', 'backend']),
	sales_channel_id: z.string().nullable(),
	properties: z.record(z.string(), z.unknown()).nullable(),
	timestamp: z.string(),
	created_at: z.string()
})
const _eventSchemaMatchesType: AdminEvent = {} as z.infer<typeof AdminEventSchema>
const _eventTypeMatchesSchema: z.infer<typeof AdminEventSchema> = {} as AdminEvent

export const AdminEventsResponseSchema = z.strictObject({
	events: z.array(AdminEventSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _eventsResponseSchemaMatchesType: AdminEventsResponse = {} as z.infer<typeof AdminEventsResponseSchema>
const _eventsResponseTypeMatchesSchema: z.infer<typeof AdminEventsResponseSchema> = {} as AdminEventsResponse

// ── Funnels ───────────────────────────────────────────────────────────────────

export const AdminFunnelSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	label: z.string(),
	description: z.string().nullable(),
	steps: z.array(z.string()),
	sales_channel_id: z.string().nullable(),
	is_default: z.boolean(),
	created_at: z.string(),
	updated_at: z.string()
})
const _funnelSchemaMatchesType: AdminFunnel = {} as z.infer<typeof AdminFunnelSchema>
const _funnelTypeMatchesSchema: z.infer<typeof AdminFunnelSchema> = {} as AdminFunnel

export const AdminFunnelResponseSchema = z.strictObject({
	funnel: AdminFunnelSchema
})
const _funnelResponseSchemaMatchesType: AdminFunnelResponse = {} as z.infer<typeof AdminFunnelResponseSchema>
const _funnelResponseTypeMatchesSchema: z.infer<typeof AdminFunnelResponseSchema> = {} as AdminFunnelResponse

export const AdminFunnelsResponseSchema = z.strictObject({
	funnels: z.array(AdminFunnelSchema),
	count: z.number(),
	limit: z.number(),
	offset: z.number()
})
const _funnelsResponseSchemaMatchesType: AdminFunnelsResponse = {} as z.infer<typeof AdminFunnelsResponseSchema>
const _funnelsResponseTypeMatchesSchema: z.infer<typeof AdminFunnelsResponseSchema> = {} as AdminFunnelsResponse

// ── Funnel query (dashboard) ──────────────────────────────────────────────────

export const FunnelStepSchema = z.strictObject({
	event: z.string(),
	count: z.number(),
	conversion_rate: z.number()
})
const _funnelStepSchemaMatchesType: FunnelStep = {} as z.infer<typeof FunnelStepSchema>
const _funnelStepTypeMatchesSchema: z.infer<typeof FunnelStepSchema> = {} as FunnelStep

export const AdminFunnelQueryResponseSchema = z.strictObject({
	funnel: z.strictObject({
		id: z.string(),
		name: z.string(),
		label: z.string()
	}),
	results: z.array(FunnelStepSchema)
})
const _funnelQueryResponseSchemaMatchesType: AdminFunnelQueryResponse = {} as z.infer<typeof AdminFunnelQueryResponseSchema>
const _funnelQueryResponseTypeMatchesSchema: z.infer<typeof AdminFunnelQueryResponseSchema> = {} as AdminFunnelQueryResponse

// ── Route-only contracts (no hand-written admin type, no admin UI consumer yet) ──

// GET /admin/analytics/events/counts. Not called by any admin hook/component today
// (grepped `src/admin` for `events/counts` and `EventCounts` -- zero hits), but the
// task brief flags event-count rollups by name as a shape worth pinning down, and
// the middleware entry for this route passes `{}` to `validateAndTransformQuery`
// (no `defaults`/`isList`) -- the handler builds the response by hand from a raw
// knex query (`service.ts#getEventCounts`), not `req.queryConfig`, so there was no
// admin type to check this against in the first place. Written directly from
// reading the handler + a real response, not from an existing type.
export const AdminEventCountsResponseSchema = z.strictObject({
	counts: z.array(
		z.strictObject({
			// `date_trunc(...)` renders as an ISO timestamp string once JSON-serialized.
			date: z.string(),
			event: z.string(),
			// Postgres COUNT(*) is bigint; node-pg returns bigint columns as strings to
			// avoid silent precision loss, and this handler does not cast it -- unlike
			// `getFunnel()`'s `Number(count)` a few lines below it in the same service
			// file. Confirmed against a real response, not assumed. See
			// task-4c-analytics-report.md finding on `AdminEventCountsResponseSchema`.
			count: z.string()
		})
	)
})

// GET /admin/analytics/segments/:id/preview. Segments (list/create/preview/export)
// are fully built on the backend but have no admin UI yet (no hooks, no hand-written
// admin type) -- see task-4c-analytics-report.md for the scoping decision. This
// route's `middlewares: []` entry was dead (the handler never reads
// `req.queryConfig`; it computes the response from `evaluateSegmentRules()`
// directly) and was removed as part of this task's prep, so there is no
// `defaults` array to read fields from either. Modelled straight from the handler.
export const AdminSegmentPreviewResponseSchema = z.strictObject({
	count: z.number(),
	sample: z.array(z.string())
})

// GET /admin/analytics/segments/:id/export returns `text/csv`, not JSON -- there is
// nothing to `.parse()` here. See the spec's content-type-only assertion instead.
