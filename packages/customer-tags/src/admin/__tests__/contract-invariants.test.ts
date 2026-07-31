import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('customer-tags admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					'GET /admin/customer-tags': ['id', 'value', 'created_at', 'updated_at'],
					'GET /admin/customer-tags/:id': ['id', 'value']
				}
			})
		).not.toThrow()
	})
})
