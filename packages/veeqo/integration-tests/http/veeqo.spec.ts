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
