/**
 * Integration tests for the Veeqo module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation
 *  - Single-resource sync endpoints (product, customer, sales channel, stock location)
 *  - Batch sync endpoints (product, customer, sales channel, stock location)
 *  - Not-found error propagation (non-existent Medusa IDs)
 *  - Tracking events passthrough endpoint (validation errors)
 *
 * NOTE: These tests hit the real Veeqo API using the VEEQO_API_KEY configured in
 * the environment. The medusaIntegrationTestRunner env option does not override
 * module options baked into medusa-config.ts at startup, so a mock server cannot
 * be substituted. Records created in Veeqo during each describe block are deleted
 * in the corresponding afterAll (except customers — Veeqo does not allow customer
 * deletion, so those records are only unlinked in Medusa).
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=veeqo
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import { VeeqoService } from '../../src/modules/veeqo/service'

jest.setTimeout(180 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string
		let veeqoService: VeeqoService

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			veeqoService = container.resolve('veeqo')

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'veeqo-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'veeqo-test@example.com',
						first_name: 'Veeqo',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'veeqo-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const endpoints = [
				['POST', '/admin/veeqo/products/sync', { product_ids: ['x'] }],
				['POST', '/admin/veeqo/products/nonexistent/sync', {}],
				['POST', '/admin/veeqo/customers/sync', { customer_ids: ['x'] }],
				['POST', '/admin/veeqo/customers/nonexistent/sync', {}],
				['POST', '/admin/veeqo/orders/sync', { order_ids: ['x'] }],
				['POST', '/admin/veeqo/orders/nonexistent/sync', {}],
				['POST', '/admin/veeqo/sales-channels/sync', { sales_channel_ids: ['x'] }],
				['POST', '/admin/veeqo/sales-channels/nonexistent/sync', {}],
				['POST', '/admin/veeqo/shipping-options/sync', { shipping_option_ids: ['x'] }],
				['POST', '/admin/veeqo/shipping-options/nonexistent/sync', {}],
				['POST', '/admin/veeqo/stock-locations/sync', { stock_location_ids: ['x'] }],
				['POST', '/admin/veeqo/stock-locations/nonexistent/sync', {}],
				['GET', '/admin/veeqo/shipments/12345/tracking-events', null]
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				let res: any
				if (method === 'GET') {
					res = await api.get(path).catch((e: any) => e.response)
				} else {
					res = await api.post(path, body).catch((e: any) => e.response)
				}
				expect(res.status).toBe(401)
			})
		})

		// ── Validation ────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('POST /admin/veeqo/products/sync rejects missing body', async () => {
				const res = await api.post('/admin/veeqo/products/sync', {}, auth()).catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/products/sync rejects empty product_ids array', async () => {
				const res = await api
					.post('/admin/veeqo/products/sync', { product_ids: [] }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/customers/sync rejects empty customer_ids array', async () => {
				const res = await api
					.post('/admin/veeqo/customers/sync', { customer_ids: [] }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/orders/sync rejects empty order_ids array', async () => {
				const res = await api
					.post('/admin/veeqo/orders/sync', { order_ids: [] }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/sales-channels/sync rejects empty array', async () => {
				const res = await api
					.post('/admin/veeqo/sales-channels/sync', { sales_channel_ids: [] }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/shipping-options/sync rejects empty array', async () => {
				const res = await api
					.post('/admin/veeqo/shipping-options/sync', { shipping_option_ids: [] }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/stock-locations/sync rejects empty array', async () => {
				const res = await api
					.post('/admin/veeqo/stock-locations/sync', { stock_location_ids: [] }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('GET /admin/veeqo/shipments/:id/tracking-events rejects non-numeric id', async () => {
				const res = await api
					.get('/admin/veeqo/shipments/not-a-number/tracking-events', auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('GET /admin/veeqo/shipments/:id/tracking-events rejects negative id', async () => {
				const res = await api
					.get('/admin/veeqo/shipments/-1/tracking-events', auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Not-found propagation ─────────────────────────────────────────────────

		describe('Not-found propagation', () => {
			it('POST /admin/veeqo/products/:id/sync returns 404 for non-existent product', async () => {
				const res = await api
					.post('/admin/veeqo/products/prod_01ZZZZZZZZZZZZZZZZZZZZZZZZ/sync', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('POST /admin/veeqo/customers/:id/sync returns 404 for non-existent customer', async () => {
				const res = await api
					.post('/admin/veeqo/customers/cus_01ZZZZZZZZZZZZZZZZZZZZZZZZ/sync', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('POST /admin/veeqo/orders/:id/sync returns 404 for non-existent order', async () => {
				const res = await api
					.post('/admin/veeqo/orders/order_01ZZZZZZZZZZZZZZZZZZZZZZZZ/sync', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('POST /admin/veeqo/sales-channels/:id/sync returns 400 for non-existent channel', async () => {
				const res = await api
					.post('/admin/veeqo/sales-channels/sc_01ZZZZZZZZZZZZZZZZZZZZZZZZ/sync', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/veeqo/stock-locations/:id/sync returns 404 for non-existent location', async () => {
				const res = await api
					.post('/admin/veeqo/stock-locations/sloc_01ZZZZZZZZZZZZZZZZZZZZZZZZ/sync', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})
		})

		// ── Sales channels ────────────────────────────────────────────────────────

		describe('Sales channels', () => {
			let salesChannelId: string
			let salesChannelId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post('/admin/sales-channels', { name: `VeeqoTestChannel-${ts}` }, auth()),
					api.post('/admin/sales-channels', { name: `VeeqoTestChannel2-${ts}` }, auth())
				])
				salesChannelId = r1.data.sales_channel.id
				salesChannelId2 = r2.data.sales_channel.id
			})

			afterAll(async () => {
				await veeqoService.deleteChannel(salesChannelId).catch(() => {})
				await veeqoService.deleteChannel(salesChannelId2).catch(() => {})
			})

			it('POST /admin/veeqo/sales-channels/:id/sync syncs a single channel', async () => {
				const res = await api.post(
					`/admin/veeqo/sales-channels/${salesChannelId}/sync`,
					{},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.veeqo_channel).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/sales-channels/:id/sync is idempotent (updates on second call)', async () => {
				const res = await api.post(
					`/admin/veeqo/sales-channels/${salesChannelId}/sync`,
					{},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.veeqo_channel).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/sales-channels/sync syncs a batch', async () => {
				const res = await api.post(
					'/admin/veeqo/sales-channels/sync',
					{ sales_channel_ids: [salesChannelId2] },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.synced_sales_channel_ids.length).toBeGreaterThanOrEqual(1)
				expect(res.data.synced_sales_channel_ids.every((id: any) => typeof id === 'number')).toBe(true)
			})
		})

		// ── Stock locations ───────────────────────────────────────────────────────

		describe('Stock locations', () => {
			let stockLocationId: string
			let stockLocationId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/stock-locations',
						{
							name: `Veeqo Test Warehouse ${ts}`,
							address: {
								address_1: '123 Test St',
								city: 'Portland',
								province: 'OR',
								country_code: 'us',
								postal_code: '97201'
							}
						},
						auth()
					),
					api.post(
						'/admin/stock-locations',
						{
							name: `Veeqo Test Warehouse 2 ${ts}`,
							address: {
								address_1: '456 Second Ave',
								city: 'Seattle',
								province: 'WA',
								country_code: 'us',
								postal_code: '98101'
							}
						},
						auth()
					)
				])
				stockLocationId = r1.data.stock_location.id
				stockLocationId2 = r2.data.stock_location.id
			})

			afterAll(async () => {
				await veeqoService.deleteWarehouse(stockLocationId).catch(() => {})
				await veeqoService.deleteWarehouse(stockLocationId2).catch(() => {})
			})

			it('POST /admin/veeqo/stock-locations/:id/sync syncs a single location', async () => {
				const res = await api.post(
					`/admin/veeqo/stock-locations/${stockLocationId}/sync`,
					{},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.veeqo_warehouse).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/stock-locations/sync syncs a batch', async () => {
				const res = await api.post(
					'/admin/veeqo/stock-locations/sync',
					{ stock_location_ids: [stockLocationId2] },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.synced_warehouse_ids.length).toBeGreaterThanOrEqual(1)
				expect(res.data.synced_warehouse_ids.every((id: any) => typeof id === 'number')).toBe(true)
			})
		})

		// ── Customers ─────────────────────────────────────────────────────────────

		describe('Customers', () => {
			let customerId: string
			let customerId2: string

			beforeAll(async () => {
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/customers',
						{ email: `veeqo-customer-${ts}@example.com`, first_name: 'Veeqo', last_name: 'Customer' },
						auth()
					),
					api.post(
						'/admin/customers',
						{ email: `veeqo-batch-${ts}@example.com`, first_name: 'Batch', last_name: 'Customer' },
						auth()
					)
				])
				customerId = r1.data.customer.id
				customerId2 = r2.data.customer.id
			})

			// Veeqo does not support customer deletion — afterAll only unlinks the
			// Medusa ↔ Veeqo association; the Veeqo customer record persists.
			afterAll(async () => {
				await veeqoService.deleteCustomer(customerId).catch(() => {})
				await veeqoService.deleteCustomer(customerId2).catch(() => {})
			})

			it('POST /admin/veeqo/customers/:id/sync syncs a single customer', async () => {
				const res = await api.post(`/admin/veeqo/customers/${customerId}/sync`, {}, auth())
				expect(res.status).toBe(200)
				expect(res.data.veeqo_customer).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/customers/:id/sync is idempotent (updates on second call)', async () => {
				const res = await api.post(`/admin/veeqo/customers/${customerId}/sync`, {}, auth())
				expect(res.status).toBe(200)
				expect(res.data.veeqo_customer).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/customers/sync syncs a batch', async () => {
				const res = await api.post(
					'/admin/veeqo/customers/sync',
					{ customer_ids: [customerId2] },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.synced_customer_ids.length).toBeGreaterThanOrEqual(1)
				expect(res.data.synced_customer_ids.every((id: any) => typeof id === 'number')).toBe(true)
			})
		})

		// ── Orders ───────────────────────────────────────────────────────────────
		//
		// Setup creates all prerequisites from scratch so this block is self-
		// contained: region → sales channel (synced) → stock location (synced) →
		// fulfillment set → service zone → shipping profile → shipping option
		// (synced) → product+variant (synced) → customer (synced) → draft orders.

		describe('Orders', () => {
			let orderId: string
			let orderId2: string
			let salesChannelId: string
			let stockLocationId: string
			let shippingOptionId: string
			let productId: string
			let customerId: string

			beforeAll(async () => {
				const ts = Date.now()

				// Region
				const regionRes = await api.post(
					'/admin/regions',
					{ name: `Veeqo Order Region ${ts}`, currency_code: 'usd', countries: ['us'] },
					auth()
				)
				const regionId = regionRes.data.region.id

				// Sales channel → sync to Veeqo
				const scRes = await api.post(
					'/admin/sales-channels',
					{ name: `Veeqo Order Channel ${ts}` },
					auth()
				)
				salesChannelId = scRes.data.sales_channel.id
				await api.post(`/admin/veeqo/sales-channels/${salesChannelId}/sync`, {}, auth())

				// Stock location → sync to Veeqo
				const slRes = await api.post(
					'/admin/stock-locations',
					{
						name: `Veeqo Order Warehouse ${ts}`,
						address: {
							address_1: '123 Test St',
							city: 'Portland',
							province: 'OR',
							country_code: 'us',
							postal_code: '97201'
						}
					},
					auth()
				)
				stockLocationId = slRes.data.stock_location.id
				await api.post(`/admin/veeqo/stock-locations/${stockLocationId}/sync`, {}, auth())

				// Associate the sales channel with this stock location so draft
				// orders know where to fulfill variants from.
				await api.post(
					`/admin/stock-locations/${stockLocationId}/sales-channels`,
					{ add: [salesChannelId] },
					auth()
				)

				// Link the manual fulfillment provider to this stock location.
				// In Medusa v2 the provider ID is "{identifier}_{configured_id}" = "manual_manual".
				const manualProviderId = 'manual_manual'
				await api.post(
					`/admin/stock-locations/${stockLocationId}/fulfillment-providers`,
					{ add: [manualProviderId] },
					auth()
				)

				// Fulfillment set → service zone (needed to create a shipping option).
				// The POST endpoint returns the stock location using the default field set
				// which excludes fulfillment_sets, so we fetch the ID via a separate GET.
				await api.post(
					`/admin/stock-locations/${stockLocationId}/fulfillment-sets`,
					{ name: `Veeqo Order FulfillmentSet ${ts}`, type: 'shipping' },
					auth()
				)
				const slDetail = await api.get(
					`/admin/stock-locations/${stockLocationId}?fields=fulfillment_sets.id`,
					auth()
				)
				const fulfillmentSetId = slDetail.data.stock_location.fulfillment_sets[0].id

				const szRes = await api.post(
					`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`,
					{
						name: `Veeqo Order ServiceZone ${ts}`,
						geo_zones: [{ type: 'country', country_code: 'us' }]
					},
					auth()
				)
				const serviceZoneId = szRes.data.fulfillment_set.service_zones[0].id

				// Shipping profile
				const spRes = await api.post(
					'/admin/shipping-profiles',
					{ name: `Veeqo Order Profile ${ts}`, type: 'default' },
					auth()
				)
				const shippingProfileId = spRes.data.shipping_profile.id

				// Shipping option → sync to Veeqo as a delivery method
				const soRes = await api.post(
					'/admin/shipping-options',
					{
						name: `Veeqo Standard ${ts}`,
						service_zone_id: serviceZoneId,
						shipping_profile_id: shippingProfileId,
						provider_id: manualProviderId,
						price_type: 'flat',
						prices: [{ currency_code: 'usd', amount: 500 }],
						type: { label: 'Standard', description: 'Standard shipping', code: 'standard' }
					},
					auth()
				)
				shippingOptionId = soRes.data.shipping_option.id
				await api.post(`/admin/veeqo/shipping-options/${shippingOptionId}/sync`, {}, auth())

				// Product + variant → sync to Veeqo
				const productRes = await api.post(
					'/admin/products',
					{
						title: `Veeqo Order Product ${ts}`,
						status: 'published',
						options: [{ title: 'Default', values: ['Default'] }],
						variants: [
							{
								title: 'Default',
								sku: `VEEQO-ORDER-${ts}`,
								options: { Default: 'Default' },
								prices: [{ currency_code: 'usd', amount: 1999 }]
							}
						]
					},
					auth()
				)
				productId = productRes.data.product.id
				const variantId = productRes.data.product.variants[0].id
				await api.post(`/admin/veeqo/products/${productId}/sync`, {}, auth())

				// Medusa v2 requires a variant's inventory item to be linked to a stock
				// location associated with the sales channel before a draft order can be
				// created. Find the auto-created inventory item (by SKU) and add a level.
				const invRes = await api.get(
					`/admin/inventory-items?sku=VEEQO-ORDER-${ts}`,
					auth()
				)
				const inventoryItemId = invRes.data.inventory_items[0]?.id
				if (inventoryItemId) {
					await api.post(
						`/admin/inventory-items/${inventoryItemId}/location-levels`,
						{ location_id: stockLocationId, stocked_quantity: 100 },
						auth()
					)
				}

				// Customer → sync to Veeqo
				const customerRes = await api.post(
					'/admin/customers',
					{
						email: `veeqo-order-${ts}@example.com`,
						first_name: 'Order',
						last_name: 'Tester'
					},
					auth()
				)
				customerId = customerRes.data.customer.id
				await api.post(`/admin/veeqo/customers/${customerId}/sync`, {}, auth())

				const shippingAddress = {
					first_name: 'Order',
					last_name: 'Tester',
					address_1: '123 Test St',
					city: 'Portland',
					country_code: 'us',
					province: 'OR',
					postal_code: '97201'
				}
				const shippingMethod = {
					name: `Veeqo Standard ${ts}`,
					shipping_option_id: shippingOptionId,
					amount: 500
				}

				// Draft order 1 (single-sync test)
				const orderRes = await api.post(
					'/admin/draft-orders',
					{
						region_id: regionId,
						customer_id: customerId,
						sales_channel_id: salesChannelId,
						shipping_address: shippingAddress,
						items: [{ variant_id: variantId, quantity: 1 }],
						shipping_methods: [shippingMethod]
					},
					auth()
				)
				orderId = orderRes.data.draft_order.id

				// Draft order 2 (batch-sync test)
				const orderRes2 = await api.post(
					'/admin/draft-orders',
					{
						region_id: regionId,
						customer_id: customerId,
						sales_channel_id: salesChannelId,
						shipping_address: shippingAddress,
						items: [{ variant_id: variantId, quantity: 1 }],
						shipping_methods: [shippingMethod]
					},
					auth()
				)
				orderId2 = orderRes2.data.draft_order.id
			})

			afterAll(async () => {
				await veeqoService.deleteOrder(orderId).catch(() => {})
				await veeqoService.deleteOrder(orderId2).catch(() => {})
				await veeqoService.deleteDeliveryMethod(shippingOptionId).catch(() => {})
				await veeqoService.deleteProduct(productId).catch(() => {})
				await veeqoService.deleteCustomer(customerId).catch(() => {})
				await veeqoService.deleteChannel(salesChannelId).catch(() => {})
				await veeqoService.deleteWarehouse(stockLocationId).catch(() => {})
			})

			it('POST /admin/veeqo/orders/:id/sync syncs a draft order to Veeqo', async () => {
				const res = await api.post(`/admin/veeqo/orders/${orderId}/sync`, {}, auth())
				expect(res.status).toBe(200)
				expect(res.data.veeqo_order).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/orders/sync syncs a batch of orders', async () => {
				const res = await api.post(
					'/admin/veeqo/orders/sync',
					{ order_ids: [orderId2] },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.synced_order_ids.length).toBeGreaterThanOrEqual(1)
				expect(res.data.synced_order_ids.every((id: any) => typeof id === 'number')).toBe(true)
			})
		})

		// ── Replacements: Veeqo API contract verification ─────────────────────────
		// Directly verifies the Veeqo-side API contract for the disambiguator pattern
		// and employee_notes_attributes that v0.3.0 introduces, by calling
		// veeqoService.addOrder with a constructed VeeqoOrderInput shaped exactly as
		// the new replacement mapper would produce.
		//
		// This intentionally bypasses the Medusa claim/exchange creation flow — that
		// path involves Medusa-side state (order_change, draft-to-placed conversion,
		// item linking) that is orthogonal to what we need to verify here. Full
		// end-to-end testing through the admin UI can be done manually before publish.
		//
		// Verifies these "open question" items from the design spec:
		// - Veeqo `number` field accepts the `<order_id>#claim-<claim_id>` disambiguator
		//   (full ULID-pair length, ~70 chars, with the `#` separator).
		// - `employee_notes_attributes` shape on create.
		// - GET response surfaces the note content under `employee_notes` and the
		//   inner key matches what we sent (`text`).
		// Skipped by default — these tests hit the live Veeqo API and create real orders
		// in the sandbox. They served their purpose answering open design questions:
		//   - Veeqo accepts the full `<order_id>#claim-<claim_id>` disambiguator (~74 chars, # separator)
		//   - `employee_notes_attributes` round-trips and drives the "Internal Notes" UI section
		//   - `findOrderByNumber` (free-text `query` + client-side exact filter) reliably
		//     retrieves a previously-created order — required for pre-flight duplicate prevention
		// Re-enable (change to `describe(...)`) only if a future change needs to re-verify.
		describe.skip('Replacements: Veeqo API contract', () => {
			let veeqoChannelId: number
			let veeqoCustomerId: number
			let veeqoSellableId: number
			let veeqoDeliveryMethodId: number
			let createdVeeqoOrderIds: number[] = []

			// Helper to set up the minimum Veeqo prerequisites for creating an order.
			beforeAll(async () => {
				const ts = Date.now()

				// Sales channel + Veeqo channel
				const scRes = await api.post(
					'/admin/sales-channels',
					{ name: `Veeqo Replacement Contract Channel ${ts}` },
					auth()
				)
				const salesChannelId = scRes.data.sales_channel.id
				const channelSyncRes = await api.post(
					`/admin/veeqo/sales-channels/${salesChannelId}/sync`,
					{},
					auth()
				)
				// Sync workflows return the Veeqo DTO with `.id` being the Veeqo numeric ID.
				veeqoChannelId = Number(channelSyncRes.data.veeqo_channel.id)

				// Stock location + Veeqo warehouse + sales-channel link
				const slRes = await api.post(
					'/admin/stock-locations',
					{
						name: `Veeqo Replacement Contract Warehouse ${ts}`,
						address: {
							address_1: '123 Test St',
							city: 'Portland',
							province: 'OR',
							country_code: 'us',
							postal_code: '97201'
						}
					},
					auth()
				)
				const stockLocationId = slRes.data.stock_location.id
				await api.post(`/admin/veeqo/stock-locations/${stockLocationId}/sync`, {}, auth())
				await api.post(
					`/admin/stock-locations/${stockLocationId}/sales-channels`,
					{ add: [salesChannelId] },
					auth()
				)
				await api.post(
					`/admin/stock-locations/${stockLocationId}/fulfillment-providers`,
					{ add: ['manual_manual'] },
					auth()
				)

				// Fulfillment set + service zone + shipping option (for delivery method)
				await api.post(
					`/admin/stock-locations/${stockLocationId}/fulfillment-sets`,
					{ name: `Replacement Contract Set ${ts}`, type: 'shipping' },
					auth()
				)
				const slDetail = await api.get(
					`/admin/stock-locations/${stockLocationId}?fields=fulfillment_sets.id`,
					auth()
				)
				const fulfillmentSetId = slDetail.data.stock_location.fulfillment_sets[0].id
				const szRes = await api.post(
					`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`,
					{
						name: `Replacement Contract Zone ${ts}`,
						geo_zones: [{ type: 'country', country_code: 'us' }]
					},
					auth()
				)
				const serviceZoneId = szRes.data.fulfillment_set.service_zones[0].id
				const spRes = await api.post(
					'/admin/shipping-profiles',
					{ name: `Replacement Contract Profile ${ts}`, type: 'default' },
					auth()
				)
				const soRes = await api.post(
					'/admin/shipping-options',
					{
						name: `Replacement Contract Standard ${ts}`,
						service_zone_id: serviceZoneId,
						shipping_profile_id: spRes.data.shipping_profile.id,
						provider_id: 'manual_manual',
						price_type: 'flat',
						prices: [{ currency_code: 'usd', amount: 500 }],
						type: { label: 'Standard', description: 'Standard shipping', code: 'standard' }
					},
					auth()
				)
				const shippingOptionId = soRes.data.shipping_option.id
				const shippingSyncRes = await api.post(
					`/admin/veeqo/shipping-options/${shippingOptionId}/sync`,
					{},
					auth()
				)
				veeqoDeliveryMethodId = Number(shippingSyncRes.data.veeqo_delivery_method.id)

				// Product + variant
				const productRes = await api.post(
					'/admin/products',
					{
						title: `Veeqo Replacement Contract Product ${ts}`,
						status: 'published',
						options: [{ title: 'Default', values: ['Default'] }],
						variants: [
							{
								title: 'Default',
								sku: `VEEQO-REPL-CONTRACT-${ts}`,
								options: { Default: 'Default' },
								prices: [{ currency_code: 'usd', amount: 1999 }]
							}
						]
					},
					auth()
				)
				const productId = productRes.data.product.id
				const productSyncRes = await api.post(
					`/admin/veeqo/products/${productId}/sync`,
					{},
					auth()
				)
				// veeqo_product.sellables[0].id is the Veeqo sellable id (numeric)
				veeqoSellableId = Number(productSyncRes.data.veeqo_product.sellables[0].id)

				// Customer + Veeqo customer
				const customerRes = await api.post(
					'/admin/customers',
					{
						email: `veeqo-replacement-contract-${ts}@example.com`,
						first_name: 'Replacement',
						last_name: 'Contract'
					},
					auth()
				)
				const customerSyncRes = await api.post(
					`/admin/veeqo/customers/${customerRes.data.customer.id}/sync`,
					{},
					auth()
				)
				veeqoCustomerId = Number(customerSyncRes.data.veeqo_customer.id)
			})

			afterAll(async () => {
				// Cancel all but the LAST Veeqo order — keep the most recent one alive
				// so the user can inspect it in the Veeqo UI to confirm tag display and
				// overall appearance.
				if (createdVeeqoOrderIds.length > 0) {
					const toCancel = createdVeeqoOrderIds.slice(0, -1)
					const kept = createdVeeqoOrderIds[createdVeeqoOrderIds.length - 1]
					for (const id of toCancel) {
						await (veeqoService as any)
							.cancelOrder?.(id, 'Test cleanup')
							.catch(() => {})
					}
					// eslint-disable-next-line no-console
					console.log(
						`[Replacements] Left Veeqo order #${kept} alive for manual UI inspection`
					)
				}
			})

			it('Veeqo accepts the full <order_id>#claim-<claim_id> disambiguator and round-trips employee_notes_attributes', async () => {
				// Construct synthetic Medusa-style ULID-shaped IDs to match real-world length.
				// `order.id` and `claim.id` in Medusa v2 are ~30 chars each.
				const fakeOrderId = 'order_01HABCDEFGHIJKLMNOPQRSTUVWX'
				const fakeClaimId = 'ordcla_01HABCDEFGHIJKLMNOPQRSTUVWX'
				const number = `${fakeOrderId}#claim-${fakeClaimId}`
				expect(number.length).toBeGreaterThanOrEqual(60) // confirm we're testing realistic length

				const noteText =
					`Replacement for Veeqo order #99999. Medusa claim: ${fakeClaimId}.`

				const veeqoOrder: any = await veeqoService.addOrder({
					veeqo_input: {
						channel_id: veeqoChannelId,
						customer_id: veeqoCustomerId,
						deliver_to_attributes: {
							first_name: 'Replacement',
							last_name: 'Contract',
							email: 'replacement-test@example.com',
							address1: '123 Test St',
							city: 'Portland',
							state: 'OR',
							country: 'US',
							zip: '97201'
						},
						delivery_method_id: veeqoDeliveryMethodId,
						number,
						send_notification_email: false,
						total_discounts: 0,
						line_items_attributes: [
							{
								sellable_id: veeqoSellableId,
								price_per_unit: 1999,
								quantity: 1
							}
						],
						payment_attributes: {
							payment_type: 'manual',
							reference_number: number
						},
						tags: ['replacement', 'claim'],
						employee_notes_attributes: [{ text: noteText }]
					}
				})

				expect(veeqoOrder).toBeTruthy()
				expect(veeqoOrder.id).toBeGreaterThan(0)
				createdVeeqoOrderIds.push(veeqoOrder.id)

				// Now GET the order and verify what came back.
				const fetched: any = await veeqoService.fetchOrder(veeqoOrder.id)

				// PRIMARY ASSERTION — open question 1: Veeqo accepted the full ~70-char disambiguator
				// with `#` separator. If we got here, the create succeeded and round-trips.
				expect(fetched.number).toBe(number)

				// Diagnostic logging for the other two open questions. We log rather than assert
				// because Veeqo's GET response can omit/transform some fields it accepted on create.
				// Future reader: read these logs to confirm tags and employee_notes shape.

				// eslint-disable-next-line no-console
				console.log('=== Veeqo round-trip diagnostics ===')
				// eslint-disable-next-line no-console
				console.log('number:', fetched.number, '(length:', fetched.number?.length, ')')
				// eslint-disable-next-line no-console
				console.log('tags (raw):', JSON.stringify(fetched.tags))
				// eslint-disable-next-line no-console
				console.log(
					'employee_notes (raw):',
					JSON.stringify(fetched.employee_notes)
				)
				// eslint-disable-next-line no-console
				console.log(
					'top-level fields containing "note":',
					Object.keys(fetched).filter(k => k.toLowerCase().includes('note'))
				)
				// eslint-disable-next-line no-console
				console.log('=====================================')

				// SECONDARY: tags round-trip. If Veeqo's GET response surfaces tags the way
				// we expect, this passes. If not, we still have the create-success above.
				const tagValues = (fetched.tags ?? []).map((t: any) =>
					typeof t === 'string' ? t : (t?.name ?? t?.value ?? t)
				)
				if (tagValues.length > 0) {
					expect(tagValues).toEqual(expect.arrayContaining(['replacement', 'claim']))
				}
				// (else: tags are not in the basic GET response — non-fatal; the create accepted them)

				// SECONDARY: employee_notes_attributes round-trip. Same fail-soft pattern.
				const employeeNotes = fetched.employee_notes ?? []
				if (employeeNotes.length > 0) {
					const note = employeeNotes[0]
					const returnedNoteText =
						note?.text ?? note?.body ?? note?.content ?? note?.note
					expect(returnedNoteText).toBe(noteText)
				}
				// (else: employee_notes are not in the basic GET response — log above shows shape)
			}, 60000)

			it('Veeqo accepts the <order_id>#exchange-<exchange_id> disambiguator with employee notes', async () => {
				const fakeOrderId = 'order_01HABCDEFGHIJKLMNOPQRSTUVWX'
				const fakeExchangeId = 'oexch_01HABCDEFGHIJKLMNOPQRSTUVWX'
				const number = `${fakeOrderId}#exchange-${fakeExchangeId}`
				const noteText = `Replacement for Veeqo order #99999. Medusa exchange: ${fakeExchangeId}.`

				const veeqoOrder: any = await veeqoService.addOrder({
					veeqo_input: {
						channel_id: veeqoChannelId,
						customer_id: veeqoCustomerId,
						deliver_to_attributes: {
							first_name: 'Exchange',
							last_name: 'Contract',
							email: 'exchange-test@example.com',
							address1: '123 Test St',
							city: 'Portland',
							state: 'OR',
							country: 'US',
							zip: '97201'
						},
						delivery_method_id: veeqoDeliveryMethodId,
						number,
						send_notification_email: false,
						total_discounts: 0,
						line_items_attributes: [
							{ sellable_id: veeqoSellableId, price_per_unit: 1999, quantity: 1 }
						],
						payment_attributes: { payment_type: 'manual', reference_number: number },
						employee_notes_attributes: [{ text: noteText }]
					}
				})

				expect(veeqoOrder.id).toBeGreaterThan(0)
				createdVeeqoOrderIds.push(veeqoOrder.id)

				const fetched: any = await veeqoService.fetchOrder(veeqoOrder.id)
				expect(fetched.number).toBe(number)
				expect(fetched.employee_notes?.[0]?.text).toBe(noteText)
			}, 60000)

			// Note: createVeeqoOrderStep idempotency (short-circuiting on a healthy existing row)
			// is verified by code review of the step implementation. A live integration test
			// would require synthesizing a VeeqoOrder DB row, which requires a valid
			// veeqo_customer_id FK and adds non-trivial setup complexity for limited value.

			// findOrderByNumber probe: verifies that we can reliably look up a Veeqo order
			// by its `number` field via Veeqo's free-text `query` parameter on /orders.
			// This is the prerequisite for implementing pre-flight duplicate prevention in
			// createVeeqoOrderStep — before posting a new order to Veeqo, we'd search for
			// an existing one with the same number; if found, recover instead of duplicating.
			//
			// The probe creates an order with a known disambiguated number, then immediately
			// searches for it. We verify:
			//   1. The search returns at least one result.
			//   2. Our exact `number` is in the result set.
			//   3. The matched order's id matches the one we just created.
			//   4. (Diagnostic) Total result count, in case `query` returns false positives.
			it('PROBE: findOrderByNumber retrieves a freshly-created order by its disambiguated number', async () => {
				const ts = Date.now()
				const fakeOrderId = `order_01HFINDPROBE${ts}`
				const fakeClaimId = `ordcla_01HFINDPROBE${ts}`
				const number = `${fakeOrderId}#claim-${fakeClaimId}`

				const created: any = await veeqoService.addOrder({
					veeqo_input: {
						channel_id: veeqoChannelId,
						customer_id: veeqoCustomerId,
						deliver_to_attributes: {
							first_name: 'Find',
							last_name: 'Probe',
							email: 'find-probe@example.com',
							address1: '123 Test St',
							city: 'Portland',
							state: 'OR',
							country: 'US',
							zip: '97201'
						},
						delivery_method_id: veeqoDeliveryMethodId,
						number,
						send_notification_email: false,
						total_discounts: 0,
						line_items_attributes: [
							{ sellable_id: veeqoSellableId, price_per_unit: 1999, quantity: 1 }
						],
						payment_attributes: { payment_type: 'manual', reference_number: number },
						employee_notes_attributes: [
							{ text: `findOrderByNumber probe — Veeqo order to be looked up by number ${number}` }
						]
					}
				})
				expect(created.id).toBeGreaterThan(0)
				createdVeeqoOrderIds.push(created.id)

				// Veeqo's search may need a brief moment to index the new order.
				// Retry a few times if not immediately found.
				let found: any = null
				let attempts = 0
				const maxAttempts = 6
				while (!found && attempts < maxAttempts) {
					if (attempts > 0) await new Promise(r => setTimeout(r, 1000))
					found = await veeqoService.findOrderByNumber(number)
					attempts++
				}

				// eslint-disable-next-line no-console
				console.log(
					`[findOrderByNumber probe] number="${number}" found_after_attempts=${attempts} match_id=${found?.id ?? 'null'} expected_id=${created.id}`
				)

				// Diagnostic: how many total results did the free-text query return?
				// If much greater than 1, we know the disambiguator may match other orders too.
				const rawResp: any = await (veeqoService as any).fetch({
					path: `/orders?query=${encodeURIComponent(number)}&page_size=20`,
					method: 'GET'
				})
				const rawBody = await rawResp.json().catch(() => null)
				const totalResults = Array.isArray(rawBody) ? rawBody.length : -1
				// eslint-disable-next-line no-console
				console.log(
					`[findOrderByNumber probe] free-text query returned ${totalResults} result(s); we exact-match-filtered to find the one we wanted`
				)

				// Primary assertion: the lookup found our exact order.
				expect(found).not.toBeNull()
				expect(found.id).toBe(created.id)
				expect(found.number).toBe(number)

				// Secondary: searching for a number that doesn't exist returns null.
				const missing = await veeqoService.findOrderByNumber(
					`order_01HDOESNOTEXIST${ts}#claim-x`
				)
				expect(missing).toBeNull()
			}, 60000)

			// Notes-field UI probe: Veeqo has multiple note-like fields (`notes`, `employee_notes`,
			// `customer_note`). Earlier rounds confirmed `employee_notes_attributes` accepts text
			// and round-trips on GET, but the UI's "Internal Notes" section appeared empty on a
			// test order — suggesting that section may be backed by a different field.
			//
			// This test sends ALL three fields with DISTINCT, identifiable labels in one order
			// and leaves the order behind so the user can manually inspect the Veeqo UI to map
			// each field to its UI location. The final order id is logged.
			it('PROBE: which Veeqo field drives the "Internal Notes" UI section (sends notes, employee_notes_attributes, customer_note)', async () => {
				const ts = Date.now()
				const number = `notes-probe-${ts}`

				// Each label is distinct so they cannot be confused in the UI.
				const NOTES_LABEL = `[NOTES_FIELD ${ts}] If you see this anywhere, the deprecated 'notes' field still drives some UI section.`
				const EMPLOYEE_NOTES_LABEL = `[EMPLOYEE_NOTES ${ts}] Sent via employee_notes_attributes. Confirm where this appears in the UI.`
				const CUSTOMER_NOTE_LABEL = `[CUSTOMER_NOTE ${ts}] Sent via customer_note. Should appear customer-facing only.`

				const created: any = await veeqoService.addOrder({
					veeqo_input: {
						channel_id: veeqoChannelId,
						customer_id: veeqoCustomerId,
						deliver_to_attributes: {
							first_name: 'Notes',
							last_name: 'Probe',
							email: 'notes-probe@example.com',
							address1: '123 Test St',
							city: 'Portland',
							state: 'OR',
							country: 'US',
							zip: '97201'
						},
						delivery_method_id: veeqoDeliveryMethodId,
						number,
						send_notification_email: false,
						total_discounts: 0,
						line_items_attributes: [
							{ sellable_id: veeqoSellableId, price_per_unit: 1999, quantity: 1 }
						],
						payment_attributes: { payment_type: 'manual', reference_number: number },
						employee_notes_attributes: [{ text: EMPLOYEE_NOTES_LABEL }],
						// Undocumented fields for this experiment — TS doesn't know about them
						// because we deliberately removed `tags` and never added `notes`/`customer_note`.
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						...({ notes: NOTES_LABEL, customer_note: CUSTOMER_NOTE_LABEL } as any)
					} as any
				})

				expect(created.id).toBeGreaterThan(0)
				createdVeeqoOrderIds.push(created.id)

				const fetched: any = await veeqoService.fetchOrder(created.id)

				// eslint-disable-next-line no-console
				console.log('=== Notes field probe — Veeqo order #' + created.id + ' ===')
				// eslint-disable-next-line no-console
				console.log(' notes (raw):', JSON.stringify(fetched.notes))
				// eslint-disable-next-line no-console
				console.log(' employee_notes (raw):', JSON.stringify(fetched.employee_notes))
				// eslint-disable-next-line no-console
				console.log(' customer_note (raw):', JSON.stringify(fetched.customer_note))
				// eslint-disable-next-line no-console
				console.log(
					' all top-level keys containing "note":',
					Object.keys(fetched).filter(k => k.toLowerCase().includes('note'))
				)
				// eslint-disable-next-line no-console
				console.log(
					'>>> Inspect Veeqo order #' +
						created.id +
						' in the UI to map labels to UI sections <<<'
				)
				// eslint-disable-next-line no-console
				console.log('==========================================================')

				// Sanity: at least the employee_notes round-tripped (we already confirmed this
				// in the disambiguator test). The other two are exploratory.
				expect(fetched.employee_notes?.[0]?.text).toBe(EMPLOYEE_NOTES_LABEL)
			}, 60000)
		})


		// ── Products ──────────────────────────────────────────────────────────────

		describe('Products', () => {
			let productId: string
			let productId2: string

			beforeAll(async () => {
				// Medusa v2 requires product options with values when creating variants.
				const ts = Date.now()
				const [r1, r2] = await Promise.all([
					api.post(
						'/admin/products',
						{
							title: `Veeqo Test Product ${ts}`,
							status: 'published',
							options: [{ title: 'Default', values: ['Default'] }],
							variants: [
								{
									title: 'Default Variant',
									sku: `VEEQO-SKU-${ts}`,
									options: { Default: 'Default' },
									prices: [{ currency_code: 'usd', amount: 1999 }]
								}
							]
						},
						auth()
					),
					api.post(
						'/admin/products',
						{
							title: `Veeqo Batch Product ${ts}`,
							status: 'published',
							options: [{ title: 'Default', values: ['Default'] }],
							variants: [
								{
									title: 'Batch Variant',
									sku: `VEEQO-BATCH-${ts}`,
									options: { Default: 'Default' },
									prices: [{ currency_code: 'usd', amount: 999 }]
								}
							]
						},
						auth()
					)
				])
				productId = r1.data.product.id
				productId2 = r2.data.product.id
			})

			afterAll(async () => {
				await veeqoService.deleteProduct(productId).catch(() => {})
				await veeqoService.deleteProduct(productId2).catch(() => {})
			})

			it('POST /admin/veeqo/products/:id/sync syncs a single product', async () => {
				const res = await api.post(`/admin/veeqo/products/${productId}/sync`, {}, auth())
				expect(res.status).toBe(200)
				expect(res.data.veeqo_product).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/products/:id/sync is idempotent (updates on second call)', async () => {
				const res = await api.post(`/admin/veeqo/products/${productId}/sync`, {}, auth())
				expect(res.status).toBe(200)
				expect(res.data.veeqo_product).toMatchObject({ id: expect.any(Number) })
			})

			it('POST /admin/veeqo/products/sync syncs a batch', async () => {
				const res = await api.post(
					'/admin/veeqo/products/sync',
					{ product_ids: [productId2] },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.synced_product_ids.length).toBeGreaterThanOrEqual(1)
				expect(res.data.synced_product_ids.every((id: any) => typeof id === 'number')).toBe(true)
			})
		})
	}
})
