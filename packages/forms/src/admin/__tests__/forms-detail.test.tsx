import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'admin-test-utils'
import { installFake, makeForm } from './setup.js'

const responders = (form = makeForm()) => ({
	'GET /admin/forms/:id': () => ({ form }),
	'POST /admin/forms/:id': () => ({ form }),
	'DELETE /admin/forms/:id': () => ({ id: form.id, object: 'form', deleted: true })
})

const mount = async (form = makeForm()) => {
	const fake = installFake(responders(form))
	const { default: FormDetailPage } = await import('../routes/settings/forms/[id]/page')
	const result = renderAdminRoute(FormDetailPage, {
		initialPath: `/settings/forms/${form.id}`,
		routePath: '/settings/forms/:id'
	})
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('form detail view', () => {
	it('renders the attributes the detail route returns', async () => {
		await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()
		// `exact: true`: without it this substring-matches the "POST /forms/contact-us" store
		// endpoint hint rendered lower on the page, which also contains "contact-us".
		await expect.element(page.getByText('contact-us', { exact: true })).toBeInTheDocument()
		await expect.element(page.getByText('admin@example.com')).toBeInTheDocument()
	})

	it('renders form_fields, which depend on the nested defaults staying in place', async () => {
		await mount()
		// `.first()`: the fixture's field_type is 'email', whose FORM_FIELD_TYPE_OPTIONS label is
		// also "Email" — so the type badge coincidentally renders the same text as field.label.
		// `.first()` targets the label, which the JSX renders before the badge; this isn't the
		// "skip an aria-hidden duplicate" anti-pattern (both elements are real, visible, distinct
		// nested-field values), just disambiguating two legitimately different pieces of content
		// that happen to share a string for this fixture.
		await expect.element(page.getByText('Email', { exact: true }).first()).toBeInTheDocument()
		await expect.element(page.getByText('email', { exact: true })).toBeInTheDocument()
	})

	it('posts an update body the AdminUpdateForm validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Edit' }).click()
		await page.getByLabelText('Name').fill('Contact Us v2')
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded BEFORE validation (fake-sdk.ts pushes the call, then parses the
		// body), so a call landing in the log does not prove the AdminUpdateForm validator accepted
		// it — a rejected request would still show up here. The drawer only calls `setOpen(false)`
		// inside the `try` block, after `updateForm(...)` has actually resolved, so waiting for it
		// to close is what proves acceptance, the same way the sibling ratings suite gates on a
		// validator-accepted value instead of the call log alone (see reviews-list.test.tsx).
		await expect.element(page.getByRole('heading', { name: 'Edit Form' })).not.toBeInTheDocument()

		const update = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/forms/form_1')
		expect(update?.body).toMatchObject({
			name: 'Contact Us v2',
			handle: 'contact-us',
			form_fields: [{ id: 'fld_1', name: 'email', label: 'Email', field_type: 'email', required: true }]
		})
	})

	it('navigates back to the list after delete', async () => {
		const result = await mount()
		await expect.element(page.getByText('Contact Us')).toBeInTheDocument()

		// Delete lives behind the ActionMenu dropdown, then a usePrompt confirm dialog — the same
		// two-step flow as ratings' detail page (see reviews-detail.test.tsx). A bare
		// `getByRole('button', { name: 'Delete' })` matches nothing before the menu opens (the
		// menu item is `role="menuitem"`, not a button) and `.nth(1)` on it would wait forever.
		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/settings/forms'))
	})
})
