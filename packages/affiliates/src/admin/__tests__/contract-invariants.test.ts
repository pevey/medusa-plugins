import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('affiliates admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators,
				declaredFields: {
					'GET /admin/affiliates': ['id', 'name', 'email', 'status', 'created_at'],
					'GET /admin/affiliates/:id': [
						'id',
						'name',
						'email',
						'phone',
						'currency_code',
						'status',
						'created_at',
						'primary_address_id',
						// AffiliateAddressesSection + EditAffiliateAddressDrawer
						'addresses.id',
						'addresses.first_name',
						'addresses.last_name',
						'addresses.company',
						'addresses.address_1',
						'addresses.address_2',
						'addresses.city',
						'addresses.province',
						'addresses.country_code',
						'addresses.postal_code',
						'addresses.phone',
						// AffiliatePromotionsSection + AffiliateStatsSection + EditPromotionCodeDrawer
						'promotions.id',
						'promotions.code',
						'promotions.status',
						'promotions.application_method.type',
						'promotions.application_method.value',
						'promotions.campaign.ends_at'
					]
				}
			})
		).not.toThrow()
	})
})
