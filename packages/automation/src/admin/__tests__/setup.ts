import { vi } from 'vitest'
import { loadRouteContracts, createContractFake, type ContractFake, type Responder } from 'medusa-admin-test-utils'
import middlewares from '../../api/middlewares'
import type { AutomationTrigger, AutomationAction } from '../types'

// Discovers routes from the real file tree so a route needs no `middlewares.ts` entry just to
// be visible here — `middlewares.ts` only supplies schemas/queryConfig for the routes that have
// them (this plugin's detail routes deliberately have none; see contract-invariants.test.ts).
// Read as raw text, NOT executed: a route.ts pulls in `@medusajs/framework/utils` ->
// `jsonwebtoken`, which calls `util.inherits` and crashes the whole suite import once Vite
// externalizes Node's `util` for the browser. `loadRouteContracts` recovers the exported HTTP
// verbs by regex over the source text instead.
const routeModules = import.meta.glob('../../api/admin/**/route.ts', { eager: true, query: '?raw', import: 'default' })

export const contracts = loadRouteContracts(middlewares, { routeModules })

export function makeTrigger(overrides: Partial<AutomationTrigger> = {}): AutomationTrigger {
	return {
		id: 'autrig_1',
		name: 'Order Placed Webhook',
		description: null,
		trigger_type: 'medusa_event',
		is_active: true,
		trigger_events: ['order.placed'],
		has_signing_key: false,
		signature_config: null,
		log_incoming: false,
		metadata: null,
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		...overrides
	}
}

export function makeAction(overrides: Partial<AutomationAction> = {}): AutomationAction {
	return {
		id: 'auact_1',
		trigger_id: 'autrig_1',
		name: 'Notify Slack',
		description: null,
		action_type: 'outgoing_webhook',
		is_active: true,
		target_url: 'https://example.com/webhook',
		request_method: null,
		target_headers: null,
		signing_secret_id: null,
		medusa_workflow: null,
		field_mappings: null,
		static_values: null,
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
					if (!currentFake) throw new Error('[automation tests] no fake installed for this test')
					return currentFake.fetch(path, options)
				}
			}
		}
	}))
	return fake
}
