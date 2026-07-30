import { vi } from 'vitest'
import {
	loadRouteContracts,
	createContractFake,
	type ContractFake,
	type Responder
} from 'admin-test-utils'
import middlewares from '../../api/middlewares'
import type { AdminForm } from '../types'

export const contracts = loadRouteContracts(middlewares)

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
