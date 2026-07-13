/**
 * Placeholder integration tests for the analytics module.
 *
 * Verifies the admin route is mounted and the auth middleware rejects
 * unauthenticated requests. Replace with full coverage when ready.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=analytics
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-analytics',
	inApp: true,
	env: {},
	testSuite: ({ api }) => {
		describe('Authentication', () => {
			it('GET /admin/analytics/events returns 401 without auth token', async () => {
				const res = await api.get('/admin/analytics/events').catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})
		})
	}
})
