import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'admin-test-utils'
import { installFake, makeForm } from './setup.js'

const responders = (forms = [makeForm()]) => ({
	'GET /admin/forms': () => ({ forms, count: forms.length, limit: 15, offset: 0 }),
	'POST /admin/forms': () => ({ form: makeForm({ id: 'form_2', name: 'New Form' }) }),
	'DELETE /admin/forms': () => ({ deleted: ['form_1'] })
})

const mount = async (overrides = responders()) => {
	const fake = installFake(overrides)
	const { default: FormsPage } = await import('../routes/settings/forms/page')
	const result = renderAdminRoute(FormsPage, { initialPath: '/settings/forms' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('forms list view', () => {
	it('renders a row from fields the route returns', async () => {
		await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()
		await expect.element(page.getByText('contact-us')).toBeInTheDocument()
		await expect.element(page.getByText('Active')).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()
		expect(fake.calls[0].query).toMatchObject({ limit: 15, offset: 0 })
	})

	it('posts a create body the AdminCreateForm validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Create' }).click()
		await page.getByLabelText('Name').fill('Support Request')
		// The toolbar's "Create" button is aria-hidden while the modal is open (Radix Dialog marks
		// background content inert), so only the modal's submit button is accessible by role here —
		// no `.nth(1)` needed or possible (a second-index wait would time out with zero elements).
		await page.getByRole('button', { name: 'Create' }).click()

		// `fake.calls` is recorded BEFORE validation (fake-sdk.ts pushes the call, then parses the
		// body), so a call landing in the log does not prove the AdminCreateForm validator accepted
		// it — a rejected request would still show up here. The modal only calls `setOpen(false)`
		// inside the `try` block, after `createForm(...)` has actually resolved, so waiting for it
		// to close is what proves acceptance, the same way the sibling ratings suite gates on a
		// validator-accepted value instead of the call log alone (see reviews-list.test.tsx).
		await expect
			.element(page.getByRole('heading', { name: 'Create Form' }))
			.not.toBeInTheDocument()

		const create = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/forms')
		expect(create).toBeDefined()
		expect(create?.body).toMatchObject({
			name: 'Support Request',
			handle: 'support-request',
			active: true,
			turnstile_enabled: true,
			notification_emails: null,
			form_fields: []
		})
	})

	it('rejects a handle the server regex refuses even though the client regex allows it', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Create' }).click()
		await page.getByLabelText('Name').fill('A')
		await page.getByLabelText('Handle').fill('a--b')
		await page.getByRole('button', { name: 'Create' }).click()

		// The client zod allows 'a--b'; the server's handleSchema does not. The contract fake
		// surfaces that as a rejected request, and the modal reports the failure.
		await expect.element(page.getByText('Failed to create form')).toBeInTheDocument()
		expect(fake.calls.some(call => call.method === 'POST' && call.path === '/admin/forms')).toBe(
			true
		)
	})
})
