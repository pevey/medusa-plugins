import { vi } from 'vitest'
import { loadRouteContracts, createContractFake, type ContractFake, type Responder } from 'medusa-admin-test-utils'
import middlewares from '../../api/middlewares'
import type { AdminStatisticsDaily, AdminStatisticsRecentOrder } from '../types'

// Discovers routes from the real file tree so a route needs no `middlewares.ts` entry just to
// be visible here — `middlewares.ts` only supplies schemas/queryConfig for the routes that have
// them (`/admin/statistics/layout` GET and `/admin/statistics/recalculate` POST take no params,
// so neither is wired at all; see contract-invariants.test.ts). Read as raw text, NOT executed:
// a route.ts pulls in `@medusajs/framework/utils` -> `jsonwebtoken`, which calls `util.inherits`
// and crashes the whole suite import once Vite externalizes Node's `util` for the browser.
// `loadRouteContracts` recovers the exported HTTP verbs by regex over the source text instead.
const routeModules = import.meta.glob('../../api/admin/**/route.ts', { eager: true, query: '?raw', import: 'default' })

export const contracts = loadRouteContracts(middlewares, { routeModules })

export function makeStatisticsDaily(overrides: Partial<AdminStatisticsDaily> = {}): AdminStatisticsDaily {
	return {
		id: 'statday_1',
		date: '2026-01-15T00:00:00.000Z',
		revenue_total: 1250.5,
		order_count: 12,
		average_order_value: 104.21,
		new_customer_count: 3,
		returning_customer_count: 9,
		pending_fulfillment_count: 2,
		low_stock_count: 1,
		top_products: [{ product_id: 'prod_1', title: 'Widget', quantity_sold: 5 }],
		metadata: null,
		created_at: '2026-01-15T00:00:00.000Z',
		updated_at: '2026-01-15T00:00:00.000Z',
		deleted_at: null,
		...overrides
	}
}

export function makeRecentOrder(overrides: Partial<AdminStatisticsRecentOrder> = {}): AdminStatisticsRecentOrder {
	return {
		id: 'order_1',
		display_id: 1001,
		status: 'pending',
		email: 'customer@example.com',
		total: 99.99,
		created_at: '2026-01-15T00:00:00.000Z',
		customer_id: 'cus_1',
		customer: { id: 'cus_1', first_name: 'Jane', last_name: 'Doe' },
		...overrides
	}
}

/**
 * The fake the mocked SDK is currently pointed at. The mocked module's `fetch` reads this at
 * CALL time rather than closing over one fake, because `vi.resetModules()` does not evict an
 * already-evaluated module graph in browser mode: a second `mount()` in the same file re-runs
 * `vi.doMock`, but the component keeps the sdk module it already imported. Closing over the fake
 * meant the second test's component talked to the FIRST test's fake — it rendered fine while the
 * new fake recorded zero calls, so any assertion on `fake.calls` silently examined the wrong
 * object. Indirection makes stale module identity harmless.
 */
let currentFake: ContractFake | undefined

/**
 * Installs a contract-checked fake over the plugin's admin SDK. Every request the
 * components make is validated against the plugin's own validators before a responder runs.
 */
export function installFake(responders: Record<string, Responder>) {
	const fake = createContractFake({ contracts, responders })
	currentFake = fake
	vi.doMock('../lib/sdk', () => ({
		sdk: {
			client: {
				fetch: (path: string, options?: Parameters<ContractFake['fetch']>[1]) => {
					if (!currentFake) throw new Error('[statistics tests] no fake installed for this test')
					return currentFake.fetch(path, options)
				}
			}
		}
	}))
	return fake
}
