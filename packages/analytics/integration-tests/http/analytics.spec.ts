/**
 * Integration tests for the analytics plugin HTTP surface.
 *
 * - Admin route auth guard.
 * - Store `/store/ping` ingestion: single event (backward compatible) and the
 *   batch array form, proving `validateAndTransformBody` accepts a top-level
 *   array and the route fans it out.
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
import { createSalesChannelsWorkflow, createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow } from '@medusajs/medusa/core-flows'
import { PRIVATE_ANALYTICS_MODULE } from '../../src/modules/analytics'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-analytics',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		let container: any

		// Re-snapshot the DB template so seeded rows survive the per-test restore.
		const seedSnapshot = async () => {
			await utils.waitWorkflowExecutions()
			await dbUtils.snapshot()
		}

		beforeAll(() => {
			container = getContainer()
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
	}
})
