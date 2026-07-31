import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'medusa-admin-test-utils'
import { installFake, makeAffiliate } from './setup.js'

const listResponders = (affiliates = [makeAffiliate()]) => ({
	'GET /admin/affiliates': () => ({ affiliates, count: affiliates.length, limit: 20, offset: 0 }),
	'POST /admin/affiliates': () => ({ affiliate: { affiliate_id: 'aff_2' } })
})

const mount = async (responders = listResponders()) => {
	const fake = installFake(responders)
	const { default: AffiliatesPage } = await import('../routes/affiliates/page')
	const result = renderAdminRoute(AffiliatesPage, { initialPath: '/affiliates' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('affiliates list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByText('Jane Doe')).toBeInTheDocument()
		await expect.element(page.getByText('jane@example.com')).toBeInTheDocument()
		// Scoped to the row: `active` is also the value of the Status filter's option label
		// (rendered lowercase here as the badge text, not "Active" as in the filter menu), but
		// scoping to the cell avoids relying on that case difference.
		await expect.element(page.getByRole('cell', { name: 'active' })).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Jane Doe')).toBeInTheDocument()
		const first = fake.calls[0]
		expect(first.method).toBe('GET')
		expect(first.path).toBe('/admin/affiliates')
		expect(first.query).toMatchObject({ limit: 20, offset: 0 })
	})

	// affiliates' `status` DataTable filter is a real multiselect (the same shape as the
	// `reviews' Status filter that the multi-value-spread bug lives in), but its trigger is an
	// icon-only `IconButton` that @medusajs/ui's `DataTable.FilterMenu` renders with no
	// `aria-label` at all (confirmed by reading `data-table-filter-menu.js` — the `tooltip` prop
	// only wraps it in a `Tooltip`, it never sets an accessible name), so it can't be reached with
	// a role+name query. Sorting is the reachable finite-value-set surface here instead, same
	// adaptation as customer-tags used when it had no filters at all.
	it('sends only order values the route validator accepts when sorting columns', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Jane Doe')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Name', exact: true }).click()
		await page.getByRole('button', { name: 'Name', exact: true }).click()

		const listCalls = fake.calls.filter(call => call.method === 'GET' && call.path === '/admin/affiliates')
		expect(listCalls.length).toBeGreaterThan(1)

		const VALID = ['name', '-name', 'email', '-email', 'created_at', '-created_at']
		for (const call of listCalls) {
			const sent = call.query?.order
			if (sent !== undefined) expect(VALID).toContain(sent)
		}
		expect(listCalls.some(call => ['name', '-name'].includes(call.query?.order as string))).toBe(true)
	})

	it('does not render an Invalid Date for the Created column', async () => {
		await mount()
		await expect.element(page.getByText('Jane Doe')).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})

	it('posts a create body the AdminCreateAffiliate validator accepts and navigates to the new detail page', async () => {
		const { fake, ...result } = await mount()
		await expect.element(page.getByText('Jane Doe')).toBeInTheDocument()

		// `exact`: without it this substring-matches the "Created" sortable column header.
		await page.getByRole('button', { name: 'Create', exact: true }).click()
		// `exact`: label queries are substring-matched too — 'Name' would otherwise also resolve
		// 'First name'/'Last name', and 'Code' would also resolve 'Country code'.
		await page.getByLabelText('Name', { exact: true }).fill('Wholesale Corp')
		await page.getByLabelText('Email', { exact: true }).fill('wholesale@example.com')
		await page.getByLabelText('Code', { exact: true }).fill('WHOLESALE10')
		// Discount value/type/all other fields are left at their defaults (10 / percentage / all
		// optional address+contact fields empty) — the point of this test is the top-level
		// required fields, not an exhaustive fill.
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so gate on the toast — the modal only calls
		// `onOpenChange(false)` inside the try block after `create.mutateAsync` resolves.
		await expect.element(page.getByText('Affiliate Wholesale Corp created.')).toBeInTheDocument()

		const create = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/affiliates')
		expect(create?.body).toEqual({
			name: 'Wholesale Corp',
			email: 'wholesale@example.com',
			phone: null,
			currency_code: null,
			address: {
				first_name: null,
				last_name: null,
				company: null,
				address_1: null,
				address_2: null,
				city: null,
				province: null,
				country_code: null,
				postal_code: null,
				phone: null
			},
			first_promotion: {
				code: 'WHOLESALE10',
				discount_type: 'percentage',
				discount_value: 10,
				end_date: null
			}
		})

		await vi.waitFor(() => expect(result.navigations).toContain('/affiliates/aff_2'))
	})
})
