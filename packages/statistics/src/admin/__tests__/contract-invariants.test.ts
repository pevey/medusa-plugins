import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('statistics admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					// Read by the page (`routes/statistics/page.tsx`) plus the widgets that consume
					// the `statistics`/`totals` props it passes down (`routes/statistics/widgets/*`):
					// revenue/orders-count/aov charts read `statistics[].date` + one metric each,
					// top-products aggregates `statistics[].top_products`, and
					// customers/fulfillment read their metric straight off `totals`. `totals` is a
					// same-named aggregate over the underlying `StatisticsDaily` columns (see
					// `computeStatsForDay`), so it needs no separate entry. `low_stock_count` (present
					// in `queryConfig.defaults` and in the page's fallback `totals` shape) is never
					// actually rendered by any widget -- correctly excluded. `recent-orders-widget`
					// and `low-stock-widget` fetch their OWN routes instead of reading these props;
					// they're covered by the other two entries below.
					'GET /admin/statistics': [
						'date',
						'revenue_total',
						'order_count',
						'average_order_value',
						'new_customer_count',
						'returning_customer_count',
						'pending_fulfillment_count',
						'top_products'
					],
					// Read by `recent-orders-widget.tsx`.
					'GET /admin/statistics/recent-orders': ['id', 'display_id', 'status', 'email', 'total', 'customer.first_name', 'customer.last_name']
					// `GET /admin/statistics/low-stock` has no entry: its `warnings[]` response is a
					// synthesized shape spanning THREE unrelated entities (`stock_location`,
					// `inventory_item`, and optionally `stock_lot` from a different plugin) that the
					// handler assembles by hand -- there is no single underlying entity for
					// `queryConfig.defaults` to describe, so the field-subset check this harness
					// performs doesn't apply (same reasoning as automation's hand-built detail routes).
					// `GET /admin/statistics/layout` and `POST /admin/statistics/recalculate` take no
					// query params at all and so have no `middlewares.ts` entry (and no schema) to
					// check against.
				}
			})
		).not.toThrow()
	})
})
