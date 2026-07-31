import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder } from 'medusa-admin-test-utils'
import { installFake, makeAccessRole } from './setup.js'

const listResponders = (roles = [makeAccessRole()]): Record<string, Responder> => ({
	'GET /admin/access/roles': () => ({ roles, count: roles.length, limit: 50, offset: 0 })
})

const mount = async (responders: Record<string, Responder> = listResponders()) => {
	const fake = installFake(responders)
	const { default: RolesPage } = await import('../routes/settings/access-roles/page')
	const result = renderAdminRoute(RolesPage, { initialPath: '/settings/access-roles' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('access roles list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByText('Support Agent')).toBeInTheDocument()
		await expect.element(page.getByText('Handles customer support tickets.')).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Support Agent')).toBeInTheDocument()
		const first = fake.calls.find(call => call.method === 'GET' && call.path === '/admin/access/roles')
		// The page always sends its own explicit `limit` (its DataTable page size) regardless of
		// the route's implicit default for an omitted `limit` -- that default was separately
		// corrected from 20 to 50 to agree with `AdminGetAccessRolesParams`'s own
		// `createFindParams({ limit: 50, offset: 0 })` (see `query-config.ts`'s comment), but is
		// only ever observed by a caller that omits `limit` entirely, which this page never does.
		expect(first?.query).toMatchObject({ limit: 15, offset: 0 })
	})

	// Component bug found and fixed while writing this test: `RolesPage` declared `sorting` state
	// and wired it into `useDataTable`'s `sorting` prop (so the "Name"/"Created At" headers were
	// clickable and showed a sort icon), but never derived an `order` param from it for
	// `useAccessRolesList` -- the exact same bug shape already found and fixed in customer-tags'
	// list page. Clicking a sortable header had zero effect on the data actually fetched. Fixed in
	// `routes/settings/access-roles/page.tsx` (added the `order: sorting ? ... : undefined`
	// derivation) and `hooks/roles.ts` (widened `useAccessRolesList`'s params type to accept
	// `order?: string`). This assertion is what a passing-before-the-fix test would have missed,
	// per the same reasoning as customer-tags' equivalent test.
	it('sends only order values the route validator accepts when sorting columns', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Support Agent')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Name', exact: true }).click()
		await page.getByRole('button', { name: 'Name', exact: true }).click()

		const listCalls = fake.calls.filter(call => call.method === 'GET' && call.path === '/admin/access/roles')
		expect(listCalls.length).toBeGreaterThan(1)

		const VALID = ['name', '-name', 'created_at', '-created_at']
		for (const call of listCalls) {
			const sent = call.query?.order
			if (sent !== undefined) expect(VALID).toContain(sent)
		}
		expect(listCalls.some(call => ['name', '-name'].includes(call.query?.order as string))).toBe(true)
	})

	it('does not render an Invalid Date for the Created At column', async () => {
		await mount()
		await expect.element(page.getByText('Support Agent')).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})
})
