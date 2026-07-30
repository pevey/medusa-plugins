import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'admin-test-utils'
import { installFake, makeReview } from './setup.js'

const detailResponders = (review = makeReview()) => ({
	'GET /admin/reviews/:id': () => ({
		review: {
			...review,
			activity: [
				{
					id: 'act_1',
					review_id: review.id,
					user_id: 'usr_1',
					type: 'submit',
					note: null,
					metadata: null,
					created_at: '2026-01-15T10:00:00.000Z',
					updated_at: '2026-01-15T10:00:00.000Z'
				}
			]
		}
	}),
	'POST /admin/reviews/:id': () => ({ review: { ...review, status: 'approved' } }),
	'POST /admin/reviews/feature': () => ({ featured: [review.id] }),
	'DELETE /admin/reviews/:id': () => ({ id: review.id, object: 'review', deleted: true })
})

const mount = async (review = makeReview()) => {
	const fake = installFake(detailResponders(review))
	const { default: ReviewDetailPage } = await import('../routes/reviews/[id]/page')
	const result = renderAdminRoute(ReviewDetailPage, {
		initialPath: `/reviews/${review.id}`,
		routePath: '/reviews/:id'
	})
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('review detail view', () => {
	it('renders the fields the detail route returns', async () => {
		await mount()
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()
		await expect.element(page.getByText('ada@example.com')).toBeInTheDocument()
		await expect.element(page.getByText('Exceeded expectations.')).toBeInTheDocument()
	})

	it('renders the activity timeline, which depends on `activity.*` staying in defaults', async () => {
		await mount()
		await expect.element(page.getByText('submit')).toBeInTheDocument()
	})

	it('sends a body the update validator accepts when approving', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()
		await page.getByRole('button', { name: 'Approve' }).click()

		// Gate on the success toast BEFORE inspecting the call log. `fake.calls` is populated
		// before validation runs, so a body the validator rejected would still be in the log and
		// this test would pass while the request actually threw (the page would show
		// 'Failed to approve review' instead). The toast only fires from the mutation's onSuccess.
		await expect.element(page.getByText('Review approved')).toBeInTheDocument()

		const approve = fake.calls.find(call => call.method === 'POST' && call.path.endsWith('rev_1'))
		expect(approve?.body).toEqual({ status: 'approved' })
	})

	it('sends the inverse of the current featured value when toggling', async () => {
		const { fake } = await mount(makeReview({ featured: true }))
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()
		await page.getByRole('button', { name: /feature/i }).click()

		// Same reasoning as the approve test: the toast proves the request was accepted, the body
		// assertion proves it was the right one. The fixture is `featured: true`, so the success
		// message is the unfeature one.
		await expect.element(page.getByText('Review unfeatured')).toBeInTheDocument()

		const call = fake.calls.find(c => c.path === '/admin/reviews/feature')
		expect(call?.body).toEqual({ ids: ['rev_1'], featured: false })
	})

	it('navigates back to the in-app list path after delete', async () => {
		// `/reviews`, not `/app/reviews`. Medusa mounts the dashboard under a CONFIGURABLE
		// `admin.path` (`ADMIN_PATH`, `/dashboard` in apps/backend, `/app` in stock Medusa) and
		// React Router supplies that as the router basename — so plugin code navigates with the
		// bare in-app path. Hardcoding `/app/...` would break every deployment that sets
		// ADMIN_PATH. The other four plugins in this repo (complaints, tracing, affiliates,
		// ratings) all use the bare form.
		const result = await mount()
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()

		// Delete lives behind the ActionMenu dropdown, then a usePrompt confirm dialog.
		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		// Now only the confirm dialog's Delete button is present, so this is unambiguous.
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/reviews'))
	})
})
