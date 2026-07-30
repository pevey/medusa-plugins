import { vi } from 'vitest'
import {
	loadRouteContracts,
	createContractFake,
	type ContractFake,
	type Responder
} from 'admin-test-utils'
import middlewares from '../../api/middlewares'
import type { AdminReview } from '../types'

export const contracts = loadRouteContracts(middlewares)

export function makeReview(overrides: Partial<AdminReview> = {}): AdminReview {
	return {
		id: 'rev_1',
		status: 'pending',
		rating: 5,
		title: 'Great product',
		body: 'Exceeded expectations.',
		author_name: 'Ada Lovelace',
		author_email: 'ada@example.com',
		product_id: 'prod_1',
		order_id: null,
		customer_id: null,
		featured: false,
		metadata: null,
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
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
					if (!currentFake) throw new Error('[ratings tests] no fake installed for this test')
					return currentFake.fetch(path, options)
				}
			}
		}
	}))
	return fake
}
