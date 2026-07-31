import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'medusa-admin-test-utils'
import { installFake, makeReview } from './setup.js'

const listResponders = (reviews = [makeReview()]) => ({
	'GET /admin/reviews': () => ({ reviews, count: reviews.length, limit: 20, offset: 0 }),
	'POST /admin/reviews/approve': () => ({ approved: ['rev_1'] }),
	'POST /admin/reviews/reject': () => ({ rejected: ['rev_1'] }),
	'POST /admin/reviews/feature': () => ({ featured: ['rev_1'] }),
	'DELETE /admin/reviews': () => ({ deleted: ['rev_1'] })
})

const mount = async (responders = listResponders()) => {
	const fake = installFake(responders)
	const { default: ReviewsPage } = await import('../routes/reviews/page')
	const result = renderAdminRoute(ReviewsPage, { initialPath: '/reviews' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('reviews list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()
		await expect.element(page.getByText('5 / 5')).toBeInTheDocument()
		// Scoped to the row: the toolbar's status filter chip also reads "Pending", and a bare
		// getByText matches both.
		await expect.element(page.getByRole('cell', { name: 'Pending' })).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()
		const first = fake.calls[0]
		expect(first.method).toBe('GET')
		expect(first.path).toBe('/admin/reviews')
		expect(first.query).toMatchObject({ limit: 20, offset: 0, order: '-created_at' })
	})

	it('sends a valid status after using the Status filter', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument()

		// The list opens with a status filter already applied, so the chip itself is the entry
		// point — there is no separate "Filter" trigger to open first. The chip reads
		// "Status is [Pending]"; its value button opens a popover of Pending/Approved/Rejected.
		await page.getByRole('button', { name: 'Pending' }).click()
		await page.getByRole('button', { name: 'Approved' }).click()

		const listCalls = fake.calls.filter(call => call.path === '/admin/reviews')

		// Exact value, not `toContain('approved')`. `@medusajs/ui`'s select filter is
		// multi-value — it computes `[...(filter ?? []), value]` — so if the filter state is
		// seeded with a bare string, 'pending' spreads into its characters and the query goes out
		// as ['p','e','n','d','i','n','g','approved']. A `toContain('approved')` check passes
		// against that garbage, because the spread array does contain 'approved' at the end.
		expect(listCalls.at(-1)?.query?.status).toEqual(['pending', 'approved'])

		// And the general invariant: every status this UI ever sends must be a value the route's
		// own validator accepts. `fake.calls` is recorded BEFORE validation, and a rejected
		// request only lands in react-query's error state, so asserting on the log alone would
		// not notice the fake throwing.
		const VALID = ['pending', 'approved', 'rejected']
		for (const call of listCalls) {
			const sent = call.query?.status
			const values = sent === undefined ? [] : Array.isArray(sent) ? sent : [sent]
			for (const value of values) expect(VALID).toContain(value)
		}
	})

	it('does not render an Invalid Date for the Received column', async () => {
		await mount()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})
})
