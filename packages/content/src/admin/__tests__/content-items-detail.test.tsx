import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder } from 'medusa-admin-test-utils'
import { installFake, makeContentItem, makeContentCollection } from './setup.js'
import type { AdminContentItem } from '../types'

const baseItem = (): AdminContentItem =>
	makeContentItem({
		id: 'citem_1',
		title: 'Hello World',
		slug: 'hello-world',
		body: 'Some plain-text body content.',
		status: 'draft',
		published_at: null,
		content_collection_id: 'ccoll_1',
		content_collection: makeContentCollection({ id: 'ccoll_1', format: 'text', content_fields: [] })
	})

const detailResponders = (item: AdminContentItem): Record<string, Responder> => ({
	'GET /admin/content/:collectionId/items/:itemId': () => ({ content_item: item }),
	'POST /admin/content/:collectionId/items/:itemId': ({ body }) => ({
		content_item: { ...item, ...(body as object) }
	}),
	'DELETE /admin/content/:collectionId/items': () => ({ ids: [item.id], deleted: true })
})

const mount = async (item: AdminContentItem = baseItem()) => {
	const fake = installFake(detailResponders(item))
	const { default: ContentItemEditorPage } = await import('../routes/content/[collectionId]/items/[itemId]/page')
	const result = renderAdminRoute(ContentItemEditorPage, {
		initialPath: `/content/${item.content_collection_id}/items/${item.id}`,
		routePath: '/content/:collectionId/items/:itemId'
	})
	return { fake, item, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('content item detail view', () => {
	it('renders the detail fields the route returns', async () => {
		await mount()
		await expect.element(page.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument()
		await expect.element(page.getByText('draft')).toBeInTheDocument()
		await expect.element(page.getByText('hello-world')).toBeInTheDocument()
		await expect.element(page.getByText('Some plain-text body content.')).toBeInTheDocument()
	})

	// Live bug-fix pin: `ITEM_DETAIL_FIELDS` (middlewares.ts) did not used to include the flat
	// `content_collection_id` FK column -- only the nested `content_collection.id`. `useContentItem`
	// would then hand `EditContentItemDrawer` an item whose `content_collection_id` was silently
	// `undefined`, so `useUpdateContentItem(item.content_collection_id, item.id)` built its request
	// URL as `/admin/content/undefined/items/:itemId`, which always 404'd. `content_collection_id`
	// is now in `defaults`; this test's `baseItem()` sets it explicitly, and the assertion below
	// checks the update actually lands on the real per-collection path.
	it('posts an update to the correct per-collection path (content_collection_id bug fix)', async () => {
		const item = baseItem()
		const { fake } = await mount(item)
		await expect.element(page.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Edit' }).click()
		await expect.element(page.getByRole('heading', { name: 'Edit Item' })).toBeInTheDocument()

		await page.getByLabelText('Title').fill('Hello World, Updated')
		await page.getByRole('button', { name: 'Save', exact: true }).click()

		await expect.element(page.getByText('Item updated')).toBeInTheDocument()

		const update = fake.calls.find(call => call.method === 'POST' && call.path === `/admin/content/${item.content_collection_id}/items/${item.id}`)
		expect(update).toBeDefined()
		// The bug this pins: before the fix, `item.content_collection_id` was `undefined`, so this
		// call's path was `/admin/content/undefined/items/citem_1` and never matched the real route
		// -- the fake would have thrown "no route in this plugin's middlewares matches" instead.
		expect(update?.path).not.toContain('undefined')
		expect(update?.body).toEqual({
			title: 'Hello World, Updated',
			slug: item.slug,
			published_at: null
		})
	})

	it('saves the plain-text body via the Save button', async () => {
		const item = baseItem()
		const { fake } = await mount(item)
		await expect.element(page.getByText('Some plain-text body content.')).toBeInTheDocument()

		await page.getByRole('textbox').fill('Updated plain-text body.')
		await page.getByRole('button', { name: 'Save', exact: true }).click()

		await expect.element(page.getByText('Saved')).toBeInTheDocument()
		const update = fake.calls.filter(call => call.method === 'POST' && call.path === `/admin/content/${item.content_collection_id}/items/${item.id}`).at(-1)
		expect(update?.body).toEqual({ body: 'Updated plain-text body.' })
	})

	it('navigates back to the in-app items list path after deleting the item', async () => {
		// `/content/:collectionId/items`, not `/app/content/...` -- Medusa mounts the dashboard
		// under a configurable `admin.path`, and React Router supplies that as the router basename,
		// so plugin code navigates with the bare in-app path.
		const item = baseItem()
		const result = await mount(item)
		await expect.element(page.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain(`/content/${item.content_collection_id}/items`))
	})
})
