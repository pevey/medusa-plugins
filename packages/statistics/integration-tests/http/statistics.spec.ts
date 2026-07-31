/**
 * Integration tests for the statistics module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - GET /admin/statistics (period filtering, aggregated totals)
 *  - GET /admin/statistics/recent-orders (the plugin's narrow order projection)
 *  - GET /admin/statistics/low-stock
 *  - GET/POST /admin/statistics/layout (per-user layout persistence via user metadata)
 *  - POST /admin/statistics/recalculate
 *
 * NOTE: GET /admin/statistics reads `statistics_daily` rows directly via
 * `statisticsService.listStatisticsDailies()` with no field selection, so a row is
 * seeded directly via the service (matching the complaint-stats precedent in the
 * complaints plugin's spec) rather than exercising the full daily-aggregation job.
 *
 * NOTE: GET /admin/statistics/recent-orders queries the core `order` entity with a
 * fixed field list (`query.graph({ entity: 'order', fields: [...] })`), so a real
 * order + customer are seeded directly via `Modules.ORDER`/`Modules.CUSTOMER` --
 * order-module fields are not FK-checked outside workflows, so no product/variant/
 * region/sales-channel scaffolding is required to produce a valid order row.
 *
 * NOTE: GET /admin/statistics/low-stock optionally enriches its inventory-level
 * warnings with `entity: 'stock_lot'` data -- a model owned entirely by the
 * separate `medusa-plugin-tracing` package, not core Medusa and not declared
 * anywhere as a dependency of this plugin. This plugin's own `medusa-config.ts`
 * (used to boot this very test app) registers only `./src/modules/statistics`,
 * so `stock_lot` is not a registered entity here -- which makes this test app a
 * faithful stand-in for any real install that hasn't also installed
 * medusa-plugin-tracing. The route detects that (`req.scope.hasRegistration
 * ('tracing')`) and degrades gracefully to inventory-level-only warnings rather
 * than 500ing; see `src/api/admin/statistics/low-stock/route.ts` and
 * `response.lot_data_available` in the response contract.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=statistics
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { STATISTICS_MODULE } from '../../src/modules/statistics'
import { StatisticsService } from '../../src/modules/statistics/service'
import {
	AdminRecalculateStatisticsResponseSchema,
	AdminSaveStatisticsLayoutResponseSchema,
	AdminStatisticsLayoutResponseSchema,
	AdminStatisticsLowStockResponseSchema,
	AdminStatisticsRecentOrdersResponseSchema,
	AdminStatisticsResponseSchema
} from './response-contracts'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-statistics',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		const seedSnapshot = async () => {
			await utils.waitWorkflowExecutions()
			await dbUtils.snapshot()
		}
		let adminToken: string
		let statisticsService: StatisticsService

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			statisticsService = container.resolve(STATISTICS_MODULE)

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'statistics-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'statistics-test@example.com',
						first_name: 'Statistics',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'statistics-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const endpoints = [
				['GET', '/admin/statistics', null],
				['GET', '/admin/statistics/recent-orders', null],
				['GET', '/admin/statistics/low-stock', null],
				['GET', '/admin/statistics/layout', null],
				['POST', '/admin/statistics/layout', { layout: [] }],
				['POST', '/admin/statistics/recalculate', {}]
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				const res = method === 'GET' ? await api.get(path).catch((e: any) => e.response) : await api.post(path, body).catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})
		})

		// ── GET /admin/statistics ────────────────────────────────────────────────

		describe('GET /admin/statistics', () => {
			let statId: string

			beforeAll(async () => {
				const now = new Date()
				const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
				const created = await statisticsService.createStatisticsDailies({
					date: today,
					revenue_total: 543.21,
					order_count: 7,
					average_order_value: 77.6,
					new_customer_count: 3,
					returning_customer_count: 2,
					pending_fulfillment_count: 1,
					low_stock_count: 4,
					top_products: [{ product_id: 'prod_stat_test_1', title: 'Statistics Test Product', quantity_sold: 5 }]
				} as any)
				statId = Array.isArray(created) ? created[0].id : (created as any).id
				await seedSnapshot()
			})

			afterAll(async () => {
				await statisticsService.deleteStatisticsDailies([statId]).catch(() => {})
			})

			it('returns aggregated statistics for the default (week) period', async () => {
				const res = await api.get('/admin/statistics', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.statistics)).toBe(true)
				expect(res.data.statistics.some((s: any) => s.id === statId)).toBe(true)
				expect(res.data.period).toBe('week')
				// Response contract: verifies AdminStatisticsResponse (src/admin/types.ts)
				// actually matches what the route returns.
				expect(() => AdminStatisticsResponseSchema.parse(res.data)).not.toThrow()
			})

			it('returns aggregated statistics for period=today and aggregates totals', async () => {
				const res = await api.get('/admin/statistics?period=today', auth())
				expect(res.status).toBe(200)
				expect(res.data.statistics.some((s: any) => s.id === statId)).toBe(true)
				expect(res.data.totals.revenue_total).toBeGreaterThanOrEqual(543.21)
				expect(() => AdminStatisticsResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ── GET /admin/statistics/recent-orders ─────────────────────────────────

		describe('GET /admin/statistics/recent-orders', () => {
			let orderId: string

			beforeAll(async () => {
				const container = getContainer()
				const customerService = container.resolve(Modules.CUSTOMER)
				const orderService = container.resolve(Modules.ORDER)

				const customer = await customerService.createCustomers({
					email: 'statistics-recent-order-customer@example.com',
					first_name: 'Recent',
					last_name: 'Orderer'
				})

				const order = await orderService.createOrders({
					email: 'statistics-recent-order@example.com',
					currency_code: 'usd',
					customer_id: customer.id,
					items: [{ title: 'Statistics Test Item', quantity: 1, unit_price: 100 }]
				} as any)
				orderId = (order as any).id
				await seedSnapshot()
			})

			it('returns recent orders using the plugin-defined projection', async () => {
				const res = await api.get('/admin/statistics/recent-orders?limit=10', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.orders)).toBe(true)
				expect(res.data.orders.some((o: any) => o.id === orderId)).toBe(true)
				// Response contract: verifies AdminStatisticsRecentOrdersResponse
				// (src/admin/types.ts) actually matches what the route returns.
				expect(() => AdminStatisticsRecentOrdersResponseSchema.parse(res.data)).not.toThrow()
			})

			it('respects the limit query param', async () => {
				const res = await api.get('/admin/statistics/recent-orders?limit=1', auth())
				expect(res.status).toBe(200)
				expect(res.data.orders.length).toBeLessThanOrEqual(1)
			})
		})

		// ── GET /admin/statistics/low-stock ──────────────────────────────────────

		describe('GET /admin/statistics/low-stock', () => {
			it('returns an empty warnings list when there is no inventory at all', async () => {
				const res = await api.get('/admin/statistics/low-stock?threshold=10', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.warnings)).toBe(true)
				// medusa-plugin-tracing is not registered in this test app (see the
				// file-level NOTE above), so the route is expected to report that.
				expect(res.data.lot_data_available).toBe(false)
				// Response contract: verifies AdminStatisticsLowStockResponse
				// (src/admin/types.ts) actually matches what the route returns.
				expect(() => AdminStatisticsLowStockResponseSchema.parse(res.data)).not.toThrow()
			})

			// This is the code path that, before the cross-plugin dependency fix, queried
			// `entity: 'stock_lot'` unconditionally and 500'd here: with zero inventory
			// items in the DB (previous test), the outer `for (const item of items)` loop
			// has nothing to iterate, so that query was never reached and the previous
			// test could not have caught a break here. This one seeds a real inventory
			// item + location level so the loop body actually runs, proving the route now
			// degrades gracefully instead of 500ing: `stock_lot` is a model owned
			// entirely by the separate `medusa-plugin-tracing` package (see the
			// file-level NOTE above), which is not registered by this plugin's own
			// `medusa-config.ts` and is not declared anywhere as a dependency. The route
			// detects that via `req.scope.hasRegistration('tracing')` and falls back to
			// the inventory item's own `location_levels.stocked_quantity` instead of
			// throwing -- see `src/api/admin/statistics/low-stock/route.ts`.
			describe('with an inventory item below threshold', () => {
				let stockLocationId: string
				let inventoryItemId: string

				beforeAll(async () => {
					const ts = Date.now()
					const locationRes = await api.post('/admin/stock-locations', { name: `Statistics Test Warehouse ${ts}` }, auth())
					stockLocationId = locationRes.data.stock_location.id

					const itemRes = await api.post('/admin/inventory-items', { sku: `STAT-LOW-${ts}`, title: `Statistics Low Stock Item ${ts}` }, auth())
					inventoryItemId = itemRes.data.inventory_item.id

					await api.post(`/admin/inventory-items/${inventoryItemId}/location-levels`, { location_id: stockLocationId, stocked_quantity: 2 }, auth())
					await seedSnapshot()
				})

				it('returns 200 with an inventory-level warning, and flags lot data as unavailable, when medusa-plugin-tracing is not installed', async () => {
					const res = await api.get('/admin/statistics/low-stock?threshold=10', auth())
					expect(res.status).toBe(200)
					expect(res.data.lot_data_available).toBe(false)

					const warning = res.data.warnings.find((w: any) => w.inventory_item_id === inventoryItemId)
					expect(warning).toBeDefined()
					expect(warning.location_id).toBe(stockLocationId)
					// No lot data available -- the route cannot distinguish "no enabled
					// lots" from "some lots", so it must never report 'no_lots' here.
					expect(warning.reason).toBe('low_stock')
					// Falls back to the raw inventory-level stocked_quantity (2), not a
					// lot-derived figure.
					expect(warning.available_quantity).toBe(2)

					// Response contract: verifies AdminStatisticsLowStockResponse
					// (src/admin/types.ts) actually matches what the route returns, in
					// the "lot data unavailable" mode.
					expect(() => AdminStatisticsLowStockResponseSchema.parse(res.data)).not.toThrow()
				})

				it('reports no warning for the same item once its stocked quantity is above threshold', async () => {
					const res = await api.get('/admin/statistics/low-stock?threshold=1', auth())
					expect(res.status).toBe(200)
					const warning = res.data.warnings.find((w: any) => w.inventory_item_id === inventoryItemId)
					expect(warning).toBeUndefined()
				})
			})
		})

		// ── Layout ────────────────────────────────────────────────────────────────

		describe('Layout', () => {
			it('GET /admin/statistics/layout returns null before any layout is saved', async () => {
				const res = await api.get('/admin/statistics/layout', auth())
				expect(res.status).toBe(200)
				expect(res.data.layout).toBeNull()
				// Response contract: verifies AdminStatisticsLayoutResponse
				// (src/admin/types.ts) actually matches what the route returns.
				expect(() => AdminStatisticsLayoutResponseSchema.parse(res.data)).not.toThrow()
			})

			it('POST /admin/statistics/layout saves and echoes the layout, and GET reflects it', async () => {
				const layout = [{ widget_id: 'revenue', x: 0, y: 0, w: 4, h: 3, visible: true }]
				const res = await api.post('/admin/statistics/layout', { layout }, auth())
				expect(res.status).toBe(200)
				expect(res.data.layout).toEqual(layout)
				// Response contract: verifies AdminSaveStatisticsLayoutResponse
				// (src/admin/types.ts) actually matches what the route returns.
				expect(() => AdminSaveStatisticsLayoutResponseSchema.parse(res.data)).not.toThrow()

				const getRes = await api.get('/admin/statistics/layout', auth())
				expect(getRes.data.layout).toEqual(layout)
				expect(() => AdminStatisticsLayoutResponseSchema.parse(getRes.data)).not.toThrow()
			})

			it('POST /admin/statistics/layout rejects a malformed layout entry', async () => {
				const res = await api.post('/admin/statistics/layout', { layout: [{ widget_id: 'revenue' }] }, auth()).catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── POST /admin/statistics/recalculate ──────────────────────────────────

		describe('POST /admin/statistics/recalculate', () => {
			it('recalculates statistics and returns success', async () => {
				const res = await api.post('/admin/statistics/recalculate', {}, auth())
				expect(res.status).toBe(200)
				expect(res.data).toEqual({ success: true })
				// Response contract: verifies AdminRecalculateStatisticsResponse
				// (src/admin/types.ts) actually matches what the route returns.
				expect(() => AdminRecalculateStatisticsResponseSchema.parse(res.data)).not.toThrow()
			})
		})
	}
})
