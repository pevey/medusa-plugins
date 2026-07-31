import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'medusa-admin-test-utils'
import { installFake, makeCustomerTag } from './setup.js'

const detailResponders = (customerTag = makeCustomerTag()) => ({
	'GET /admin/customer-tags/:id': () => ({ customer_tag: customerTag }),
	'POST /admin/customer-tags/:id': () => ({ customer_tag: { ...customerTag, value: 'Enterprise' } }),
	'DELETE /admin/customer-tags': () => ({ deleted: [customerTag.id] })
})

const mount = async (customerTag = makeCustomerTag()) => {
	const fake = installFake(detailResponders(customerTag))
	const { default: CustomerTagDetailPage } = await import('../routes/settings/customer-tags/[id]/page')
	const result = renderAdminRoute(CustomerTagDetailPage, {
		initialPath: `/settings/customer-tags/${customerTag.id}`,
		routePath: '/settings/customer-tags/:id'
	})
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('customer tag detail view', () => {
	it('renders the fields the detail route returns', async () => {
		await mount()
		await expect.element(page.getByText('Customer Tag Details')).toBeInTheDocument()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()
	})

	it('posts an update body the AdminUpdateCustomerTag validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()

		// Edit lives behind the ActionMenu dropdown, same as the sibling ratings/forms detail
		// pages — the icon-only trigger only has an accessible name via `aria-label`.
		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Edit' }).click()
		await page.getByLabelText('Value').fill('Enterprise')
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so gate on the toast — the drawer only
		// calls `setOpen(false)` inside `onSuccess`.
		await expect.element(page.getByText('Customer tag updated successfully')).toBeInTheDocument()

		const update = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/customer-tags/ctag_1')
		expect(update?.body).toEqual({ value: 'Enterprise' })
	})

	it('navigates back to the in-app list path after delete', async () => {
		// `/settings/customer-tags`, not `/app/settings/customer-tags` — Medusa mounts the
		// dashboard under a configurable `admin.path`, and React Router supplies that as the
		// router basename, so plugin code navigates with the bare in-app path (see
		// reviews-detail.test.tsx and forms-detail.test.tsx for the same rule).
		const result = await mount()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		// Only the confirm dialog's Delete button is present now — Radix marks the rest of the
		// page `aria-hidden` while the (modal) AlertDialog is open.
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/settings/customer-tags'))
	})
})
