jest.mock('@medusajs/modules-sdk', () => ({
	MedusaModule: {
		getAllJoinerConfigs: () => [
			{
				schema: `
					type Customer {
						id: ID
						orders: [Order]
					}
					type Order {
						id: ID
					}
				`,
				alias: [
					{ name: ['customer', 'customers'], entity: 'Customer' },
					{ name: ['order', 'orders'], entity: 'Order' }
				]
			}
		]
	}
}))

import { AccessFieldFilter } from '../access-field-filter'
import { definePolicies } from '../define-policies'

const containerFor = (policies: { resource: string; operation: string; scope: string | null }[]) =>
	({
		resolve: () => ({
			graph: async () => ({ data: [{ id: 'role_1', policies }] })
		})
	}) as any

beforeAll(() => {
	definePolicies({ name: 'ReadCustomer', resource: 'customer', operation: 'read' })
	definePolicies({ name: 'ReadOrder', resource: 'order', operation: 'read' })
})

describe('AccessFieldFilter -- strict everywhere until a query interceptor exists', () => {
	it('keeps root fields for an unrestricted root grant', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			userRoles: ['role_1'],
			container: containerFor([{ resource: 'customer', operation: 'read', scope: null }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual([])
	})

	it('strips root fields for a scoped root grant -- nothing has narrowed the rows yet', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			userRoles: ['role_1'],
			container: containerFor([{ resource: 'customer', operation: 'read', scope: 'own' }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual(['id'])
	})

	it('strips root fields for an outright denial', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			userRoles: ['role_1'],
			container: containerFor([])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual(['id'])
	})

	it('strips a nested scoped grant -- a nested collection cannot be row-filtered', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			userRoles: ['role_1'],
			container: containerFor([
				{ resource: 'customer', operation: 'read', scope: null },
				{ resource: 'order', operation: 'read', scope: 'own' }
			])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['orders.id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual(['orders.id'])
	})
})
