import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder, type ResponderContext } from 'medusa-admin-test-utils'
import { installFake, makeCustomerTag } from './setup.js'

const listResponders = (customer_tags = [makeCustomerTag()]): Record<string, Responder> => ({
	'GET /admin/customer-tags': () => ({ customer_tags, count: customer_tags.length, limit: 15, offset: 0 }),
	'POST /admin/customer-tags': () => ({ customer_tag: makeCustomerTag({ id: 'ctag_2', value: 'Wholesale' }) }),
	'DELETE /admin/customer-tags': () => ({ deleted: ['ctag_1'] })
})

const mount = async (responders: Record<string, Responder> = listResponders()) => {
	const fake = installFake(responders)
	const { default: CustomerTagsPage } = await import('../routes/settings/customer-tags/page')
	const result = renderAdminRoute(CustomerTagsPage, { initialPath: '/settings/customer-tags' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('customer tags list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()
		const first = fake.calls[0]
		expect(first.method).toBe('GET')
		expect(first.path).toBe('/admin/customer-tags')
		// This plugin's `defaultLimit` was corrected from 20 to 15 to agree with
		// `AdminGetCustomerTags`'s own `createFindParams({ limit: 15 })` (see
		// contract-invariants.test.ts, invariant #2) — assert the corrected value.
		expect(first.query).toMatchObject({ limit: 15, offset: 0 })
	})

	// customer-tags has no `filters` prop on its DataTable (no status/enum select like
	// reviews' Status filter), so there is no multi-value select to catch spreading a bare
	// string into characters. The nearest equivalent "enum" surface is `order`: a fixed set
	// of column-id / `-`column-id strings the sortable headers can produce. Exercising it
	// caught a real bug — see below.
	it('sends only order values the route validator accepts when sorting columns', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()

		// The column header itself is the sort control (no separate `DataTable.SortingMenu`
		// is rendered in the toolbar) — clicking it toggles asc/desc/none directly.
		await page.getByRole('button', { name: 'Value' }).click()
		await page.getByRole('button', { name: 'Value' }).click()

		const listCalls = fake.calls.filter(call => call.method === 'GET' && call.path === '/admin/customer-tags')
		expect(listCalls.length).toBeGreaterThan(1)

		// The general invariant: every `order` this UI ever sends must be a value the route's
		// own validator accepts (or absent). `fake.calls` is recorded BEFORE validation, so
		// this loop is what would have caught the bug below rather than a single last-call
		// check.
		const VALID = ['value', '-value', 'created_at', '-created_at', 'updated_at', '-updated_at']
		for (const call of listCalls) {
			const sent = call.query?.order
			if (sent !== undefined) expect(VALID).toContain(sent)
		}

		// Component bug found and fixed while writing this test: the page declared `sorting`
		// state and wired it into `useDataTable`'s `sorting` prop (so the header was clickable
		// and showed a sort icon), but never derived an `order` param from it for
		// `useCustomerTagsList` — unlike the sibling `forms` and `ratings` pages, which both
		// compute `order: sorting ? \`${sorting.desc ? '-' : ''}${sorting.id}\` : ...`. Clicking
		// a sortable header had zero effect on the data actually fetched. Fixed in
		// `routes/settings/customer-tags/page.tsx` and `hooks/customer-tags.ts` to match the
		// forms pattern (no default order, since this plugin's validator has none). This
		// assertion is what a passing-before-the-fix test would have missed.
		expect(listCalls.some(call => ['value', '-value'].includes(call.query?.order as string))).toBe(true)
	})

	it('does not render an Invalid Date for a date column', async () => {
		await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})

	it('posts a create body the AdminCreateCustomerTag validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()

		// `exact`: without it this substring-matches the "Created At" sortable column header.
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await page.getByLabelText('Tag Value').fill('Wholesale')
		// The toolbar's "Create" button is aria-hidden while the FocusModal is open, so only
		// the modal's submit button (labelled "Save") is reachable here.
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so gate on the toast — the modal only
		// calls `setOpen(false)` inside `onSuccess`.
		await expect.element(page.getByText('Customer tag created successfully')).toBeInTheDocument()

		const create = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/customer-tags')
		expect(create?.body).toEqual({ value: 'Wholesale' })
	})

	it('deletes the selected rows via the command bar and removes them from the list', async () => {
		let tags = [makeCustomerTag()]
		const responders = {
			'GET /admin/customer-tags': () => ({ customer_tags: tags, count: tags.length, limit: 15, offset: 0 }),
			'DELETE /admin/customer-tags': ({ body }: ResponderContext) => {
				const { ids } = body as { ids: string[] }
				tags = tags.filter(tag => !ids.includes(tag.id))
				return { deleted: ids }
			}
		}
		const { fake } = await mount(responders)
		await expect.element(page.getByText('VIP')).toBeInTheDocument()

		// Row selection has no accessible name of its own; index 0 is the header's
		// "select all" checkbox, index 1 is the fixture's single row.
		await page.getByRole('checkbox').nth(1).click()
		await page.getByRole('button', { name: 'Delete' }).click()
		// The command bar's own "Delete" button is still in the DOM behind the confirm
		// AlertDialog, but Radix marks it `aria-hidden` while the (modal) dialog is open, so
		// this is unambiguous — same reasoning as the detail-page delete flow.
		await page.getByRole('button', { name: 'Delete' }).click()

		// Gate on the row actually disappearing (proves the DELETE body was accepted and the
		// list refetched), not just on the call being present in the log.
		await expect.element(page.getByText('VIP')).not.toBeInTheDocument()

		const del = fake.calls.find(call => call.method === 'DELETE' && call.path === '/admin/customer-tags')
		expect(del?.body).toEqual({ ids: ['ctag_1'] })
	})
})
