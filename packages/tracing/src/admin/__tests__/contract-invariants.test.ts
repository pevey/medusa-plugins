import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('tracing admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					// StockLotsPage's table columns + row actions. `inventory_item.title` /
					// `stock_location.name` are ALSO rendered here, but only because the page
					// overrides the request with an explicit `fields: '*inventory_item,*stock_location'`
					// query param -- they are not part of this route's own `queryConfig.defaults`,
					// so they are deliberately left out of this map (adding them would fail the
					// "UI reads a field the route doesn't declare by default" check for a field the
					// route only ever returns because the client explicitly asked for it).
					'GET /admin/stock-lots': ['id', 'lot_number', 'stocked_quantity', 'enabled'],
					// StockLotDetailPage + EditStockLotDrawer. Unlike the list route, the detail
					// route's own `defaults` already include `inventory_item.*` / `stock_location.*`.
					'GET /admin/stock-lots/:id': [
						'id',
						'lot_number',
						'description',
						'stocked_quantity',
						'enabled',
						'inventory_item_id',
						'stock_location_id',
						'inventory_item.title',
						'stock_location.name'
					],
					// SerialNumbersTable, nested under the stock lot detail page.
					'GET /admin/stock-lots/:id/serial-numbers': ['id', 'value', 'order_id', 'created_at'],
					// InvalidationReasonsPage's table columns.
					'GET /admin/invalidation-reasons': ['id', 'value', 'created_at', 'updated_at'],
					// InvalidationReasonDetailPage + EditInvalidationReasonDrawer.
					'GET /admin/invalidation-reasons/:id': ['id', 'value']
					// GET /admin/serial-numbers has no admin UI reading it directly today (the
					// serial number list is only ever reached nested under a stock lot via
					// `/admin/stock-lots/:id/serial-numbers`, above); `src/admin/routes/serial-numbers/[id]/page.tsx`
					// is an empty stub. Nothing to declare for it.
				}
			})
		).not.toThrow()
	})
})
