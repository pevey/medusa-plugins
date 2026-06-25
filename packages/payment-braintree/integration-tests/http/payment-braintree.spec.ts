/**
 * Placeholder integration test for the braintree payment provider.
 *
 * This plugin contributes a payment provider, not HTTP routes, so this
 * test just smoke-checks that the runner can boot a Medusa app with the
 * provider loaded by hitting a built-in admin endpoint unauthenticated.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=payment-braintree
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa-payment-braintree',
	inApp: true,
	disableAutoTeardown: true,
	env: {},
	testSuite: ({ api }) => {
		describe('Smoke', () => {
			it('boots with braintree provider and rejects unauthenticated admin requests', async () => {
				const res = await api.get('/admin/orders').catch((e: any) => e.response)
				expect(res.status).toBe(401)
			})
		})
	}
})
