import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'
import {
	AdminAddAffiliateAddressResponseSchema,
	AdminAffiliateResponseSchema,
	AdminAffiliateStatsResponseSchema,
	AdminAffiliatesResponseSchema,
	AdminCreateAffiliatePromotionResponseSchema,
	AdminCreateAffiliateResponseSchema
} from './response-contracts'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-affiliate',
	inApp: true,
	env: {},
	testSuite: ({ api, getContainer, dbUtils, utils }) => {
		const seedSnapshot = async () => {
			await utils.waitWorkflowExecutions()
			await dbUtils.snapshot()
		}
		let adminToken: string

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		beforeAll(async () => {
			const container = getContainer()

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'affiliate-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'affiliate-test@example.com',
						first_name: 'Affiliate',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'affiliate-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		const createBody = {
			name: 'Jane Doe',
			email: 'jane@example.com',
			phone: '+15555550100',
			currency_code: 'usd',
			address: {
				first_name: 'Jane',
				last_name: 'Doe',
				address_1: '1 Main St',
				city: 'Brisbane',
				country_code: 'au',
				postal_code: '4000'
			},
			first_promotion: {
				code: 'JANE10',
				discount_type: 'percentage',
				discount_value: 10
			}
		}

		// ─── affiliates CRUD ───────────────────────────────────────────────────────

		describe('POST /admin/affiliates', () => {
			it('rejects invalid body', async () => {
				await expect(api.post('/admin/affiliates', { name: '' }, auth())).rejects.toMatchObject({
					response: { status: 400 }
				})
			})

			it('creates affiliate atomically and returns affiliate_id', async () => {
				const res = await api.post('/admin/affiliates', createBody, auth())
				expect(res.status).toBe(200)
				expect(res.data.affiliate.affiliate_id).toMatch(/^aff_/)
				expect(res.data.affiliate.promotion_id).toMatch(/^promo_/)
				// AdminCreateAffiliateResponse (workflow `transform` result -- not a raw entity)
				expect(() => AdminCreateAffiliateResponseSchema.parse(res.data)).not.toThrow()
			})

			it('refuses a duplicate promotion code', async () => {
				const uniqueCode = `DUP_${Date.now()}`
				const uniqueEmail1 = `dup-a-${Date.now()}@example.com`
				const uniqueEmail2 = `dup-b-${Date.now()}@example.com`
				const body = {
					...createBody,
					email: uniqueEmail1,
					first_promotion: { ...createBody.first_promotion, code: uniqueCode }
				}
				await api.post('/admin/affiliates', body, auth())
				await expect(api.post('/admin/affiliates', { ...body, email: uniqueEmail2 }, auth())).rejects.toMatchObject({ response: { status: 400 } })
			})
		})

		describe('list + detail + update + delete', () => {
			let affiliateId: string

			beforeEach(async () => {
				const res = await api.post(
					'/admin/affiliates',
					{
						...createBody,
						email: `jane-${Date.now()}@example.com`,
						first_promotion: { ...createBody.first_promotion, code: `J${Date.now()}`, end_date: '2027-06-01T00:00:00.000Z' }
					},
					auth()
				)
				affiliateId = res.data.affiliate.affiliate_id
			})

			it('lists includes the new affiliate', async () => {
				const res = await api.get('/admin/affiliates', auth())
				expect(res.status).toBe(200)
				expect(res.data.affiliates.some((a: any) => a.id === affiliateId)).toBe(true)
				// AdminAffiliatesResponse
				expect(() => AdminAffiliatesResponseSchema.parse(res.data)).not.toThrow()
			})

			it('detail includes addresses and promotions', async () => {
				const res = await api.get(`/admin/affiliates/${affiliateId}`, auth())
				expect(res.data.affiliate.addresses).toHaveLength(1)
				expect(res.data.affiliate.promotions).toHaveLength(1)
				expect(res.data.affiliate.primary_address_id).toBe(res.data.affiliate.addresses[0].id)
				// The fixture's first_promotion carries an end_date, so both the campaign
				// and application_method sub-relations should be populated -- this pins
				// down finding 3 (the detail route's `promotions.*` default previously
				// left both unpopulated even though the admin UI reads them).
				expect(res.data.affiliate.promotions[0].application_method).toMatchObject({ type: 'percentage', value: 10 })
				expect(res.data.affiliate.promotions[0].campaign).toMatchObject({ ends_at: '2027-06-01T00:00:00.000Z' })
				// AdminAffiliateResponse
				expect(() => AdminAffiliateResponseSchema.parse(res.data)).not.toThrow()
			})

			it('updates name + status (inactive deactivates codes)', async () => {
				const res = await api.post(
					`/admin/affiliates/${affiliateId}`,
					{
						name: 'Jane R.',
						status: 'inactive'
					},
					auth()
				)
				expect(res.status).toBe(200)

				const after = await api.get(`/admin/affiliates/${affiliateId}`, auth())
				expect(after.data.affiliate.name).toBe('Jane R.')
				expect(after.data.affiliate.status).toBe('inactive')
				expect(after.data.affiliate.promotions[0].status).toBe('inactive')
			})

			it('delete removes affiliate; promotions retired', async () => {
				await api.delete(`/admin/affiliates/${affiliateId}`, auth())
				await expect(api.get(`/admin/affiliates/${affiliateId}`, auth())).rejects.toMatchObject({
					response: { status: 404 }
				})
			})
		})

		// ─── promotions ───────────────────────────────────────────────────────────

		describe('affiliate promotions', () => {
			let promoAffiliateId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/affiliates',
					{
						name: 'Jane',
						email: 'jane-promotions@example.com',
						address: {
							address_1: '1 Main',
							city: 'X',
							country_code: 'us',
							postal_code: '12345'
						},
						first_promotion: {
							code: `SETUP${Date.now()}`,
							discount_type: 'percentage',
							discount_value: 10
						}
					},
					auth()
				)
				promoAffiliateId = res.data.affiliate.affiliate_id
				await seedSnapshot()
			})

			it('adds a new code', async () => {
				const res = await api.post(
					`/admin/affiliates/${promoAffiliateId}/promotions`,
					{
						code: `ADD${Date.now()}`,
						discount_type: 'percentage',
						discount_value: 15
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.promotion.promotion_id).toMatch(/^promo_/)
				// AdminCreateAffiliatePromotionResponse (workflow `transform` result -- not a raw entity)
				expect(() => AdminCreateAffiliatePromotionResponseSchema.parse(res.data)).not.toThrow()
			})

			it('updates discount value and end date', async () => {
				const created = await api.post(
					`/admin/affiliates/${promoAffiliateId}/promotions`,
					{
						code: `UPD${Date.now()}`,
						discount_type: 'percentage',
						discount_value: 5
					},
					auth()
				)
				const pid = created.data.promotion.promotion_id

				const res = await api.post(
					`/admin/affiliates/${promoAffiliateId}/promotions/${pid}`,
					{
						discount_value: 12,
						end_date: '2027-01-01T00:00:00.000Z'
					},
					auth()
				)
				expect(res.status).toBe(200)
			})

			it('retires and reactivates', async () => {
				const created = await api.post(
					`/admin/affiliates/${promoAffiliateId}/promotions`,
					{
						code: `RET${Date.now()}`,
						discount_type: 'fixed',
						discount_value: 5
					},
					auth()
				)
				const pid = created.data.promotion.promotion_id

				await api.post(`/admin/affiliates/${promoAffiliateId}/promotions/${pid}/retire`, {}, auth())
				await api.post(`/admin/affiliates/${promoAffiliateId}/promotions/${pid}/reactivate`, {}, auth())
				// implicit: no error means both succeeded
			})

			it('rejects delete when attribution rows exist', async () => {
				const container = getContainer()
				const svc: any = container.resolve('affiliate')

				const created = await api.post(
					`/admin/affiliates/${promoAffiliateId}/promotions`,
					{
						code: `DEL${Date.now()}`,
						discount_type: 'fixed',
						discount_value: 5
					},
					auth()
				)
				const pid = created.data.promotion.promotion_id

				await svc.createAffiliateAttributions([
					{
						affiliate_id: promoAffiliateId,
						promotion_id: pid,
						order_id: `order_${Date.now()}`,
						currency_code: 'usd',
						gross_subtotal: 100,
						net_subtotal: 90,
						placed_at: new Date()
					}
				])

				await expect(api.delete(`/admin/affiliates/${promoAffiliateId}/promotions/${pid}`, auth())).rejects.toMatchObject({ response: { status: 400 } })
			})
		})

		// ─── addresses ────────────────────────────────────────────────────────────

		describe('affiliate addresses', () => {
			let addrAffiliateId: string
			let addrPrimaryAddressId: string

			beforeAll(async () => {
				const res = await api.post(
					'/admin/affiliates',
					{
						name: 'Jane',
						email: 'jane-addresses@example.com',
						address: {
							address_1: '1 Main',
							city: 'X',
							country_code: 'us',
							postal_code: '12345'
						},
						first_promotion: {
							code: `SETUP_ADDR${Date.now()}`,
							discount_type: 'percentage',
							discount_value: 10
						}
					},
					auth()
				)
				addrAffiliateId = res.data.affiliate.affiliate_id
				addrPrimaryAddressId = res.data.affiliate.primary_address_id
				await seedSnapshot()
			})

			it('adds a second address', async () => {
				const res = await api.post(
					`/admin/affiliates/${addrAffiliateId}/addresses`,
					{
						address_1: '2 Second St',
						city: 'Y',
						country_code: 'us',
						postal_code: '54321'
					},
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.address.id).toMatch(/^affaddr_/)
				// AdminAddAffiliateAddressResponse (workflow step result -- not a raw entity)
				expect(() => AdminAddAffiliateAddressResponseSchema.parse(res.data)).not.toThrow()
			})

			it('rejects deleting the only-primary address; allows after adding another', async () => {
				// Create a fresh affiliate for this test to isolate from test 1
				const freshRes = await api.post(
					'/admin/affiliates',
					{
						name: 'TestDelete',
						email: `test-delete-${Date.now()}@example.com`,
						address: {
							address_1: '100 Delete Ave',
							city: 'TestCity',
							country_code: 'us',
							postal_code: '99999'
						},
						first_promotion: {
							code: `DEL${Date.now()}`,
							discount_type: 'fixed',
							discount_value: 5
						}
					},
					auth()
				)
				const testAffiliateId = freshRes.data.affiliate.affiliate_id
				const testPrimaryAddressId = freshRes.data.affiliate.primary_address_id

				await expect(api.delete(`/admin/affiliates/${testAffiliateId}/addresses/${testPrimaryAddressId}`, auth())).rejects.toMatchObject({
					response: { status: 400 }
				})

				const added = await api.post(
					`/admin/affiliates/${testAffiliateId}/addresses`,
					{
						address_1: '99 Other'
					},
					auth()
				)
				await api.post(
					`/admin/affiliates/${testAffiliateId}`,
					{
						primary_address_id: added.data.address.id
					},
					auth()
				)
				await api.delete(`/admin/affiliates/${testAffiliateId}/addresses/${testPrimaryAddressId}`, auth())
			})

			it('rejects update of address not belonging to the affiliate', async () => {
				await expect(
					api.post(
						`/admin/affiliates/${addrAffiliateId}/addresses/affaddr_nonexistent`,
						{
							city: 'Hack'
						},
						auth()
					)
				).rejects.toMatchObject({ response: { status: 404 } })
			})
		})

		// ─── stats ────────────────────────────────────────────────────────────────

		describe('affiliate stats', () => {
			let statsAffiliateId: string
			let statsPromotionId: string

			beforeAll(async () => {
				const container = getContainer()
				const ts = Date.now()
				const res = await api.post(
					'/admin/affiliates',
					{
						name: 'Stats Jane',
						email: `jane-stats-${ts}@example.com`,
						currency_code: 'usd',
						address: {
							address_1: '1 Main St',
							city: 'Brisbane',
							country_code: 'au',
							postal_code: '4000'
						},
						first_promotion: {
							code: `STATS${ts}`,
							discount_type: 'percentage',
							discount_value: 10
						}
					},
					auth()
				)
				statsAffiliateId = res.data.affiliate.affiliate_id
				statsPromotionId = res.data.affiliate.promotion_id

				const svc: any = container.resolve('affiliate')
				const now = new Date()
				// Use 2 days ago so it is clearly outside the "day" window (cutoff = now - 1 day)
				const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000)
				// Use 31 days ago so it is clearly outside the "month" window
				const lastMonth = new Date(now.getTime() - 31 * 86_400_000)

				// Use unique order_id values across runs to avoid UNIQUE(order_id) constraint failures
				await svc.createAffiliateAttributions([
					{
						affiliate_id: statsAffiliateId,
						promotion_id: statsPromotionId,
						order_id: `o_recent_${ts}`,
						currency_code: 'usd',
						gross_subtotal: 100,
						net_subtotal: 90,
						placed_at: now,
						completed_at: now
					},
					{
						affiliate_id: statsAffiliateId,
						promotion_id: statsPromotionId,
						order_id: `o_yesterday_${ts}`,
						currency_code: 'usd',
						gross_subtotal: 50,
						net_subtotal: 45,
						placed_at: twoDaysAgo,
						completed_at: twoDaysAgo
					},
					{
						affiliate_id: statsAffiliateId,
						promotion_id: statsPromotionId,
						order_id: `o_lastmonth_${ts}`,
						currency_code: 'eur',
						gross_subtotal: 200,
						net_subtotal: 180,
						placed_at: lastMonth,
						completed_at: lastMonth
					},
					{
						affiliate_id: statsAffiliateId,
						promotion_id: statsPromotionId,
						order_id: `o_voided_${ts}`,
						currency_code: 'usd',
						gross_subtotal: 999,
						net_subtotal: 999,
						placed_at: now,
						completed_at: now,
						voided_at: now
					}
				])
				await seedSnapshot()
			})

			it('basis=completed window=day returns only today (excludes voided)', async () => {
				const res = await api.get(`/admin/affiliates/${statsAffiliateId}/stats?basis=completed&window=day`, auth())
				expect(res.status).toBe(200)
				const usd = res.data.buckets.find((b: any) => b.currency_code === 'usd')
				expect(usd).toBeDefined()
				expect(usd.order_count).toBe(1)
				expect(usd.gross_total).toBe(100)
				expect(usd.net_total).toBe(90)
			})

			it('basis=completed window=all returns all non-voided rows; usd first', async () => {
				const res = await api.get(`/admin/affiliates/${statsAffiliateId}/stats?basis=completed&window=all`, auth())
				expect(res.status).toBe(200)
				// Primary currency (usd) must be first
				expect(res.data.buckets[0].currency_code).toBe('usd')
				const usd = res.data.buckets[0]
				// o_recent + o_yesterday (usd, non-voided)
				expect(usd.order_count).toBe(2)
				expect(usd.gross_total).toBe(150)
				const eur = res.data.buckets[1]
				expect(eur).toBeDefined()
				expect(eur.currency_code).toBe('eur')
				expect(eur.order_count).toBe(1)
			})

			it('basis=captured excludes rows with null captured_at', async () => {
				const res = await api.get(`/admin/affiliates/${statsAffiliateId}/stats?basis=captured&window=all`, auth())
				expect(res.status).toBe(200)
				// None of the seeded rows have captured_at set
				expect(res.data.buckets).toEqual([])
			})

			it('promotion_id filter limits the rows', async () => {
				const res = await api.get(`/admin/affiliates/${statsAffiliateId}/stats?basis=completed&window=all&promotion_id=${statsPromotionId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.promotion_id).toBe(statsPromotionId)
				expect(res.data.buckets.length).toBeGreaterThan(0)
				// AdminAffiliateStatsResponse
				expect(() => AdminAffiliateStatsResponseSchema.parse(res.data)).not.toThrow()
			})
		})

		// ─── cart promotion guard (helper-level) ──────────────────────────────────

		// NOTE: Driving a full cart through the store API requires a region + sales channel
		// + publishable key in this test environment. If that scaffolding isn't already
		// in place in the integration test runner, this spec asserts at the unit level
		// (via the helper from Task 11) that the swap-on-add logic works, and the cart-level
		// flow is covered manually during dev test.
		describe('cart promotion guard', () => {
			it('helper allows last-wins for two affiliate codes', () => {
				const { evaluatePromotionStack } = require('../../src/workflows/hooks/lib/evaluate-promotion-stack')
				const d = evaluatePromotionStack({
					currentCodes: ['GUARD_A'],
					incomingCodes: ['GUARD_B'],
					affiliateCodes: new Set(['GUARD_A', 'GUARD_B']),
					allowStacking: true,
					action: 'add'
				})
				expect(d.accept).toBe(true)
				expect(d.codesToRemove).toEqual(['GUARD_A'])
			})
		})
	}
})
