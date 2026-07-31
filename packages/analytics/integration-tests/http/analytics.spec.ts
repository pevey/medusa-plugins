/**
 * Integration tests for the analytics plugin HTTP surface.
 *
 * - Admin route auth guard.
 * - Store `/store/ping` ingestion: single event (backward compatible) and the
 *   batch array form, proving `validateAndTransformBody` accepts a top-level
 *   array and the route fans it out.
 * - Admin rubrics/funnels/events/funnel-query CRUD and read routes, each
 *   verified against its `response-contracts.ts` schema -- see that file's
 *   header for why (and task-4c-analytics-report.md for every mismatch found
 *   while wiring these assertions up).
 * - Two route-only aggregate shapes with no admin UI consumer yet
 *   (`/admin/analytics/events/counts`, `/admin/analytics/segments/:id/preview`),
 *   plus a content-type-only check on `/admin/analytics/segments/:id/export`
 *   (CSV, not JSON -- nothing to `.parse()`).
 *
 * Seeding note (test-utils >= 2.17.0 DB templating, PR #15805): the runner
 * snapshots the DB template on the FIRST test and restores from it before every
 * later test. Data seeded in a `beforeAll` that runs after that first snapshot
 * (e.g. in a second `describe`) is wiped by the restore. After seeding shared
 * data you MUST re-capture the template via `dbUtils.snapshot()` (see
 * `seedSnapshot` below), or the seeded publishable key is invisible to the HTTP
 * server and every /store call 400s with "A valid publishable key is required".
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=analytics
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createSalesChannelsWorkflow, createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow, createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { PRIVATE_ANALYTICS_MODULE } from '../../src/modules/analytics'
import {
	AdminEventCountsResponseSchema,
	AdminEventsResponseSchema,
	AdminFunnelQueryResponseSchema,
	AdminFunnelResponseSchema,
	AdminFunnelsResponseSchema,
	AdminRubricResponseSchema,
	AdminRubricsResponseSchema,
	AdminSegmentPreviewResponseSchema
} from './response-contracts'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-analytics',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		let container: any
		let adminToken: string

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// Re-snapshot the DB template so seeded rows survive the per-test restore.
		const seedSnapshot = async () => {
			await utils.waitWorkflowExecutions()
			await dbUtils.snapshot()
		}

		// Runs before the runner's first-test snapshot, so the admin user is baked
		// into the template for every describe block below without an extra
		// `seedSnapshot()` call here.
		beforeAll(async () => {
			container = getContainer()

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'analytics-test@example.com', password: 'Sup3rSecret!' }
			})
			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: { email: 'analytics-test@example.com', first_name: 'Analytics', last_name: 'Tester' }
				}
			})
			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'analytics-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		describe('Authentication', () => {
			it('GET /admin/analytics/events returns 401 without auth token', async () => {
				const res = await api.get('/admin/analytics/events').catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})
		})

		describe('POST /store/ping', () => {
			let pak: string

			beforeAll(async () => {
				// A publishable key linked to a single sales channel: exercises the
				// route's server-side sales-channel derivation.
				const { result: channels } = await createSalesChannelsWorkflow(container).run({
					input: { salesChannelsData: [{ name: 'Ping Test' }] }
				})
				const { result: keys } = await createApiKeysWorkflow(container).run({
					input: { api_keys: [{ title: 'Ping PAK', type: 'publishable', created_by: 'test' }] }
				})
				pak = keys[0].token
				await linkSalesChannelsToApiKeyWorkflow(container).run({
					input: { id: keys[0].id, add: [channels[0].id] }
				})
				// Active rubrics so these custom store events pass route-level gating.
				const analytics: any = container.resolve(PRIVATE_ANALYTICS_MODULE)
				await analytics.createAnalyticsRubrics([
					{ name: 'page_view', label: 'Page View' },
					{ name: 'product_viewed', label: 'Product Viewed' }
				])
				await seedSnapshot()
			})

			const pk = () => ({ headers: { 'x-publishable-api-key': pak } })

			it('accepts a single rubric event (count = accepted)', async () => {
				const res = await api.post('/store/ping', { event: 'page_view' }, pk())
				expect(res.status).toBe(202)
				expect(res.data).toEqual({ tracked: true, count: 1 })
			})

			it('accepts a bare array of rubric events (batch)', async () => {
				const res = await api.post(
					'/store/ping',
					[
						{ event: 'page_view', properties: { path: '/' } },
						{ event: 'product_viewed', properties: { product_id: 'prod_1' } }
					],
					pk()
				)
				expect(res.status).toBe(202)
				expect(res.data).toEqual({ tracked: true, count: 2 })
			})

			it('gates out events without an active rubric', async () => {
				const res = await api.post('/store/ping', [{ event: 'page_view' }, { event: 'not_a_rubric_xyz' }], pk())
				expect(res.status).toBe(202)
				expect(res.data).toEqual({ tracked: true, count: 1 })
			})

			it('rejects an empty array at validation', async () => {
				const res = await api.post('/store/ping', [], pk()).catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Admin Rubrics ─────────────────────────────────────────────────────────

		describe('Admin Rubrics', () => {
			let rubricId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/analytics/rubrics',
					{ name: 'signup_completed', label: 'Signup Completed', description: 'User completed signup' },
					auth()
				)
				rubricId = res.data.rubric.id
				await seedSnapshot()
			})

			it('POST /admin/analytics/rubrics creates a rubric', async () => {
				const res = await api.post('/admin/analytics/rubrics', { name: 'checkout_started', label: 'Checkout Started' }, auth())
				expect(res.status).toBe(200)
				// Response contract: verifies AdminRubricResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminRubricResponseSchema.parse(res.data)).not.toThrow()
			})

			it('GET /admin/analytics/rubrics lists rubrics', async () => {
				const res = await api.get('/admin/analytics/rubrics', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.rubrics)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(1)
				// Response contract: verifies AdminRubricsResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminRubricsResponseSchema.parse(res.data)).not.toThrow()
			})

			it('GET /admin/analytics/rubrics/:id retrieves a single rubric', async () => {
				const res = await api.get(`/admin/analytics/rubrics/${rubricId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.rubric.id).toBe(rubricId)
				// Response contract: verifies AdminRubricResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminRubricResponseSchema.parse(res.data)).not.toThrow()
			})

			it('POST /admin/analytics/rubrics/:id updates a rubric', async () => {
				const res = await api.post(`/admin/analytics/rubrics/${rubricId}`, { label: 'Signup Completed (Updated)' }, auth())
				expect(res.status).toBe(200)
				expect(res.data.rubric.label).toBe('Signup Completed (Updated)')
				// Response contract: verifies AdminRubricResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminRubricResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ── Admin Funnels ─────────────────────────────────────────────────────────

		describe('Admin Funnels', () => {
			let funnelId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/analytics/funnels',
					{ name: 'main_funnel', label: 'Main Funnel', steps: ['cart_created', 'order_placed'] },
					auth()
				)
				funnelId = res.data.funnel.id
				await seedSnapshot()
			})

			it('POST /admin/analytics/funnels creates a funnel', async () => {
				const res = await api.post('/admin/analytics/funnels', { name: 'secondary_funnel', label: 'Secondary Funnel', steps: ['cart_created'] }, auth())
				expect(res.status).toBe(200)
				// Response contract: verifies AdminFunnelResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminFunnelResponseSchema.parse(res.data)).not.toThrow()
			})

			it('GET /admin/analytics/funnels lists funnels', async () => {
				const res = await api.get('/admin/analytics/funnels', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.funnels)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(1)
				// Response contract: verifies AdminFunnelsResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminFunnelsResponseSchema.parse(res.data)).not.toThrow()
			})

			it('GET /admin/analytics/funnels/:id retrieves a single funnel', async () => {
				const res = await api.get(`/admin/analytics/funnels/${funnelId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.funnel.id).toBe(funnelId)
				// Response contract: verifies AdminFunnelResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminFunnelResponseSchema.parse(res.data)).not.toThrow()
			})

			it('POST /admin/analytics/funnels/:id updates a funnel', async () => {
				const res = await api.post(`/admin/analytics/funnels/${funnelId}`, { label: 'Main Funnel (Updated)' }, auth())
				expect(res.status).toBe(200)
				expect(res.data.funnel.label).toBe('Main Funnel (Updated)')
				// Response contract: verifies AdminFunnelResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminFunnelResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ── Admin Events ──────────────────────────────────────────────────────────

		describe('Admin Events', () => {
			beforeAll(async () => {
				const privateAnalytics: any = container.resolve(PRIVATE_ANALYTICS_MODULE)
				await privateAnalytics.trackEvent([
					{ event: 'admin_seed_event', actor_id: 'actor_events_1', source: 'backend' },
					{ event: 'admin_seed_event', actor_id: 'actor_events_2', source: 'storefront', sales_channel_id: 'sc_events_test' }
				])
				await seedSnapshot()
			})

			it('GET /admin/analytics/events lists events filtered by event name', async () => {
				const res = await api.get('/admin/analytics/events?event=admin_seed_event', auth())
				expect(res.status).toBe(200)
				expect(res.data.events.length).toBeGreaterThanOrEqual(2)
				// Response contract: verifies AdminEventsResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminEventsResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ── Admin Funnel Query (dashboard) ───────────────────────────────────────

		describe('Admin Funnel Query', () => {
			let queryFunnelId: string

			beforeAll(async () => {
				const privateAnalytics: any = container.resolve(PRIVATE_ANALYTICS_MODULE)
				await privateAnalytics.trackEvent([
					{ event: 'funnel_query_step_one', actor_id: 'actor_funnel_1' },
					{ event: 'funnel_query_step_one', actor_id: 'actor_funnel_2' },
					{ event: 'funnel_query_step_two', actor_id: 'actor_funnel_1' }
				])
				const res = await api.post(
					'/admin/analytics/funnels',
					{ name: 'query_test_funnel', label: 'Query Test Funnel', steps: ['funnel_query_step_one', 'funnel_query_step_two'] },
					auth()
				)
				queryFunnelId = res.data.funnel.id
				await seedSnapshot()
			})

			it('GET /admin/analytics/funnel returns step counts and conversion rates for an explicit funnel_id', async () => {
				const start_date = new Date(Date.now() - 86400 * 1000).toISOString()
				const end_date = new Date(Date.now() + 86400 * 1000).toISOString()
				const res = await api.get(`/admin/analytics/funnel?funnel_id=${queryFunnelId}&start_date=${start_date}&end_date=${end_date}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.funnel.id).toBe(queryFunnelId)
				expect(res.data.results).toHaveLength(2)
				// Response contract: verifies AdminFunnelQueryResponse (src/admin/types/analytics.ts)
				// actually matches what the route returns.
				expect(() => AdminFunnelQueryResponseSchema.parse(res.data)).not.toThrow()
			})

			it('GET /admin/analytics/funnel 404s when no funnel_id is given and no default funnel exists', async () => {
				// No funnel in this suite is `is_default: true`, so the fallback lookup
				// in the route (`listAnalyticsFunnels({ is_default: true })`) finds nothing.
				const start_date = new Date(Date.now() - 86400 * 1000).toISOString()
				const end_date = new Date(Date.now() + 86400 * 1000).toISOString()
				const res = await api.get(`/admin/analytics/funnel?start_date=${start_date}&end_date=${end_date}`, auth()).catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})
		})

		// ── Admin Event Counts (route-only, no admin UI consumer yet) ────────────

		describe('Admin Event Counts', () => {
			beforeAll(async () => {
				const privateAnalytics: any = container.resolve(PRIVATE_ANALYTICS_MODULE)
				await privateAnalytics.trackEvent([
					{ event: 'counts_seed_event', actor_id: 'actor_counts_1' },
					{ event: 'counts_seed_event', actor_id: 'actor_counts_2' }
				])
				await seedSnapshot()
			})

			it('GET /admin/analytics/events/counts returns day-bucketed rollups', async () => {
				const start_date = new Date(Date.now() - 86400 * 1000).toISOString()
				const end_date = new Date(Date.now() + 86400 * 1000).toISOString()
				const res = await api.get(
					`/admin/analytics/events/counts?event=counts_seed_event&start_date=${start_date}&end_date=${end_date}&granularity=day`,
					auth()
				)
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.counts)).toBe(true)
				expect(res.data.counts.length).toBeGreaterThan(0)
				// Response contract: verifies the day-bucket rollup shape actually
				// returned by GET /admin/analytics/events/counts. No hand-written admin
				// type exists for this route yet -- see response-contracts.ts.
				expect(() => AdminEventCountsResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ── Admin Segments: preview + export (no admin UI yet) ───────────────────

		describe('Admin Segments preview + export', () => {
			let segmentId: string

			beforeAll(async () => {
				const privateAnalytics: any = container.resolve(PRIVATE_ANALYTICS_MODULE)
				await privateAnalytics.trackEvent([
					{ event: 'segment_seed_event', actor_id: 'actor_segment_1' },
					{ event: 'segment_seed_event', actor_id: 'actor_segment_2' }
				])
				await privateAnalytics.createAnalyticsIdentities({
					actor_id: 'actor_segment_1',
					customer_id: 'cus_segment_1',
					properties: { email: 'segment1@example.com' },
					last_seen_at: new Date()
				})
				const segRes = await api.post(
					'/admin/analytics/segments',
					{
						name: 'active_seed_segment',
						label: 'Active Seed Segment',
						rules: { operator: 'AND', conditions: [{ type: 'event_performed', event: 'segment_seed_event' }] }
					},
					auth()
				)
				segmentId = segRes.data.segment.id
				// `/preview` live-evaluates `rules` against `analytics_event`, but
				// `/export` reads the persisted `analytics_segment_membership` table
				// instead (see src/api/admin/analytics/segments/[id]/export/route.ts) --
				// that table is normally populated by a background evaluation job this
				// suite doesn't run, so membership rows are seeded directly here.
				await privateAnalytics.createAnalyticsSegmentMemberships([
					{ segment_id: segmentId, actor_id: 'actor_segment_1', evaluated_at: new Date() },
					{ segment_id: segmentId, actor_id: 'actor_segment_2', evaluated_at: new Date() }
				])
				await seedSnapshot()
			})

			it('GET /admin/analytics/segments/:id/preview live-evaluates the rules and returns a sample', async () => {
				const res = await api.get(`/admin/analytics/segments/${segmentId}/preview`, auth())
				expect(res.status).toBe(200)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.sample).toEqual(expect.arrayContaining(['actor_segment_1', 'actor_segment_2']))
				// Response contract: verifies the shape actually returned by
				// GET /admin/analytics/segments/:id/preview. No hand-written admin type
				// exists for this route yet -- see response-contracts.ts.
				expect(() => AdminSegmentPreviewResponseSchema.parse(res.data)).not.toThrow()
			})

			it('GET /admin/analytics/segments/:id/export returns CSV, not JSON', async () => {
				const res = await api.get(`/admin/analytics/segments/${segmentId}/export`, auth())
				expect(res.status).toBe(200)
				expect(res.headers['content-type']).toContain('text/csv')
				expect(typeof res.data).toBe('string')
				const [header, ...rows] = (res.data as string).trim().split('\n')
				expect(header).toBe('actor_id,customer_id,email,properties,evaluated_at')
				expect(rows.some(r => r.includes('actor_segment_1') && r.includes('segment1@example.com'))).toBe(true)
			})
		})
	}
})
