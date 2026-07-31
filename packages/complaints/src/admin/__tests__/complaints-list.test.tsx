import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder } from 'medusa-admin-test-utils'
import { installFake, makeComplaint } from './setup.js'

const listResponders = (complaints = [makeComplaint()]): Record<string, Responder> => ({
	'GET /admin/complaints': () => ({ complaints, count: complaints.length, limit: 15, offset: 0 })
})

const mount = async (responders: Record<string, Responder> = listResponders()) => {
	const fake = installFake(responders)
	const { default: ComplaintsPage } = await import('../routes/complaints/page')
	const result = renderAdminRoute(ComplaintsPage, { initialPath: '/complaints' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('complaints list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByRole('cell', { name: '1' })).toBeInTheDocument()
		await expect.element(page.getByRole('cell', { name: 'open' })).toBeInTheDocument()
		await expect.element(page.getByText('The widget arrived damaged.')).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('The widget arrived damaged.')).toBeInTheDocument()
		const first = fake.calls[0]
		expect(first.method).toBe('GET')
		expect(first.path).toBe('/admin/complaints')
		// The page defaults its `actionable` filter to `'true'` (see `ComplaintsPage`'s
		// `useState<DataTableFilteringState>({ actionable: 'true' })`), so the very first request
		// already carries it -- not just `limit`/`offset`.
		expect(first.query).toMatchObject({ limit: 15, offset: 0, actionable: 'true' })
	})

	// Unlike the customer-tags/access-roles list pages this rollout already found with the same
	// bug shape, `ComplaintsPage` DOES correctly derive `order` from its `sorting` state
	// (`order: sorting ? \`${sorting.desc ? '-' : ''}${sorting.id}\` : undefined`). This test pins
	// that it keeps working and that every value ever sent for `order`/`actionable`/`status` stays
	// inside what `AdminGetComplaints` accepts.
	it('sends only order/actionable/status values the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('The widget arrived damaged.')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Number', exact: true }).click()
		await page.getByRole('button', { name: 'Number', exact: true }).click()
		await page.getByRole('button', { name: 'Status', exact: true }).click()

		const listCalls = fake.calls.filter(call => call.method === 'GET' && call.path === '/admin/complaints')
		expect(listCalls.length).toBeGreaterThan(1)

		const VALID_ORDER = ['number', '-number', 'status', '-status']
		const VALID_ACTIONABLE = ['true', 'false']
		const VALID_STATUS = ['open', 'closed']
		for (const call of listCalls) {
			if (call.query?.order !== undefined) expect(VALID_ORDER).toContain(call.query.order)
			if (call.query?.actionable !== undefined) expect(VALID_ACTIONABLE).toContain(call.query.actionable)
			if (call.query?.status !== undefined) expect(VALID_STATUS).toContain(call.query.status)
		}
		expect(listCalls.some(call => ['number', '-number', 'status', '-status'].includes(call.query?.order as string))).toBe(true)
	})

	it('does not render an Invalid Date anywhere on the list page', async () => {
		// The list page's own columns (Number/Status/Description) carry no date column at all --
		// this is a defensive regression net in case a future column adds one, not proof of an
		// existing date rendering today.
		await mount()
		await expect.element(page.getByText('The widget arrived damaged.')).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})
})
