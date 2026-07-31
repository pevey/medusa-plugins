import { vi } from 'vitest'
import { loadRouteContracts, createContractFake, type ContractFake, type Responder } from 'admin-test-utils'
import middlewares from '../../api/middlewares'
import type { AdminForm } from '../types'

// Discovers routes from the real file tree so a route needs no `middlewares.ts` entry just to
// be visible here — `middlewares.ts` only supplies schemas/queryConfig for the routes that have
// them. Read as raw text, NOT executed: a route.ts pulls in `@medusajs/framework/utils` ->
// `jsonwebtoken`, which calls `util.inherits` and crashes the whole suite import once Vite
// externalizes Node's `util` for the browser. `loadRouteContracts` recovers the exported HTTP
// verbs by regex over the source text instead.
const routeModules = import.meta.glob('../../api/admin/**/route.ts', { eager: true, query: '?raw', import: 'default' })

export const contracts = loadRouteContracts(middlewares, { routeModules })

export function makeForm(overrides: Partial<AdminForm> = {}): AdminForm {
	return {
		id: 'form_1',
		name: 'Contact Us',
		handle: 'contact-us',
		description: 'Reach the team',
		active: true,
		turnstile_enabled: true,
		notification_emails: ['admin@example.com'],
		metadata: null,
		form_fields: [
			{
				id: 'fld_1',
				name: 'email',
				label: 'Email',
				field_type: 'email',
				required: true,
				sort_order: 0,
				form_id: 'form_1',
				created_at: '2026-01-15T10:00:00.000Z',
				updated_at: '2026-01-15T10:00:00.000Z'
			}
		],
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		...overrides
	}
}

// See the ratings setup (Task 7 Step 3) for why the mocked fetch resolves `currentFake` at call
// time instead of closing over the fake: `vi.resetModules()` does not evict an evaluated module
// graph in browser mode, so a second mount() in one file would otherwise keep talking to the
// first test's fake while the new one recorded zero calls.
let currentFake: ContractFake | undefined

export function installFake(responders: Record<string, Responder>) {
	const fake = createContractFake({ contracts, responders })
	currentFake = fake
	vi.doMock('../lib/sdk', () => ({
		sdk: {
			client: {
				fetch: (path: string, options?: Parameters<ContractFake['fetch']>[1]) => {
					if (!currentFake) throw new Error('[forms tests] no fake installed for this test')
					return currentFake.fetch(path, options)
				}
			}
		}
	}))
	return fake
}
