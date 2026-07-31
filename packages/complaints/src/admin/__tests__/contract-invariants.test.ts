import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('complaints admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					// Complaints list page (src/admin/routes/complaints/page.tsx) renders only these
					// columns + id (getRowId/onRowClick/row-selection keys). The widgets
					// (customer-complaints.tsx, order-complaints.tsx) hit this same route but override
					// the request with an explicit `fields` param — a request-time override the static
					// check can't model, not a genuine gap in this map.
					'GET /admin/complaints': ['id', 'number', 'status', 'description'],
					// Complaint detail page + EditComplaintDrawer. `metadata` is read by the drawer's
					// form-reset (round-tripped, never rendered) — it was missing from this route's
					// `queryConfig.defaults` until this task (see middlewares.ts): every edit silently
					// sent `metadata: null` back to the server, wiping any real metadata. Fixed by
					// adding `metadata` to the route's defaults.
					'GET /admin/complaints/:id': [
						'id',
						'number',
						'status',
						'description',
						'customer_id',
						'customer.email',
						'order_id',
						'order.id',
						'product_id',
						'product.title',
						'actionable',
						'reportable',
						'metadata',
						'tags.id',
						'tags.value'
					],
					// Complaint tags list page — exactly equals queryConfig.defaults, same pattern as
					// customer-tags.
					'GET /admin/complaint-tags': ['id', 'value', 'created_at', 'updated_at'],
					// Complaint tag detail page + EditComplaintTagDrawer (value only).
					'GET /admin/complaint-tags/:id': ['id', 'value'],
					// Activity feed (ComplaintActivity/ComplaintActivityEntry components). `metadata` is
					// in queryConfig.defaults but never read by either component.
					'GET /admin/complaints/:id/activities': [
						'id',
						'complaint_id',
						'type',
						'note',
						'created_at',
						'user.id',
						'user.first_name',
						'user.last_name',
						'user.email'
					],
					// Product complaint-stats widget requests these same fields explicitly (its request
					// already matches queryConfig.defaults, so this isn't a masked-override case).
					'GET /admin/complaint-stats/products/:product_id': ['total_complaints', 'total_orders', 'complaint_rate', 'last_calculated_at'],
					// Documents list (complaint detail page + EditComplaintDrawer) — filename and size
					// are rendered; mime_type/uploaded_by/created_at/complaint_id are in
					// queryConfig.defaults but never read by either component.
					'GET /admin/complaints/:id/documents': ['id', 'filename', 'size_bytes']
					// GET /admin/complaints/:id/activities/:entry_id has no admin UI caller today — no
					// declaredFields entry, per the brief's "don't manufacture entries" guidance.
				}
			})
		).not.toThrow()
	})
})
