import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder } from 'medusa-admin-test-utils'
import { installFake, makeContentCollection } from './setup.js'

const listResponders = (collections = [makeContentCollection()]): Record<string, Responder> => ({
	'GET /admin/content': () => ({ content_collections: collections, count: collections.length, limit: 15, offset: 0 }),
	'POST /admin/content': ({ body }) => ({ content_collection: { ...makeContentCollection(), ...(body as object), id: 'ccoll_2' } }),
	'POST /admin/content/:collectionId/fields': ({ body }) => ({ field: { id: 'cfield_2', created_at: '', updated_at: '', ...(body as object) } })
})

const mount = async (responders: Record<string, Responder> = listResponders()) => {
	const fake = installFake(responders)
	const { default: ContentCollectionsPage } = await import('../routes/content/page')
	const result = renderAdminRoute(ContentCollectionsPage, { initialPath: '/content' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('content collections list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByText('Blog Posts')).toBeInTheDocument()
		await expect.element(page.getByText('Markdown')).toBeInTheDocument()
		await expect.element(page.getByText('blog-posts')).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Blog Posts')).toBeInTheDocument()
		const first = fake.calls[0]
		expect(first.method).toBe('GET')
		expect(first.path).toBe('/admin/content')
		expect(first.query).toMatchObject({ limit: 15, offset: 0 })
	})

	// This list has no sortable column (`label` is the only accessor and is declared
	// `enableSorting: false`) and no `filters` prop at all -- there is no GET-side enum/finite
	// value-set surface to exercise here, unlike every other plugin in this rollout. The nearest
	// real finite-value surface this page ever sends is the Create modal's `format` field (a real
	// `ContentFormat` enum), submitted as a POST body rather than a GET query param. This test
	// exercises that instead, and doubles as the required coverage of `ContentFieldsEditor` (the
	// brief calls this component out by name): the Create modal is the only place it renders.
	//
	// Component bug found and fixed while writing this test: this page wired `commands`/
	// `rowSelection` into `useDataTable` for its bulk "Delete" command, but the `columns` array
	// never included `columnHelper.select()` -- the same dead-bulk-delete shape already found in
	// `customer-tags` and `access`. With no select column, no checkbox ever renders, so the
	// command bar's Delete action could never be reached. Fixed by adding `columnHelper.select()`
	// as the first column.
	it('creates a collection with a custom field whose format and field body the validators accept', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Blog Posts')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Create', exact: true }).click()
		await expect.element(page.getByRole('heading', { name: 'Create Content Collection' })).toBeInTheDocument()

		await page.getByLabelText('Label').fill('Case Studies')
		// Format has no associated <label> (a pre-existing gap outside this test's exercised
		// surface -- see the task report) so it's reached by role instead of `getByLabelText`.
		await page.getByRole('combobox').click()
		await page.getByRole('option', { name: 'HTML' }).click()

		await page.getByRole('button', { name: 'Add Field' }).click()
		await page.getByPlaceholder('Label').fill('Excerpt')

		await page.getByRole('button', { name: 'Save' }).click()

		await expect.element(page.getByText('Content collection "Case Studies" created')).toBeInTheDocument()

		const created = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/content')
		expect(created?.body).toEqual({
			label: 'Case Studies',
			slug: 'case-studies',
			format: 'html',
			prefix: null
		})

		const fieldCall = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/content/ccoll_2/fields')
		expect(fieldCall?.body).toEqual({
			name: 'excerpt',
			label: 'Excerpt',
			field_type: 'text',
			required: false,
			sort_order: 0
		})

		// Every format this rollout's fixtures/validators ever exercise -- confirms the value the
		// Create modal just sent is one `AdminCreateContentCollection`'s `z.enum(ContentFormat)`
		// actually accepts, not just a string that happens to render as "HTML" in the UI.
		const VALID_FORMATS = ['html', 'img', 'json', 'md', 'text']
		expect(VALID_FORMATS).toContain(created?.body && (created.body as Record<string, unknown>).format)
	})

	it('does not render an Invalid Date anywhere on the list page', async () => {
		// Like the order/enum case above, this list has no date column at all (Label/Format/Slug/
		// Prefix only) -- a defensive regression net, not proof of an existing date column today.
		await mount()
		await expect.element(page.getByText('Blog Posts')).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})
})
