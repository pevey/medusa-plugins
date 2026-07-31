import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('analytics admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					// Rubrics list page columns (name, label, active, created_at) + id
					// (getRowId/onRowClick). `description` is in queryConfig.defaults but only read on
					// the detail page below, not the list.
					'GET /admin/analytics/rubrics': ['id', 'name', 'label', 'active', 'created_at'],
					// Rubric detail page + EditRubricDrawer. `expected_properties` is in
					// queryConfig.defaults but never read by any admin component.
					'GET /admin/analytics/rubrics/:id': ['id', 'name', 'label', 'description', 'active'],
					// RubricEventsTable (rendered on the rubric detail page). `event`/`properties`/
					// `created_at` are in queryConfig.defaults but never read for display (`event` is
					// only ever sent as a request-time filter, not read back off each row).
					'GET /admin/analytics/events': ['id', 'actor_id', 'source', 'sales_channel_id', 'timestamp'],
					// Funnel config page + create/edit funnel modals read only these fields off each
					// funnel in the list. `description`, `sales_channel_id`, `created_at`, `updated_at`
					// are in queryConfig.defaults but never read by any admin component.
					'GET /admin/analytics/funnels': ['id', 'name', 'label', 'steps', 'is_default']
					// No declaredFields entries for: GET /admin/analytics/events/counts (no admin caller;
					// its queryConfig also has no `defaults` to check against), GET /admin/analytics/funnel
					// (the funnel-query route AnalyticsPage/FunnelChart actually use -- also has no
					// `defaults`, it returns a computed shape, not a field-selected entity), GET
					// /admin/analytics/funnels/:id (the `useFunnel` hook exists but is never called from
					// any admin page -- EditFunnelDrawer receives its `funnel` as a prop instead), or any
					// of the five GET /admin/analytics/segments... routes (no admin UI for segments exists
					// at all). Per the brief's "don't manufacture entries" guidance. POST /store/ping
					// appears in the contract map too (it's a store route, not admin) -- correctly excluded
					// here, per the brief.
				}
			})
		).not.toThrow()
	})
})
