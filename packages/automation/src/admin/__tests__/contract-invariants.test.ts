import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('automation admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				// Only the 5 LIST routes carry a queryConfig at all. This plugin's detail routes
				// (`GET /admin/automations/:id`, `GET /admin/automations/:id/actions/:actionId`)
				// deliberately hand-build their JSON response without `validateAndTransformQuery` —
				// there is no `queryConfig.defaults` for the invariant to check field reads against,
				// so those two routes are correctly absent from this map (not an oversight).
				declaredFields: {
					'GET /admin/automations': ['id', 'name', 'trigger_type', 'is_active', 'trigger_events'],
					'GET /admin/automations/:id/actions': ['id', 'name', 'action_type', 'is_active', 'target_url', 'medusa_workflow'],
					'GET /admin/automations/:id/actions/:actionId/deliveries': ['id', 'event_name', 'status', 'response_status', 'error_message', 'created_at'],
					'GET /admin/automations/:id/receipts': ['id', 'created_at', 'request_ip', 'payload'],
					'GET /admin/automations/secrets': ['id', 'label']
				}
			})
		).not.toThrow()
	})
})
