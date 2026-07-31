import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'medusa-admin-test-utils'
import { installFake, makeStockLot, makeSerialNumber } from './setup.js'

const detailResponders = (stockLot = makeStockLot(), serialNumbers = [makeSerialNumber()]) => ({
	'GET /admin/stock-lots/:id': () => ({ stock_lot: stockLot }),
	'GET /admin/stock-lots/:id/serial-numbers': () => ({
		serial_numbers: serialNumbers,
		count: serialNumbers.length,
		limit: 10,
		offset: 0
	}),
	'POST /admin/stock-lots/:id': () => ({ stock_lot: { ...stockLot, lot_number: 'LOT-002' } }),
	'DELETE /admin/stock-lots': () => ({ deleted: [stockLot.id] })
})

const mount = async (stockLot = makeStockLot(), serialNumbers = [makeSerialNumber()]) => {
	const fake = installFake(detailResponders(stockLot, serialNumbers))
	const { default: StockLotDetailPage } = await import('../routes/stock-lots/[id]/page')
	const result = renderAdminRoute(StockLotDetailPage, {
		initialPath: `/stock-lots/${stockLot.id}`,
		routePath: '/stock-lots/:id'
	})
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('stock lot detail view', () => {
	it('renders the fields the detail route returns, including the nested serial numbers table', async () => {
		await mount()
		await expect.element(page.getByRole('heading', { name: 'Stock Lot Details' })).toBeInTheDocument()
		await expect.element(page.getByText('LOT-001')).toBeInTheDocument()
		await expect.element(page.getByText('Widget')).toBeInTheDocument()
		await expect.element(page.getByText('Main Warehouse')).toBeInTheDocument()
		// Unlike the list page (a plain text cell), the detail page renders Status as a Badge
		// inside a `dl`-style grid, not a table cell.
		await expect.element(page.getByText('Enabled')).toBeInTheDocument()

		// SerialNumbersTable, nested on this page.
		await expect.element(page.getByRole('heading', { name: 'Serial Numbers' })).toBeInTheDocument()
		await expect.element(page.getByRole('cell', { name: 'SN-0001' })).toBeInTheDocument()
		await expect.element(page.getByRole('cell', { name: 'order_1' })).toBeInTheDocument()
	})

	it('does not render an Invalid Date in the serial numbers table', async () => {
		await mount()
		await expect.element(page.getByRole('cell', { name: 'SN-0001' })).toBeInTheDocument()
		await expect.element(page.getByText('Invalid Date')).not.toBeInTheDocument()
	})

	it('posts an update body the AdminUpdateStockLot validator accepts', async () => {
		const { fake } = await mount()
		await expect.element(page.getByRole('heading', { name: 'Stock Lot Details' })).toBeInTheDocument()

		// Only one ActionMenu renders on this page (the header's) — the nested serial numbers
		// table has none.
		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Edit' }).click()
		await page.getByLabelText('Lot Number').fill('LOT-002')
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so gate on the toast — the drawer only calls
		// `setOpen(false)` inside the mutation's `onSuccess`.
		await expect.element(page.getByText('Stock lot updated successfully')).toBeInTheDocument()

		// The drawer always resubmits the whole form, including fields the user never touched —
		// all seeded from the fixture via `form.reset()` when it opened.
		const update = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/stock-lots/stocklot_1')
		expect(update?.body).toEqual({
			lot_number: 'LOT-002',
			description: null,
			stocked_quantity: 100,
			enabled: true,
			inventory_item_id: 'iitem_1',
			stock_location_id: 'sloc_1'
		})
	})

	it('navigates back to the in-app list path after delete', async () => {
		// `/stock-lots`, not `/app/stock-lots` — Medusa mounts the dashboard under a configurable
		// `admin.path`, and React Router supplies that as the router basename, so plugin code
		// navigates with the bare in-app path.
		const result = await mount()
		await expect.element(page.getByRole('heading', { name: 'Stock Lot Details' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		// Only the confirm dialog's Delete button is present now — Radix marks the rest of the
		// page `aria-hidden` while the (modal) AlertDialog is open.
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/stock-lots'))
	})
})
