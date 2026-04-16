/**
 * Integration tests for the tracing module (stock-lot, serial-number, invalidation-reason).
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation
 *  - Full CRUD for stock lots (/admin/stock-lots)
 *  - Enable / disable bulk endpoints (/admin/stock-lots/enable, /admin/stock-lots/disable)
 *  - Serial numbers scoped to a stock lot (/admin/stock-lots/:id/serial-numbers)
 *  - Full CRUD for serial numbers (/admin/serial-numbers)
 *  - Full CRUD for invalidation reasons (/admin/invalidation-reasons)
 *  - q filter on all list endpoints
 *
 * NOTE: createStockLotWorkflow calls adjustInventoryLevelsStep, so real Medusa
 * inventory items and stock locations (with levels) are required. These are
 * created in the Stock Lots describe block's beforeAll and torn down in afterAll.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=stock-lots
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'stock-lot-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'stock-lot-test@example.com',
						first_name: 'StockLot',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'stock-lot-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const FAKE = 'nonexistent_id'
			const endpoints = [
				['GET', '/admin/stock-lots', null],
				['POST', '/admin/stock-lots', { inventory_item_id: 'x', stock_location_id: 'x', lot_number: 'x', stocked_quantity: 1 }],
				['DELETE', '/admin/stock-lots', { ids: [FAKE] }],
				['GET', `/admin/stock-lots/${FAKE}`, null],
				['POST', `/admin/stock-lots/${FAKE}`, { lot_number: 'x' }],
				['DELETE', `/admin/stock-lots/${FAKE}`, null],
				['POST', '/admin/stock-lots/enable', { ids: [FAKE] }],
				['POST', '/admin/stock-lots/disable', { ids: [FAKE] }],
				['GET', `/admin/stock-lots/${FAKE}/serial-numbers`, null],
				['GET', '/admin/serial-numbers', null],
				['POST', '/admin/serial-numbers', { order_id: 'x', stock_lot_id: 'x', value: 'SN001' }],
				['DELETE', '/admin/serial-numbers', { ids: [FAKE] }],
				['GET', `/admin/serial-numbers/${FAKE}`, null],
				['POST', `/admin/serial-numbers/${FAKE}`, { value: 'SN002' }],
				['DELETE', `/admin/serial-numbers/${FAKE}`, null],
				['GET', '/admin/invalidation-reasons', null],
				['POST', '/admin/invalidation-reasons', { value: 'x' }],
				['DELETE', '/admin/invalidation-reasons', { ids: [FAKE] }],
				['GET', `/admin/invalidation-reasons/${FAKE}`, null],
				['POST', `/admin/invalidation-reasons/${FAKE}`, { value: 'y' }],
				['DELETE', `/admin/invalidation-reasons/${FAKE}`, null]
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				let res: any
				if (method === 'GET') {
					res = await api.get(path).catch((e: any) => e.response)
				} else if (method === 'DELETE') {
					res = await api.delete(path, { data: body }).catch((e: any) => e.response)
				} else {
					res = await api.post(path, body).catch((e: any) => e.response)
				}
				expect(res.status).toBe(401)
			})
		})

		// ── Validation ────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('POST /admin/stock-lots rejects missing inventory_item_id', async () => {
				const res = await api
					.post('/admin/stock-lots', { stock_location_id: 'x', lot_number: 'x', stocked_quantity: 1 }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/stock-lots rejects missing stock_location_id', async () => {
				const res = await api
					.post('/admin/stock-lots', { inventory_item_id: 'x', lot_number: 'x', stocked_quantity: 1 }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/stock-lots rejects missing lot_number', async () => {
				const res = await api
					.post('/admin/stock-lots', { inventory_item_id: 'x', stock_location_id: 'x', stocked_quantity: 1 }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/stock-lots rejects missing both initial_quantity and stocked_quantity', async () => {
				const res = await api
					.post('/admin/stock-lots', { inventory_item_id: 'x', stock_location_id: 'x', lot_number: 'x' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/stock-lots rejects mismatched initial_quantity and stocked_quantity', async () => {
				const res = await api
					.post(
						'/admin/stock-lots',
						{ inventory_item_id: 'x', stock_location_id: 'x', lot_number: 'x', initial_quantity: 10, stocked_quantity: 20 },
						auth()
					)
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/stock-lots rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/stock-lots', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/serial-numbers rejects missing value', async () => {
				const res = await api
					.post('/admin/serial-numbers', { order_id: 'o', stock_lot_id: 's' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/serial-numbers rejects missing stock_lot_id', async () => {
				const res = await api
					.post('/admin/serial-numbers', { order_id: 'o', value: 'SN001' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/serial-numbers rejects missing order_id', async () => {
				const res = await api
					.post('/admin/serial-numbers', { stock_lot_id: 's', value: 'SN001' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/serial-numbers rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/serial-numbers', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/invalidation-reasons rejects missing value', async () => {
				const res = await api
					.post('/admin/invalidation-reasons', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/invalidation-reasons rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/invalidation-reasons', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Invalidation Reasons ──────────────────────────────────────────────────

		describe('Invalidation Reasons', () => {
			let reasonId: string
			let reasonId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post('/admin/invalidation-reasons', { value: `damaged-${ts}` }, auth()),
					api.post('/admin/invalidation-reasons', { value: `expired-${ts}` }, auth())
				])
				reasonId = r1.data.invalidation_reason.id
				reasonId2 = r2.data.invalidation_reason.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/invalidation-reasons', { data: { ids: [reasonId, reasonId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/invalidation-reasons creates a reason', async () => {
				const ts = Date.now()
				const res = await api.post('/admin/invalidation-reasons', { value: `temp-${ts}` }, auth())
				expect(res.status).toBe(200)
				expect(res.data.invalidation_reason).toMatchObject({
					id: expect.any(String),
					value: `temp-${ts}`
				})
				await api
					.delete('/admin/invalidation-reasons', {
						data: { ids: [res.data.invalidation_reason.id] },
						...auth()
					})
					.catch(() => {})
			})

			it('GET /admin/invalidation-reasons lists reasons', async () => {
				const res = await api.get('/admin/invalidation-reasons', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.invalidation_reasons)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/invalidation-reasons filters by q', async () => {
				const res = await api.get('/admin/invalidation-reasons?q=damaged', auth())
				expect(res.status).toBe(200)
				expect(res.data.invalidation_reasons.every((r: any) => r.value.includes('damaged'))).toBe(true)
			})

			it('GET /admin/invalidation-reasons/:id retrieves a single reason', async () => {
				const res = await api.get(`/admin/invalidation-reasons/${reasonId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.invalidation_reason.id).toBe(reasonId)
			})

			it('POST /admin/invalidation-reasons/:id updates a reason', async () => {
				const ts = Date.now()
				const res = await api.post(
					`/admin/invalidation-reasons/${reasonId}`,
					{ value: `damaged-updated-${ts}` },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.invalidation_reason.value).toBe(`damaged-updated-${ts}`)
			})

			it('DELETE /admin/invalidation-reasons/:id deletes a single reason', async () => {
				const ts = Date.now()
				const created = await api.post('/admin/invalidation-reasons', { value: `to-delete-${ts}` }, auth())
				const id = created.data.invalidation_reason.id

				const res = await api.delete(`/admin/invalidation-reasons/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/invalidation-reasons bulk deletes reasons', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post('/admin/invalidation-reasons', { value: `bulk-a-${ts}` }, auth()),
					api.post('/admin/invalidation-reasons', { value: `bulk-b-${ts}` }, auth())
				])
				const ids = [a.data.invalidation_reason.id, b.data.invalidation_reason.id]

				const res = await api.delete('/admin/invalidation-reasons', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})

		// ── Stock Lots ────────────────────────────────────────────────────────────

		describe('Stock Lots', () => {
			let stockLotId: string
			let stockLotId2: string
			let inventoryItemId: string
			let stockLocationId: string

			beforeAll(async () => {
				const ts = Date.now()

				// Create a stock location
				const locationRes = await api.post(
					'/admin/stock-locations',
					{ name: `StockLot Test Warehouse ${ts}` },
					auth()
				)
				stockLocationId = locationRes.data.stock_location.id

				// Create an inventory item
				const itemRes = await api.post(
					'/admin/inventory-items',
					{ sku: `SL-TEST-${ts}`, title: `StockLot Test Item ${ts}` },
					auth()
				)
				inventoryItemId = itemRes.data.inventory_item.id

				// Create an inventory level so adjustInventoryLevelsStep has something to work with
				await api.post(
					`/admin/inventory-items/${inventoryItemId}/location-levels`,
					{ location_id: stockLocationId, stocked_quantity: 0 },
					auth()
				)

				// Create two stock lots for use across tests
				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/stock-lots',
						{
							inventory_item_id: inventoryItemId,
							stock_location_id: stockLocationId,
							lot_number: `LOT-A-${ts}`,
							stocked_quantity: 50
						},
						auth()
					),
					api.post(
						'/admin/stock-lots',
						{
							inventory_item_id: inventoryItemId,
							stock_location_id: stockLocationId,
							lot_number: `LOT-B-${ts}`,
							stocked_quantity: 30
						},
						auth()
					)
				])
				stockLotId = r1.data.stock_lot.id
				stockLotId2 = r2.data.stock_lot.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/stock-lots', { data: { ids: [stockLotId, stockLotId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/stock-lots creates a stock lot', async () => {
				const res = await api.get(`/admin/stock-lots/${stockLotId}`, auth())
				expect(res.data.stock_lot).toMatchObject({
					id: stockLotId,
					inventory_item_id: inventoryItemId,
					stock_location_id: stockLocationId,
					stocked_quantity: 50,
					enabled: true
				})
			})

			it('POST /admin/stock-lots accepts only initial_quantity (mirrors to stocked_quantity)', async () => {
				const ts = Date.now()
				const res = await api.post(
					'/admin/stock-lots',
					{
						inventory_item_id: inventoryItemId,
						stock_location_id: stockLocationId,
						lot_number: `LOT-INIT-${ts}`,
						initial_quantity: 10
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.stock_lot.stocked_quantity).toBe(10)
				await api
					.delete('/admin/stock-lots', { data: { ids: [res.data.stock_lot.id] }, ...auth() })
					.catch(() => {})
			})

			it('GET /admin/stock-lots lists stock lots', async () => {
				const res = await api.get('/admin/stock-lots', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.stock_lots)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/stock-lots filters by inventory_item_id', async () => {
				const res = await api.get(
					`/admin/stock-lots?inventory_item_id=${inventoryItemId}`,
					auth()
				)
				expect(res.status).toBe(200)
				expect(
					res.data.stock_lots.every((s: any) => s.inventory_item_id === inventoryItemId)
				).toBe(true)
			})

			it('GET /admin/stock-lots filters by enabled=true', async () => {
				const res = await api.get('/admin/stock-lots?enabled=true', auth())
				expect(res.status).toBe(200)
				expect(res.data.stock_lots.every((s: any) => s.enabled === true)).toBe(true)
			})

			it('GET /admin/stock-lots filters by q (lot_number search)', async () => {
				const res = await api.get('/admin/stock-lots?q=LOT-A', auth())
				expect(res.status).toBe(200)
				expect(res.data.stock_lots.some((s: any) => s.lot_number.includes('LOT-A'))).toBe(true)
			})

			it('GET /admin/stock-lots/:id retrieves a single stock lot', async () => {
				const res = await api.get(`/admin/stock-lots/${stockLotId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.stock_lot.id).toBe(stockLotId)
			})

			it('POST /admin/stock-lots/:id updates a stock lot', async () => {
				const res = await api.post(
					`/admin/stock-lots/${stockLotId}`,
					{ description: 'Updated description' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.stock_lot.description).toBe('Updated description')
			})

			it('DELETE /admin/stock-lots/:id deletes a single stock lot', async () => {
				const ts = Date.now()
				const created = await api.post(
					'/admin/stock-lots',
					{
						inventory_item_id: inventoryItemId,
						stock_location_id: stockLocationId,
						lot_number: `LOT-DEL-${ts}`,
						stocked_quantity: 5
					},
					auth()
				)
				const id = created.data.stock_lot.id

				const res = await api.delete(`/admin/stock-lots/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.stock_lot.id).toBe(id)
			})

			it('DELETE /admin/stock-lots bulk deletes stock lots', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post(
						'/admin/stock-lots',
						{
							inventory_item_id: inventoryItemId,
							stock_location_id: stockLocationId,
							lot_number: `LOT-BULK-A-${ts}`,
							stocked_quantity: 1
						},
						auth()
					),
					api.post(
						'/admin/stock-lots',
						{
							inventory_item_id: inventoryItemId,
							stock_location_id: stockLocationId,
							lot_number: `LOT-BULK-B-${ts}`,
							stocked_quantity: 1
						},
						auth()
					)
				])
				const ids = [a.data.stock_lot.id, b.data.stock_lot.id]

				const res = await api.delete('/admin/stock-lots', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			// ── Enable / Disable ──────────────────────────────────────────────────

			describe('Enable / Disable', () => {
				it('POST /admin/stock-lots/disable disables stock lots', async () => {
					const res = await api.post(
						'/admin/stock-lots/disable',
						{ ids: [stockLotId2] },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.disabled).toContain(stockLotId2)

					const check = await api.get(`/admin/stock-lots/${stockLotId2}`, auth())
					expect(check.data.stock_lot.enabled).toBe(false)
				})

				it('GET /admin/stock-lots filters by enabled=false', async () => {
					const res = await api.get('/admin/stock-lots?enabled=false', auth())
					expect(res.status).toBe(200)
					expect(res.data.stock_lots.every((s: any) => s.enabled === false)).toBe(true)
					expect(res.data.stock_lots.some((s: any) => s.id === stockLotId2)).toBe(true)
				})

				it('POST /admin/stock-lots/enable re-enables stock lots', async () => {
					const res = await api.post(
						'/admin/stock-lots/enable',
						{ ids: [stockLotId2] },
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.enabled).toContain(stockLotId2)

					const check = await api.get(`/admin/stock-lots/${stockLotId2}`, auth())
					expect(check.data.stock_lot.enabled).toBe(true)
				})
			})

			// ── Serial Numbers scoped to a stock lot ──────────────────────────────

			describe('Serial numbers scoped to stock lot', () => {
				let serialNumberId: string

				beforeAll(async () => {
					const res = await api.post(
						'/admin/serial-numbers',
						{ order_id: 'ord_test_sl_001', stock_lot_id: stockLotId, value: 'SN-SCOPED-001' },
						auth()
					)
					serialNumberId = res.data.serial_number.id
				})

				afterAll(async () => {
					await api
						.delete('/admin/serial-numbers', { data: { ids: [serialNumberId] }, ...auth() })
						.catch(() => {})
				})

				it('GET /admin/stock-lots/:id/serial-numbers lists serial numbers for the lot', async () => {
					const res = await api.get(`/admin/stock-lots/${stockLotId}/serial-numbers`, auth())
					expect(res.status).toBe(200)
					expect(Array.isArray(res.data.serial_numbers)).toBe(true)
					expect(res.data.serial_numbers.some((sn: any) => sn.id === serialNumberId)).toBe(true)
				})

				it('GET /admin/stock-lots/:id/serial-numbers returns empty for a lot with no serial numbers', async () => {
					const res = await api.get(
						`/admin/stock-lots/${stockLotId2}/serial-numbers`,
						auth()
					)
					expect(res.status).toBe(200)
					expect(res.data.serial_numbers).toHaveLength(0)
				})
			})
		})

		// ── Serial Numbers ────────────────────────────────────────────────────────

		describe('Serial Numbers', () => {
			let serialNumberId: string
			let serialNumberId2: string
			let stockLotId: string
			let inventoryItemId: string
			let stockLocationId: string

			beforeAll(async () => {
				const ts = Date.now()

				// Stand-alone stock location + inventory item + level for this suite
				const [locationRes, itemRes] = await Promise.all([
					api.post('/admin/stock-locations', { name: `SN Test Warehouse ${ts}` }, auth()),
					api.post(
						'/admin/inventory-items',
						{ sku: `SN-TEST-${ts}`, title: `SN Test Item ${ts}` },
						auth()
					)
				])
				stockLocationId = locationRes.data.stock_location.id
				inventoryItemId = itemRes.data.inventory_item.id

				await api.post(
					`/admin/inventory-items/${inventoryItemId}/location-levels`,
					{ location_id: stockLocationId, stocked_quantity: 0 },
					auth()
				)

				const lotRes = await api.post(
					'/admin/stock-lots',
					{
						inventory_item_id: inventoryItemId,
						stock_location_id: stockLocationId,
						lot_number: `SN-LOT-${ts}`,
						stocked_quantity: 100
					},
					auth()
				)
				stockLotId = lotRes.data.stock_lot.id

				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/serial-numbers',
						{ order_id: 'ord_sn_test_001', stock_lot_id: stockLotId, value: `SN-001-${ts}` },
						auth()
					),
					api.post(
						'/admin/serial-numbers',
						{ order_id: 'ord_sn_test_001', stock_lot_id: stockLotId, value: `SN-002-${ts}` },
						auth()
					)
				])
				serialNumberId = r1.data.serial_number.id
				serialNumberId2 = r2.data.serial_number.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/serial-numbers', {
						data: { ids: [serialNumberId, serialNumberId2] },
						...auth()
					})
					.catch(() => {})
				await api
					.delete('/admin/stock-lots', { data: { ids: [stockLotId] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/serial-numbers creates a serial number', async () => {
				const res = await api.get(`/admin/serial-numbers/${serialNumberId}`, auth())
				expect(res.data.serial_number).toMatchObject({
					id: serialNumberId,
					stock_lot_id: stockLotId,
					invalidated: false
				})
			})

			it('GET /admin/serial-numbers lists serial numbers', async () => {
				const res = await api.get('/admin/serial-numbers', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.serial_numbers)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/serial-numbers filters by stock_lot_id', async () => {
				const res = await api.get(`/admin/serial-numbers?stock_lot_id=${stockLotId}`, auth())
				expect(res.status).toBe(200)
				expect(
					res.data.serial_numbers.every((sn: any) => sn.stock_lot_id === stockLotId)
				).toBe(true)
			})

			it('GET /admin/serial-numbers filters by invalidated=false', async () => {
				const res = await api.get('/admin/serial-numbers?invalidated=false', auth())
				expect(res.status).toBe(200)
				expect(res.data.serial_numbers.every((sn: any) => sn.invalidated === false)).toBe(true)
			})

			it('GET /admin/serial-numbers filters by q (value search)', async () => {
				const res = await api.get('/admin/serial-numbers?q=SN-001', auth())
				expect(res.status).toBe(200)
				expect(res.data.serial_numbers.some((sn: any) => sn.value.includes('SN-001'))).toBe(true)
			})

			it('GET /admin/serial-numbers/:id retrieves a single serial number', async () => {
				const res = await api.get(`/admin/serial-numbers/${serialNumberId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.serial_number.id).toBe(serialNumberId)
			})

			it('POST /admin/serial-numbers/:id updates a serial number (marks invalidated)', async () => {
				const res = await api.post(
					`/admin/serial-numbers/${serialNumberId}`,
					{ invalidated: true },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.serial_number.invalidated).toBe(true)

				// Restore
				await api.post(`/admin/serial-numbers/${serialNumberId}`, { invalidated: false }, auth())
			})

			it('GET /admin/serial-numbers filters by invalidated=true', async () => {
				// Invalidate one
				await api.post(`/admin/serial-numbers/${serialNumberId2}`, { invalidated: true }, auth())

				const res = await api.get('/admin/serial-numbers?invalidated=true', auth())
				expect(res.status).toBe(200)
				expect(res.data.serial_numbers.every((sn: any) => sn.invalidated === true)).toBe(true)
				expect(res.data.serial_numbers.some((sn: any) => sn.id === serialNumberId2)).toBe(true)

				// Restore
				await api.post(`/admin/serial-numbers/${serialNumberId2}`, { invalidated: false }, auth())
			})

			it('DELETE /admin/serial-numbers/:id deletes a single serial number', async () => {
				const ts = Date.now()
				const created = await api.post(
					'/admin/serial-numbers',
					{ order_id: 'ord_sn_test_001', stock_lot_id: stockLotId, value: `SN-DEL-${ts}` },
					auth()
				)
				const id = created.data.serial_number.id

				const res = await api.delete(`/admin/serial-numbers/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/serial-numbers bulk deletes serial numbers', async () => {
				const ts = Date.now()
				const [a, b] = await Promise.all([
					api.post(
						'/admin/serial-numbers',
						{ order_id: 'ord_sn_test_001', stock_lot_id: stockLotId, value: `SN-BULK-A-${ts}` },
						auth()
					),
					api.post(
						'/admin/serial-numbers',
						{ order_id: 'ord_sn_test_001', stock_lot_id: stockLotId, value: `SN-BULK-B-${ts}` },
						auth()
					)
				])
				const ids = [a.data.serial_number.id, b.data.serial_number.id]

				const res = await api.delete('/admin/serial-numbers', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})
	}
})
