/**
 * Placeholder integration tests for the barcode module.
 *
 * Verifies the admin route is mounted and the auth middleware rejects
 * unauthenticated requests. Replace with full CRUD coverage when ready.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=barcodes
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-barcode',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api }) => {
		describe('Authentication', () => {
			it('GET /admin/barcodes returns 401 without auth token', async () => {
				const res = await api.get('/admin/barcodes').catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})
		})
	}
})
