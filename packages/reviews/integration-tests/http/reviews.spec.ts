/**
 * Integration tests for the review module admin API.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation
 *  - GET /admin/reviews (list, pagination, filters: status, product_id, customer_id, q)
 *  - GET /admin/reviews/:id (detail with activity)
 *  - POST /admin/reviews/:id (update: plain fields, approve via status, reject via status)
 *  - DELETE /admin/reviews/:id (single delete)
 *  - DELETE /admin/reviews (bulk delete by ids)
 *  - POST /admin/reviews/approve (bulk approve)
 *  - POST /admin/reviews/reject (bulk reject)
 *
 * Reviews are created directly via the ReviewService since there is no store
 * submission endpoint — they arrive from a storefront integration.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=reviews
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createCustomerAccountWorkflow, createUserAccountWorkflow } from '@medusajs/medusa/core-flows'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api, getContainer }) => {
		let adminToken: string
		let reviewService: any

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			reviewService = container.resolve('review')

			const authService = container.resolve(Modules.AUTH)
			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'reviews-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'reviews-test@example.com',
						first_name: 'Reviews',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'reviews-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const FAKE_ID = 'rev_nonexistent'
			const endpoints = [
				['GET', '/admin/reviews', null],
				['DELETE', '/admin/reviews', { ids: [FAKE_ID] }],
				['GET', `/admin/reviews/${FAKE_ID}`, null],
				['POST', `/admin/reviews/${FAKE_ID}`, { status: 'approved' }],
				['DELETE', `/admin/reviews/${FAKE_ID}`, null],
				['POST', '/admin/reviews/approve', { ids: [FAKE_ID] }],
				['POST', '/admin/reviews/reject', { ids: [FAKE_ID] }]
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				let res: any
				if (method === 'GET') {
					res = await api.get(path).catch((e: any) => e.response)
				} else if (method === 'DELETE') {
					res = await api.delete(path, body ? { data: body } : undefined).catch((e: any) => e.response)
				} else {
					res = await api.post(path, body).catch((e: any) => e.response)
				}
				expect(res.status).toBe(401)
			})
		})

		// ── Validation ────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('DELETE /admin/reviews rejects missing ids', async () => {
				const res = await api
					.delete('/admin/reviews', { data: {}, headers: auth().headers })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/reviews rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/reviews', { data: { ids: [] }, headers: auth().headers })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/reviews/approve rejects missing ids', async () => {
				const res = await api
					.post('/admin/reviews/approve', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/reviews/reject rejects missing ids', async () => {
				const res = await api
					.post('/admin/reviews/reject', {}, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── List ─────────────────────────────────────────────────────────────────

		describe('GET /admin/reviews', () => {
			const PRODUCT_ID = 'prod_test_reviews_001'
			const PRODUCT_ID_2 = 'prod_test_reviews_002'
			const CUSTOMER_ID = 'cust_test_reviews_001'
			let reviewIds: string[] = []

			beforeAll(async () => {
				const created = await Promise.all([
					reviewService.createReviews({
						rating: 5,
						body: 'Excellent product',
						author_name: 'Alice Smith',
						author_email: 'alice@example.com',
						product_id: PRODUCT_ID,
						customer_id: CUSTOMER_ID,
						status: 'pending'
					}),
					reviewService.createReviews({
						rating: 3,
						body: 'It was okay',
						author_name: 'Bob Jones',
						product_id: PRODUCT_ID,
						status: 'approved'
					}),
					reviewService.createReviews({
						rating: 1,
						body: 'Did not work at all',
						author_name: 'Carol Davis',
						product_id: PRODUCT_ID_2,
						status: 'rejected'
					})
				])
				reviewIds = created.map((r: any) => r.id)
			})

			afterAll(async () => {
				await reviewService.deleteReviews(reviewIds).catch(() => {})
			})

			it('returns 200 with list shape', async () => {
				const res = await api.get('/admin/reviews', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.reviews)).toBe(true)
				expect(res.data.reviews.length).toBeGreaterThanOrEqual(3)
				expect(res.data.count).toBeGreaterThanOrEqual(3)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('filters by status=new', async () => {
				const res = await api.get('/admin/reviews?status=pending', auth())
				expect(res.status).toBe(200)
				expect(res.data.reviews.every((r: any) => r.status === 'pending')).toBe(true)
			})

			it('filters by status=approved', async () => {
				const res = await api.get('/admin/reviews?status=approved', auth())
				expect(res.status).toBe(200)
				expect(res.data.reviews.every((r: any) => r.status === 'approved')).toBe(true)
			})

			it('filters by status=rejected', async () => {
				const res = await api.get('/admin/reviews?status=rejected', auth())
				expect(res.status).toBe(200)
				expect(res.data.reviews.every((r: any) => r.status === 'rejected')).toBe(true)
			})

			it('filters by product_id', async () => {
				const res = await api.get(`/admin/reviews?product_id=${PRODUCT_ID}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.reviews.length).toBeGreaterThanOrEqual(2)
				expect(res.data.reviews.every((r: any) => r.product_id === PRODUCT_ID)).toBe(true)
			})

			it('filters by customer_id', async () => {
				const res = await api.get(`/admin/reviews?customer_id=${CUSTOMER_ID}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.reviews.every((r: any) => r.customer_id === CUSTOMER_ID)).toBe(true)
			})

			it('filters by q (author_name ilike)', async () => {
				const res = await api.get('/admin/reviews?q=Alice', auth())
				expect(res.status).toBe(200)
				expect(res.data.reviews.length).toBe(1)
				expect(
					res.data.reviews.every((r: any) =>
						(r.author_name as string).toLowerCase().includes('alice')
					)
				).toBe(true)
			})

			it('returns expected fields on each review', async () => {
				const res = await api.get(`/admin/reviews?product_id=${PRODUCT_ID}`, auth())
				const review = res.data.reviews.find((r: any) => r.id === reviewIds[0])
				expect(review).toMatchObject({
					id: reviewIds[0],
					status: 'pending',
					rating: 5,
					author_name: 'Alice Smith',
					product_id: PRODUCT_ID,
					customer_id: CUSTOMER_ID,
					created_at: expect.any(String)
				})
			})
		})

		// ── Detail ────────────────────────────────────────────────────────────────

		describe('GET /admin/reviews/:id', () => {
			let reviewId: string

			beforeAll(async () => {
				const review = await reviewService.createReviews({
					rating: 4,
					body: 'Pretty good',
					author_name: 'Detail Tester',
					status: 'pending'
				})
				reviewId = review.id
			})

			afterAll(async () => {
				await reviewService.deleteReviews([reviewId]).catch(() => {})
			})

			it('returns 200 with review and activity array', async () => {
				const res = await api.get(`/admin/reviews/${reviewId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.review).toMatchObject({
					id: reviewId,
					rating: 4,
					body: 'Pretty good',
					author_name: 'Detail Tester'
				})
				expect(Array.isArray(res.data.review.activity)).toBe(true)
			})

			it('returns 404 for unknown id', async () => {
				const res = await api
					.get('/admin/reviews/rev_does_not_exist_xyz', auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})
		})

		// ── Update (POST /:id) ────────────────────────────────────────────────────

		describe('POST /admin/reviews/:id', () => {
			let reviewId: string

			beforeAll(async () => {
				const review = await reviewService.createReviews({
					rating: 3,
					body: 'Average',
					author_name: 'Update Tester',
					status: 'pending'
				})
				reviewId = review.id
			})

			afterAll(async () => {
				await reviewService.deleteReviews([reviewId]).catch(() => {})
			})

			it('updates plain fields', async () => {
				const res = await api.post(
					`/admin/reviews/${reviewId}`,
					{ title: 'My updated title', rating: 4 },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.review.title).toBe('My updated title')
				expect(res.data.review.rating).toBe(4)
			})

			it('approves via status=approved', async () => {
				const res = await api.post(
					`/admin/reviews/${reviewId}`,
					{ status: 'approved' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.review.status).toBe('approved')
			})

			it('rejects via status=rejected', async () => {
				const res = await api.post(
					`/admin/reviews/${reviewId}`,
					{ status: 'rejected' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.review.status).toBe('rejected')
			})

			it('returns 404 for unknown id', async () => {
				const res = await api
					.post('/admin/reviews/rev_does_not_exist_xyz', { status: 'approved' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})
		})

		// ── Single delete ─────────────────────────────────────────────────────────

		describe('DELETE /admin/reviews/:id', () => {
			it('deletes a review and returns the id', async () => {
				const review = await reviewService.createReviews({
					rating: 2,
					body: 'Will be deleted',
					author_name: 'Delete Tester',
					status: 'pending'
				})

				const res = await api.delete(`/admin/reviews/${review.id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(review.id)
			})

			it('removes the review from subsequent list', async () => {
				const review = await reviewService.createReviews({
					rating: 2,
					body: 'Also will be deleted',
					author_name: 'Delete Tester 2',
					product_id: 'prod_delete_test_single',
					status: 'pending'
				})

				await api.delete(`/admin/reviews/${review.id}`, auth())

				const listRes = await api.get(
					'/admin/reviews?product_id=prod_delete_test_single',
					auth()
				)
				expect(listRes.data.reviews.some((r: any) => r.id === review.id)).toBe(false)
			})
		})

		// ── Bulk delete ───────────────────────────────────────────────────────────

		describe('DELETE /admin/reviews (bulk)', () => {
			it('deletes multiple reviews and returns the ids', async () => {
				const [r1, r2] = await Promise.all([
					reviewService.createReviews({
						rating: 1,
						body: 'Bulk delete 1',
						author_name: 'Bulk Deleter',
						status: 'pending'
					}),
					reviewService.createReviews({
						rating: 2,
						body: 'Bulk delete 2',
						author_name: 'Bulk Deleter',
						status: 'pending'
					})
				])

				const res = await api.delete('/admin/reviews', { data: { ids: [r1.id, r2.id] }, headers: auth().headers })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining([r1.id, r2.id]))
			})
		})

		// ── Bulk approve ──────────────────────────────────────────────────────────

		describe('POST /admin/reviews/approve', () => {
			let reviewIds: string[] = []

			beforeAll(async () => {
				const [r1, r2] = await Promise.all([
					reviewService.createReviews({
						rating: 5,
						body: 'Approve me 1',
						author_name: 'Approve Tester',
						status: 'pending'
					}),
					reviewService.createReviews({
						rating: 4,
						body: 'Approve me 2',
						author_name: 'Approve Tester',
						status: 'pending'
					})
				])
				reviewIds = [r1.id, r2.id]
			})

			afterAll(async () => {
				await reviewService.deleteReviews(reviewIds).catch(() => {})
			})

			it('approves multiple reviews and returns the ids', async () => {
				const res = await api.post('/admin/reviews/approve', { ids: reviewIds }, auth())
				expect(res.status).toBe(200)
				expect(res.data.approved).toEqual(expect.arrayContaining(reviewIds))
			})

			it('sets status to approved on each review', async () => {
				for (const id of reviewIds) {
					const detailRes = await api.get(`/admin/reviews/${id}`, auth())
					expect(detailRes.data.review.status).toBe('approved')
				}
			})

			it('creates approve activity on each review', async () => {
				for (const id of reviewIds) {
					const detailRes = await api.get(`/admin/reviews/${id}`, auth())
					const approveActivity = detailRes.data.review.activity.find(
						(a: any) => a.type === 'approve'
					)
					expect(approveActivity).toMatchObject({
						type: 'approve',
						user_id: expect.stringMatching(/^user_/)
					})
				}
			})
		})

		// ── Bulk reject ───────────────────────────────────────────────────────────

		describe('POST /admin/reviews/reject', () => {
			let reviewIds: string[] = []

			beforeAll(async () => {
				const [r1, r2] = await Promise.all([
					reviewService.createReviews({
						rating: 1,
						body: 'Reject me 1',
						author_name: 'Reject Tester',
						status: 'pending'
					}),
					reviewService.createReviews({
						rating: 2,
						body: 'Reject me 2',
						author_name: 'Reject Tester',
						status: 'pending'
					})
				])
				reviewIds = [r1.id, r2.id]
			})

			afterAll(async () => {
				await reviewService.deleteReviews(reviewIds).catch(() => {})
			})

			it('rejects multiple reviews and returns the ids', async () => {
				const res = await api.post('/admin/reviews/reject', { ids: reviewIds }, auth())
				expect(res.status).toBe(200)
				expect(res.data.rejected).toEqual(expect.arrayContaining(reviewIds))
			})

			it('sets status to rejected on each review', async () => {
				for (const id of reviewIds) {
					const detailRes = await api.get(`/admin/reviews/${id}`, auth())
					expect(detailRes.data.review.status).toBe('rejected')
				}
			})

			it('creates reject activity on each review', async () => {
				for (const id of reviewIds) {
					const detailRes = await api.get(`/admin/reviews/${id}`, auth())
					const rejectActivity = detailRes.data.review.activity.find(
						(a: any) => a.type === 'reject'
					)
					expect(rejectActivity).toMatchObject({
						type: 'reject',
						user_id: expect.stringMatching(/^user_/)
					})
				}
			})
		})

		// ── Store Routes ──────────────────────────────────────────────────────────

		describe('Store — /store/reviews/:productId', () => {
			const PRODUCT_ID = 'prod_store_reviews_001'
			const PRODUCT_ID_2 = 'prod_store_reviews_002'
			let customerToken: string
			let customerId: string
			let publishableApiKey: string

			beforeAll(async () => {
				const container = getContainer()

				// Create a publishable API key (required for /store/ routes)
				const scRes = await api.post('/admin/sales-channels', { name: 'Review Test Channel' }, auth())
				const salesChannelId = scRes.data.sales_channel.id

				const keyRes = await api.post('/admin/api-keys', {
					title: 'Review Test Key',
					type: 'publishable'
				}, auth())
				publishableApiKey = keyRes.data.api_key.token

				await api.post(`/admin/api-keys/${keyRes.data.api_key.id}/sales-channels`, {
					add: [salesChannelId]
				}, auth())

				// Create a customer with auth
				const authService = container.resolve(Modules.AUTH)
				const { authIdentity } = await authService.register('emailpass', {
					body: { email: 'store-reviewer@example.com', password: 'Sup3rSecret!' }
				})

				const { result } = await createCustomerAccountWorkflow(container).run({
					input: {
						authIdentityId: authIdentity!.id,
						customerData: {
							email: 'store-reviewer@example.com',
							first_name: 'Store',
							last_name: 'Reviewer'
						}
					}
				})
				customerId = result.id

				const loginRes = await api.post('/auth/customer/emailpass', {
					email: 'store-reviewer@example.com',
					password: 'Sup3rSecret!'
				})
				customerToken = loginRes.data.token

				// Seed some approved reviews for GET tests
				await Promise.all([
					reviewService.createReviews({
						rating: 5,
						body: 'Amazing product!',
						author_name: 'Existing Reviewer',
						product_id: PRODUCT_ID,
						status: 'approved'
					}),
					reviewService.createReviews({
						rating: 4,
						body: 'Pretty good',
						author_name: 'Another Reviewer',
						product_id: PRODUCT_ID,
						status: 'approved'
					}),
					reviewService.createReviews({
						rating: 2,
						body: 'Meh, not great',
						author_name: 'Other Person',
						product_id: PRODUCT_ID,
						customer_id: 'cus_someone_else',
						status: 'pending'
					})
				])
			})

			const storeHeaders = () => ({ headers: { 'x-publishable-api-key': publishableApiKey } })
			const customerAuth = () => ({
				headers: {
					Authorization: `Bearer ${customerToken}`,
					'x-publishable-api-key': publishableApiKey
				}
			})

			// ── POST tests ────────────────────────────────────────────────────────

			it('POST /store/reviews/:productId returns 401 without auth', async () => {
				const res = await api
					.post(`/store/reviews/${PRODUCT_ID}`, {
						rating: 5,
						body: 'Great!',
						author_name: 'Anon'
					}, storeHeaders())
					.catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})

			it('POST /store/reviews/:productId creates a review with pending status', async () => {
				const res = await api.post(
					`/store/reviews/${PRODUCT_ID_2}`,
					{
						rating: 4,
						title: 'Solid product',
						body: 'Would buy again',
						author_name: 'Store Reviewer'
					},
					customerAuth()
				)
				expect(res.status).toBe(201)
				expect(res.data.review).toMatchObject({
					rating: 4,
					title: 'Solid product',
					body: 'Would buy again',
					author_name: 'Store Reviewer',
					product_id: PRODUCT_ID_2,
					customer_id: customerId,
					status: 'pending'
				})
			})

			it('POST /store/reviews/:productId sets product_id from params and customer_id from auth context', async () => {
				const res = await api.post(
					`/store/reviews/${PRODUCT_ID}`,
					{
						rating: 3,
						body: 'Param test',
						author_name: 'Param Tester'
					},
					customerAuth()
				)
				expect(res.status).toBe(201)
				expect(res.data.review.product_id).toBe(PRODUCT_ID)
				expect(res.data.review.customer_id).toBe(customerId)
			})

			it('POST /store/reviews/:productId rejects missing required fields', async () => {
				const res = await api
					.post(`/store/reviews/${PRODUCT_ID}`, { rating: 5 }, customerAuth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			// ── GET tests ─────────────────────────────────────────────────────────

			it('GET /store/reviews/:productId returns only approved reviews (no auth)', async () => {
				const res = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				expect(res.status).toBe(200)
				expect(res.data.reviews.length).toBeGreaterThanOrEqual(2)
				expect(res.data.reviews.every((r: any) => r.status === 'approved')).toBe(true)
			})

			it('GET /store/reviews/:productId only returns reviews for the requested product', async () => {
				const res = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				expect(res.status).toBe(200)
				expect(res.data.reviews.length).toBeGreaterThanOrEqual(1)
				expect(res.data.reviews.every((r: any) => r.product_id === PRODUCT_ID)).toBe(true)
			})

			it('GET /store/reviews/:productId returns empty for product with no approved reviews', async () => {
				const res = await api.get('/store/reviews/prod_no_reviews_xyz', storeHeaders())
				expect(res.status).toBe(200)
				expect(res.data.reviews).toHaveLength(0)
				expect(res.data.count).toBe(0)
			})

			it('GET /store/reviews/:productId does not expose pending reviews to unauthenticated users', async () => {
				const res = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				expect(res.status).toBe(200)
				expect(res.data.reviews.some((r: any) => r.status === 'pending')).toBe(false)
			})

			it('GET /store/reviews/:productId includes user own pending reviews when authenticated', async () => {
				// Create a pending review for the authenticated customer
				await reviewService.createReviews({
					rating: 3,
					body: 'My pending review',
					author_name: 'Store Reviewer',
					product_id: PRODUCT_ID,
					customer_id: customerId,
					status: 'pending'
				})

				const res = await api.get(`/store/reviews/${PRODUCT_ID}`, customerAuth())
				expect(res.status).toBe(200)

				const pendingOwn = res.data.reviews.filter(
					(r: any) => r.status === 'pending' && r.customer_id === customerId
				)
				expect(pendingOwn.length).toBeGreaterThanOrEqual(1)
			})

			it('GET /store/reviews/:productId does not include other users pending reviews', async () => {
				const res = await api.get(`/store/reviews/${PRODUCT_ID}`, customerAuth())
				expect(res.status).toBe(200)

				const otherPending = res.data.reviews.filter(
					(r: any) => r.status === 'pending' && r.customer_id !== customerId
				)
				expect(otherPending).toHaveLength(0)
			})

			// ── Caching tests ─────────────────────────────────────────────────────

			it('GET /store/reviews/:productId returns cached response on second call', async () => {
				const res1 = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				expect(res1.status).toBe(200)

				const res2 = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				expect(res2.status).toBe(200)
				expect(res2.data.reviews).toEqual(res1.data.reviews)
			})

			it('approving a review via admin invalidates the store cache', async () => {
				// Create a pending review
				const pendingReview = await reviewService.createReviews({
					rating: 5,
					body: 'Will be approved',
					author_name: 'Cache Tester',
					product_id: PRODUCT_ID,
					status: 'pending'
				})

				// Prime the cache
				const before = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				const beforeIds = before.data.reviews.map((r: any) => r.id)
				expect(beforeIds).not.toContain(pendingReview.id)

				// Approve via admin
				await api.post(
					`/admin/reviews/${pendingReview.id}`,
					{ status: 'approved' },
					auth()
				)

				// Cache should be invalidated — the newly approved review should appear
				const after = await api.get(`/store/reviews/${PRODUCT_ID}`, storeHeaders())
				const afterIds = after.data.reviews.map((r: any) => r.id)
				expect(afterIds).toContain(pendingReview.id)
			})
		})
	}
})
