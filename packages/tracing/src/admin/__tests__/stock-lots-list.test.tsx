import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute, type Responder, type ResponderContext } from 'medusa-admin-test-utils'
import { installFake, makeStockLot } from './setup.js'

const listResponders = (stock_lots = [makeStockLot()]): Record<string, Responder> => ({
	'GET /admin/stock-lots': () => ({ stock_lots, count: stock_lots.length, limit: 15, offset: 0 })
})

const mount = async (responders: Record<string, Responder> = listResponders()) => {
	const fake = installFake(responders)
	const { default: StockLotsPage } = await import('../routes/stock-lots/page')
	const result = renderAdminRoute(StockLotsPage, { initialPath: '/stock-lots' })
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('stock lots list view', () => {
	it('renders a row from fields the route actually returns', async () => {
		await mount()
		await expect.element(page.getByText('LOT-001')).toBeInTheDocument()
		// `inventory_item.title` / `stock_location.name` only render because this page overrides
		// the request with `fields: '*inventory_item,*stock_location'` — not part of the route's
		// own `defaults` (see contract-invariants.test.ts's comment on the same route).
		await expect.element(page.getByText('Widget')).toBeInTheDocument()
		await expect.element(page.getByText('Main Warehouse')).toBeInTheDocument()
		await expect.element(page.getByRole('cell', { name: 'Enabled' })).toBeInTheDocument()
	})

	it('sends an initial query the route validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('LOT-001')).toBeInTheDocument()
		const first = fake.calls.find(call => call.method === 'GET' && call.path === '/admin/stock-lots')
		expect(first?.query).toMatchObject({ limit: 15, offset: 0 })
	})

	it('sends only order values the route validator accepts when sorting columns', async () => {
		const { fake } = await mount()
		await expect.element(page.getByText('LOT-001')).toBeInTheDocument()

		// The column header itself is the sort control (no separate `DataTable.SortingMenu` is
		// rendered in this toolbar) — clicking it toggles asc/desc/none directly.
		await page.getByRole('button', { name: 'Lot Number', exact: true }).click()
		await page.getByRole('button', { name: 'Lot Number', exact: true }).click()

		const listCalls = fake.calls.filter(call => call.method === 'GET' && call.path === '/admin/stock-lots')
		expect(listCalls.length).toBeGreaterThan(1)

		// `inventory_item.title` / `stock_location.name` are declared `enableSorting: false`, so
		// they can never appear here — only the three sortable columns can.
		const VALID = ['lot_number', '-lot_number', 'stocked_quantity', '-stocked_quantity', 'enabled', '-enabled']
		for (const call of listCalls) {
			const sent = call.query?.order
			if (sent !== undefined) expect(VALID).toContain(sent)
		}
		expect(listCalls.some(call => ['lot_number', '-lot_number'].includes(call.query?.order as string))).toBe(true)
	})

	it('does not render an Invalid Date anywhere on the page', async () => {
		// The stock-lots list table itself has no date column (Lot Number / Item / Location /
		// Stocked Quantity / Status) — this assertion is kept for consistency with every other
		// list test even though there's no date cell here to actually break.
		await mount()
		await expect.element(page.getByText('LOT-001')).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})

	it('deletes the selected rows via the useCommands() bulk path and removes them from the list', async () => {
		let stockLots = [makeStockLot()]
		const responders: Record<string, Responder> = {
			'GET /admin/stock-lots': () => ({ stock_lots: stockLots, count: stockLots.length, limit: 15, offset: 0 }),
			'DELETE /admin/stock-lots': ({ body }: ResponderContext) => {
				const { ids } = body as { ids: string[] }
				stockLots = stockLots.filter(lot => !ids.includes(lot.id))
				return { deleted: ids }
			}
		}
		const { fake } = await mount(responders)
		await expect.element(page.getByText('LOT-001')).toBeInTheDocument()

		// Row selection has no accessible name of its own; index 0 is the header's "select all"
		// checkbox, index 1 is the fixture's single row.
		await page.getByRole('checkbox').nth(1).click()
		// Three commands render in the bar (Enable/Disable/Delete) once a row is selected — labels
		// are distinct so a plain name query is unambiguous.
		await page.getByRole('button', { name: 'Delete' }).click()
		// The command bar's own "Delete" button is still in the DOM behind the confirm
		// AlertDialog, but Radix marks it `aria-hidden` while the (modal) dialog is open, so this
		// second query is unambiguous.
		await page.getByRole('button', { name: 'Delete' }).click()

		// Gate on the row actually disappearing (proves the DELETE body was accepted and the list
		// refetched), not just on the call being present in the log.
		await expect.element(page.getByText('LOT-001')).not.toBeInTheDocument()

		const del = fake.calls.find(call => call.method === 'DELETE' && call.path === '/admin/stock-lots')
		expect(del?.body).toEqual({ ids: ['stocklot_1'] })
	})
})
