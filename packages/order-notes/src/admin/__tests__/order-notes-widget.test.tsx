import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder } from 'medusa-admin-test-utils'
import { installFake, makeOrderNote, makeOrder } from './setup.js'

const responders = (order_notes = [makeOrderNote()]): Record<string, Responder> => ({
	'GET /admin/order-notes': () => ({ order_notes, count: order_notes.length, limit: 20, offset: 0 })
})

// order-notes has no admin routes of its own — this is a widget, so it never mounts inside the
// harness's router. Wrap it the way the brief's skeleton describes for widgets: renderAdminRoute
// passes no props, so the widget's own `data` prop has to come from the wrapper closure.
const mount = async (overrides: Record<string, Responder> = responders()) => {
	const fake = installFake(overrides)
	const { default: OrderNotesWidget } = await import('../widgets/order-notes')
	const result = renderAdminRoute(() => <OrderNotesWidget data={makeOrder()} />)
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('order notes widget', () => {
	it('renders an existing note', async () => {
		await mount()
		await expect.element(page.getByText('Called the customer to confirm delivery window.')).toBeInTheDocument()
	})

	it('sends a note body the AdminCreateOrderNote validator accepts', async () => {
		let notes = [makeOrderNote()]
		const overrides: Record<string, Responder> = {
			'GET /admin/order-notes': () => ({ order_notes: notes, count: notes.length, limit: 20, offset: 0 }),
			'POST /admin/order-notes': () => {
				const created = makeOrderNote({ id: 'ordnote_2', note: 'Follow-up call scheduled.', sent: false })
				notes = [...notes, created]
				return { order_note: created }
			}
		}
		const { fake } = await mount(overrides)
		await expect.element(page.getByText('Called the customer to confirm delivery window.')).toBeInTheDocument()

		await page.getByRole('button', { name: 'Add Note' }).click()
		await page.getByPlaceholder('Write a note...').fill('Follow-up call scheduled.')
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so a rejected body would still show up
		// there — gate on the new note actually rendering, which only happens once the mutation
		// resolves and its `onSuccess` invalidates the `order-notes` query and the widget
		// refetches through the (now updated) responder above.
		await expect.element(page.getByText('Follow-up call scheduled.')).toBeInTheDocument()

		const create = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/order-notes')
		expect(create?.body).toEqual({ order_id: 'order_1', note: 'Follow-up call scheduled.', sent: false })
	})

	it('deletes a note', async () => {
		let notes = [makeOrderNote()]
		const overrides: Record<string, Responder> = {
			'GET /admin/order-notes': () => ({ order_notes: notes, count: notes.length, limit: 20, offset: 0 }),
			'DELETE /admin/order-notes/:id': ({ params }) => {
				notes = notes.filter(note => note.id !== params.id)
				return { deleted: [params.id] }
			}
		}
		const { fake } = await mount(overrides)
		await expect.element(page.getByText('Called the customer to confirm delivery window.')).toBeInTheDocument()

		// The delete trigger is an icon-only native `<button>`; its only accessible name comes
		// from `aria-label="Delete note"` (no confirm prompt on this widget, unlike the list/detail
		// delete flows elsewhere in this repo).
		await page.getByRole('button', { name: 'Delete note' }).click()

		await expect.element(page.getByText('Note deleted')).toBeInTheDocument()
		await expect.element(page.getByText('Called the customer to confirm delivery window.')).not.toBeInTheDocument()

		const del = fake.calls.find(call => call.method === 'DELETE')
		expect(del?.path).toBe('/admin/order-notes/ordnote_1')
	})
})
