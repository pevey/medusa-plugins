import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'medusa-admin-test-utils'
import { installFake, makeAffiliate } from './setup.js'

const detailResponders = (affiliate = makeAffiliate()) => ({
	'GET /admin/affiliates/:id': () => ({ affiliate }),
	'POST /admin/affiliates/:id/addresses/:addressId': () => ({ id: 'afadd_1' }),
	'DELETE /admin/affiliates': () => ({ deleted: [affiliate.id] })
})

const mount = async (affiliate = makeAffiliate()) => {
	const fake = installFake(detailResponders(affiliate))
	const { default: AffiliateDetailPage } = await import('../routes/affiliates/[id]/page')
	const result = renderAdminRoute(AffiliateDetailPage, {
		initialPath: `/affiliates/${affiliate.id}`,
		routePath: '/affiliates/:id'
	})
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('affiliate detail view', () => {
	it('renders the fields the detail route returns', async () => {
		await mount()
		await expect.element(page.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument()
		await expect.element(page.getByText('jane@example.com')).toBeInTheDocument()
		// The fixture's single address renders as one formatted line via `formatAddress()`.
		await expect.element(page.getByText(/123 Main St/)).toBeInTheDocument()
		// The fixture's single promotion code.
		await expect.element(page.getByText('JANE10')).toBeInTheDocument()
	})

	// A live bug fixed during the response-contracts pass: the detail route previously did not
	// populate `campaign`/`application_method` on promotions at all, so a percentage code could
	// not be told apart from a fixed one (`affiliate-promotions-section.tsx`'s Type column reads
	// `p.application_method?.type === 'percentage' ? '%' : 'Fixed'` — with `application_method`
	// undefined this always rendered 'Fixed', regardless of the code's real discount type). Pin
	// that the fixture's percentage code (`application_method.type: 'percentage'`) renders as `%`
	// and NOT as `Fixed`.
	it('renders a percentage promotion code as "%", not "Fixed"', async () => {
		await mount()
		await expect.element(page.getByText('JANE10')).toBeInTheDocument()
		await expect.element(page.getByRole('cell', { name: '%', exact: true })).toBeInTheDocument()
		await expect.element(page.getByRole('cell', { name: 'Fixed' })).not.toBeInTheDocument()
	})

	it('posts an address update body the AdminUpdateAddress validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument()

		// Three `ActionMenu`s render on this page in DOM order: the affiliate header (0), the one
		// promotion row (1), then the one address row (2) — `AffiliatePromotionsSection` renders
		// before `AffiliateAddressesSection` on the detail page.
		await page.getByRole('button', { name: 'More actions' }).nth(2).click()
		await page.getByRole('menuitem', { name: 'Edit' }).click()
		await page.getByLabelText('First name').fill('Janet')
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so gate on the toast — the drawer only calls
		// `onOpenChange(false)` inside the try block after `update.mutateAsync` resolves.
		await expect.element(page.getByText('Address updated.')).toBeInTheDocument()

		const update = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/affiliates/aff_1/addresses/afadd_1')
		expect(update?.body).toEqual({
			first_name: 'Janet',
			last_name: 'Doe',
			company: null,
			address_1: '123 Main St',
			address_2: null,
			city: 'Portland',
			province: 'OR',
			country_code: 'us',
			postal_code: '97201',
			phone: null
		})
	})

	it('navigates back to the in-app list path after delete', async () => {
		// `/affiliates`, not `/app/affiliates` — Medusa mounts the dashboard under a configurable
		// `admin.path`, and React Router supplies that as the router basename, so plugin code
		// navigates with the bare in-app path.
		const result = await mount()
		await expect.element(page.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument()

		// Delete lives behind the header's ActionMenu (index 0) then a usePrompt confirm dialog.
		await page.getByRole('button', { name: 'More actions' }).nth(0).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		// Only the confirm dialog's Delete button is present now — Radix marks the rest of the
		// page `aria-hidden` while the (modal) AlertDialog is open.
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/affiliates'))
	})
})
