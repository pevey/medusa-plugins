import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('veeqo admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				// Intentionally empty. Every route this plugin owns is a POST sync trigger validated
				// by `validateAndTransformBody` (no `queryConfig`/`defaults` to project fields through),
				// except the unvalidated passthrough `GET /admin/veeqo/shipments/:id/tracking-events`
				// (no schema at all) and the per-entity sync routes (`/admin/veeqo/customers/:id/sync`
				// etc.), which take no body -- `customerId` etc. come from the URL, so there's nothing
				// for a validator to check. Every GET the admin UI actually reads data from
				// (`/admin/sales-channels`, `/admin/stock-locations`, `/admin/shipping-options`,
				// `/admin/products`, `/admin/product-variants`, `/admin/customers/:id`, `/admin/orders/:id`,
				// ...) is a CORE Medusa route this plugin doesn't own -- outside this plugin's own
				// `src/api` tree entirely, so it never appears in this contract map at all. There is
				// nothing to declare here; per the brief, an empty map is correct and manufacturing
				// entries would be wrong.
				declaredFields: {}
			})
		).not.toThrow()
	})
})
