import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder } from 'medusa-admin-test-utils'
import { installFake, makeComplaint, makeComplaintTag, makeComplaintActivity } from './setup.js'
import type { AdminComplaint } from '../types'

const baseComplaint = (): AdminComplaint =>
	makeComplaint({
		actionable: true,
		reportable: true,
		metadata: { priority: 'high' },
		customer: { id: 'cus_1', email: 'jane@example.com' } as unknown as AdminComplaint['customer'],
		tags: [makeComplaintTag()]
	})

const detailResponders = (complaint: AdminComplaint, activities: ReturnType<typeof makeComplaintActivity>[] = []): Record<string, Responder> => ({
	'GET /admin/complaints/:id': () => ({ complaint }),
	'GET /admin/complaints/:id/documents': () => ({ documents: [], count: 0, limit: 50, offset: 0 }),
	'GET /admin/complaints/:id/activities': () => ({ activities, count: activities.length, limit: 15, offset: 0 }),
	// Unconditionally fetched by `EditComplaintDrawer`, which is always mounted (just hidden)
	// regardless of its own `open` prop.
	'GET /admin/complaint-tags': () => ({ complaint_tags: [], count: 0, limit: 100, offset: 0 }),
	'POST /admin/complaints/:id': ({ body }) => ({ complaint: { ...complaint, ...(body as object) } }),
	'DELETE /admin/complaints': () => ({ ids: [complaint.id], object: 'complaint', deleted: true }),
	'POST /admin/complaints/:id/notes': () => ({ activity: makeComplaintActivity() }),
	'POST /admin/complaints/:id/notes/:note_id': () => ({ activity: makeComplaintActivity() }),
	// The real file lives at `src/api/admin/complaints/[id]/notes/[noteId]/route.ts` -- its DELETE
	// export has no zod schema, so it's only ever registered via `routeModules` file-system
	// discovery, which derives the matcher's param name from the folder (`:noteId`, camelCase),
	// NOT from `setup.ts`'s hand-written `:note_id` (snake_case) used for the schema-carrying POST
	// entry above. Both matchers are structurally identical (same segment shape), so this is easy
	// to get wrong: the responder key must match the discovered matcher exactly.
	'DELETE /admin/complaints/:id/notes/:noteId': () => ({ deleted: ['cact_note'] })
	// GET /admin/customers/:id (EditComplaintDrawer's useCustomerWithOrders) is a core Medusa
	// route this plugin doesn't own and has no contract for -- deliberately left unanswered, as
	// `tracing`'s onboarding already established for the equivalent `/admin/stock-locations` case:
	// the fetch throws, react-query's `useQuery` swallows it into an error state, and nothing this
	// suite asserts on depends on that query succeeding.
})

const mount = async (complaint: AdminComplaint = baseComplaint(), activities: ReturnType<typeof makeComplaintActivity>[] = []) => {
	const fake = installFake(detailResponders(complaint, activities))
	const { default: ComplaintDetailPage } = await import('../routes/complaints/[id]/page')
	const result = renderAdminRoute(ComplaintDetailPage, {
		initialPath: `/complaints/${complaint.id}`,
		routePath: '/complaints/:id'
	})
	return { fake, complaint, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('complaint detail view', () => {
	it('renders the detail fields the route returns, including actionable/reportable and tags', async () => {
		await mount()
		await expect.element(page.getByRole('heading', { name: 'Complaint Details' })).toBeInTheDocument()
		await expect.element(page.getByText('open')).toBeInTheDocument()
		await expect.element(page.getByRole('link', { name: 'jane@example.com' })).toBeInTheDocument()

		// Live bug-fix pin: `GET /admin/complaints/:id`'s `queryConfig.defaults` did not used to
		// include `actionable`/`reportable`, so the fake (like the real route) would have silently
		// dropped both fields and the page's `complaint.actionable ? 'Yes' : 'No'` would always have
		// rendered "No" regardless of the real value. The fixture sets both `true`; both rows must
		// now read "Yes".
		await expect.element(page.getByText('Yes').nth(0)).toBeInTheDocument()
		await expect.element(page.getByText('Yes').nth(1)).toBeInTheDocument()
		await expect.element(page.getByText('VIP')).toBeInTheDocument()
		await expect.element(page.getByText('The widget arrived damaged.')).toBeInTheDocument()
	})

	it('posts an update body that round-trips metadata and reflects a toggled switch', async () => {
		const complaint = baseComplaint()
		const { fake } = await mount(complaint)
		await expect.element(page.getByRole('heading', { name: 'Complaint Details' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Edit' }).click()
		await expect.element(page.getByRole('heading', { name: 'Edit Complaint' })).toBeInTheDocument()

		await page.getByLabelText('Reportable').click()
		await page.getByRole('button', { name: 'Save', exact: true }).click()

		// Gate on the toast: `fake.calls` is recorded before validation, so a rejected request
		// still lands in the array.
		await expect.element(page.getByText('Complaint updated successfully')).toBeInTheDocument()

		const update = fake.calls.filter(call => call.method === 'POST' && call.path === `/admin/complaints/${complaint.id}`).at(-1)
		expect(update?.body).toEqual({
			number: complaint.number,
			status: complaint.status,
			description: complaint.description,
			order_id: null,
			product_id: null,
			actionable: true,
			// Toggled off by the click above.
			reportable: false,
			// Live bug-fix pin: `metadata` used to be missing from this route's `queryConfig.defaults`,
			// so `useComplaint` never saw it, the edit form's `defaultValues.metadata` stayed `null`,
			// and every save silently wiped any real metadata back to `null`. It's now included in
			// `defaults`, so the form round-trips the fixture's real value unchanged.
			metadata: { priority: 'high' },
			tag_ids: ['ctag_1']
		})
	})

	it('renders the activity timeline (a live contract check on the route defaults) and creates a note the validator accepts', async () => {
		const activities = [
			makeComplaintActivity({ id: 'cact_open', type: 'open', note: null, created_at: '2026-01-15T09:00:00.000Z' }),
			makeComplaintActivity({ id: 'cact_note', type: 'note', note: 'Followed up with the customer by phone.', created_at: '2026-01-15T11:00:00.000Z' })
		]
		const complaint = baseComplaint()
		const { fake } = await mount(complaint, activities)

		await expect.element(page.getByText('Complaint opened')).toBeInTheDocument()
		await expect.element(page.getByText('Note Added')).toBeInTheDocument()
		await expect.element(page.getByText('Followed up with the customer by phone.')).toBeInTheDocument()
		// `user.first_name`/`user.last_name` render here only because `user.*` is still in
		// `GET /admin/complaints/:id/activities`'s `queryConfig.defaults` -- if a future edit drops
		// it, the fake projects `entry.user` away entirely and this line (or the component itself,
		// which destructures `entry.user` unconditionally) breaks.
		await expect.element(page.getByText('Jane Doe').nth(0)).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()

		await page.getByRole('button', { name: 'Add Note' }).click()
		await expect.element(page.getByRole('heading', { name: 'Add Complaint Note' })).toBeInTheDocument()
		await page.getByLabelText('Note', { exact: true }).fill('New note about a follow-up shipment.')
		await page.getByRole('button', { name: 'Save', exact: true }).click()

		await expect.element(page.getByText('Note created successfully')).toBeInTheDocument()
		const created = fake.calls.filter(call => call.method === 'POST' && call.path === `/admin/complaints/${complaint.id}/notes`).at(-1)
		expect(created?.body).toEqual({ note: 'New note about a follow-up shipment.' })
	})

	it('edits an existing note via its action menu and sends a body the validator accepts', async () => {
		const activities = [makeComplaintActivity({ id: 'cact_note', type: 'note', note: 'Original note text.' })]
		const complaint = baseComplaint()
		const { fake } = await mount(complaint, activities)
		await expect.element(page.getByText('Original note text.')).toBeInTheDocument()

		// Index 0 is the detail page's own header ActionMenu (Edit/Delete complaint); index 1 is
		// this note entry's ActionMenu (Edit Note/Delete Note) -- both share the same icon-only
		// `aria-label="More actions"` trigger.
		await page.getByRole('button', { name: 'More actions' }).nth(1).click()
		await page.getByRole('menuitem', { name: 'Edit Note' }).click()
		await expect.element(page.getByRole('heading', { name: 'Edit Complaint Note' })).toBeInTheDocument()

		await page.getByLabelText('Note', { exact: true }).fill('Updated note text.')
		await page.getByRole('button', { name: 'Save', exact: true }).click()

		await expect.element(page.getByText('Note updated successfully')).toBeInTheDocument()

		const updated = fake.calls.filter(call => call.method === 'POST' && call.path === `/admin/complaints/${complaint.id}/notes/cact_note`).at(-1)
		expect(updated?.body).toEqual({ note: 'Updated note text.' })
	})

	// Component bug found and fixed while writing this test: `ComplaintActivityEntry`'s "Delete
	// Note" action menu item was entirely dead -- it called a top-level `const handleDeleteNote =
	// () => {}` no-op, and the `deleteNote` mutation returned by `useDeleteNote(...)` was destructured
	// but never invoked anywhere in the component. Clicking "Delete Note" did nothing at all: no
	// confirm prompt, no request, no feedback. Fixed by wiring `handleDeleteNote` to prompt for
	// confirmation and call the existing `deleteNote` mutation, matching every other delete flow in
	// this plugin (detail-page complaint delete, complaint-tag delete).
	it('deletes a note via its action menu (previously a dead no-op)', async () => {
		const activities = [makeComplaintActivity({ id: 'cact_note', type: 'note', note: 'Note to be deleted.' })]
		const complaint = baseComplaint()
		const { fake } = await mount(complaint, activities)
		await expect.element(page.getByText('Note to be deleted.')).toBeInTheDocument()

		// Index 0 is the detail page's own header ActionMenu; index 1 is this note entry's.
		await page.getByRole('button', { name: 'More actions' }).nth(1).click()
		await page.getByRole('menuitem', { name: 'Delete Note' }).click()
		await expect.element(page.getByText('Delete note?')).toBeInTheDocument()
		// Only the confirm dialog's own Delete button is present now -- Radix marks the rest of the
		// page `aria-hidden` while the (modal) AlertDialog is open.
		await page.getByRole('button', { name: 'Delete' }).click()

		await expect.element(page.getByText('Note deleted successfully')).toBeInTheDocument()
		const deleted = fake.calls.find(call => call.method === 'DELETE' && call.path === `/admin/complaints/${complaint.id}/notes/cact_note`)
		expect(deleted).toBeDefined()
	})

	it('navigates back to the in-app list path after deleting the complaint', async () => {
		// `/complaints`, not `/app/complaints` -- Medusa mounts the dashboard under a configurable
		// `admin.path`, and React Router supplies that as the router basename, so plugin code
		// navigates with the bare in-app path.
		const complaint = baseComplaint()
		const result = await mount(complaint)
		await expect.element(page.getByRole('heading', { name: 'Complaint Details' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/complaints'))
	})
})
