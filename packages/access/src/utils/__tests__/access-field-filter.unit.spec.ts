/// <reference types="jest" />
jest.mock('@medusajs/framework/modules-sdk', () => ({
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

describe('AccessFieldFilter -- read access, scoped or not', () => {
	it('keeps fields for an unrestricted grant', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			holdings: [{ role_id: 'role_1', scope: null }],
			container: containerFor([{ resource: 'customer', operation: 'read', scope: null }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual([])
	})

	it('keeps fields for a grant held only at a scope', async () => {
		// A scoped grant IS read access. `hasPermission` reports false for one
		// because a boolean caller cannot narrow rows -- irrelevant here, where the
		// question is whether the field path survives, not which rows come back.
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			holdings: [{ role_id: 'role_1', scope: null }],
			container: containerFor([{ resource: 'customer', operation: 'read', scope: 'own' }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual([])
	})

	it('strips fields for an outright denial', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			holdings: [{ role_id: 'role_1', scope: null }],
			container: containerFor([{ resource: 'order', operation: 'read', scope: null }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual(['id'])
	})

	it('keeps a nested relation the actor holds only at a scope', async () => {
		// The regression this suite exists for: an actor with order:read@channel
		// asking for customers?fields=id,orders.* used to get no orders at all.
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			holdings: [{ role_id: 'role_1', scope: null }],
			container: containerFor([
				{ resource: 'customer', operation: 'read', scope: null },
				{ resource: 'order', operation: 'read', scope: 'sales_channel' }
			])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id', 'orders.id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual([])
	})

	it('strips a nested relation the actor holds no grant on', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			holdings: [{ role_id: 'role_1', scope: null }],
			container: containerFor([{ resource: 'customer', operation: 'read', scope: null }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id', 'orders.id']), starFields: new Set() }
		})

		expect(notAllowed).toEqual(['orders.id'])
	})

	it('leaves scalar columns alone -- gating is at entity grain only', async () => {
		const filter = new AccessFieldFilter({
			policies: [{ resource: 'customer', operation: 'read' }] as any,
			holdings: [{ role_id: 'role_1', scope: null }],
			container: containerFor([{ resource: 'customer', operation: 'read', scope: null }])
		})

		const notAllowed = await filter.getNotAllowedFields({
			entity: 'customer',
			parsedFields: { fields: new Set(['id', 'email']), starFields: new Set() }
		})

		expect(notAllowed).toEqual([])
	})
})
