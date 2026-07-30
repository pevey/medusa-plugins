import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('forms admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					'GET /admin/forms': ['id', 'name', 'handle', 'active', 'turnstile_enabled', 'form_fields'],
					'GET /admin/forms/:id': ['id', 'name', 'handle', 'description', 'active', 'turnstile_enabled', 'notification_emails', 'form_fields']
				}
			})
		).not.toThrow()
	})
})
