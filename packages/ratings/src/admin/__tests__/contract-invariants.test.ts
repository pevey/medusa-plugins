import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('ratings admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					'GET /admin/reviews': [
						'id',
						'status',
						'rating',
						'featured',
						'author_name',
						'title',
						'body',
						'created_at'
					],
					'GET /admin/reviews/:id': [
						'id',
						'status',
						'featured',
						'rating',
						'author_name',
						'author_email',
						'title',
						'body',
						'product_id',
						'order_id',
						'customer_id',
						'created_at',
						'activity'
					]
				}
			})
		).not.toThrow()
	})
})
