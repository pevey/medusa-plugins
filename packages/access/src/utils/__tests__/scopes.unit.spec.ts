import { defineScope, getScope, hasScope } from '../scopes'

const resetScopes = () => {
	;(global as any).AccessScopes = new Map()
}

describe('defineScope', () => {
	beforeEach(resetScopes)

	it('registers a filter under a resource and name', async () => {
		defineScope({ name: 'own', resource: 'review', filter: async actor => ({ customer_id: actor.id }) })

		expect(hasScope('review', 'own')).toBe(true)
		await expect(getScope('review', 'own')!({ id: 'cus_1', type: 'customer' }, {} as any)).resolves.toEqual({ customer_id: 'cus_1' })
	})

	it('keeps scopes of the same name on different resources separate', async () => {
		defineScope({ name: 'own', resource: 'review', filter: async actor => ({ customer_id: actor.id }) })
		defineScope({ name: 'own', resource: 'order', filter: async actor => ({ buyer_id: actor.id }) })

		await expect(getScope('review', 'own')!({ id: 'cus_1', type: 'customer' }, {} as any)).resolves.toEqual({ customer_id: 'cus_1' })
		await expect(getScope('order', 'own')!({ id: 'cus_1', type: 'customer' }, {} as any)).resolves.toEqual({ buyer_id: 'cus_1' })
	})

	it('keeps different scopes on the same resource separate', () => {
		defineScope({ name: 'own', resource: 'customer', filter: async actor => ({ id: actor.id }) })
		defineScope({ name: 'company', resource: 'customer', filter: async () => ({ id: ['cus_1', 'cus_2'] }) })

		expect(hasScope('customer', 'own')).toBe(true)
		expect(hasScope('customer', 'company')).toBe(true)
	})

	it('throws a typed INVALID_DATA error when the same resource and name are registered twice', () => {
		defineScope({ name: 'own', resource: 'review', filter: async actor => ({ customer_id: actor.id }) })

		let caught: any
		try {
			defineScope({ name: 'own', resource: 'review', filter: async () => ({}) })
		} catch (error) {
			caught = error
		}

		expect(caught).toBeDefined()
		expect(caught.type).toBe('invalid_data')
		expect(caught.message).toMatch(/already registered/i)
	})

	it('reports an unregistered scope as absent', () => {
		expect(hasScope('review', 'company')).toBe(false)
		expect(getScope('review', 'company')).toBeUndefined()
	})

	it('does not collide when a resource or name contains the old separator character', async () => {
		defineScope({ name: 'c', resource: 'a:b', filter: async () => ({ from: 'resource-has-colon' }) })
		defineScope({ name: 'b:c', resource: 'a', filter: async () => ({ from: 'name-has-colon' }) })

		await expect(getScope('a:b', 'c')!({ id: 'x', type: 't' }, {} as any)).resolves.toEqual({ from: 'resource-has-colon' })
		await expect(getScope('a', 'b:c')!({ id: 'x', type: 't' }, {} as any)).resolves.toEqual({ from: 'name-has-colon' })
	})

	it('passes the container through to the filter', async () => {
		const container = {
			resolve: (key: string) => (key === 'query' ? { graph: async () => ({ data: [{ id: 'cus_1' }, { id: 'cus_2' }] }) } : undefined)
		} as any

		defineScope({
			name: 'company',
			resource: 'quote',
			filter: async (_actor, resolvedContainer) => {
				const query = resolvedContainer.resolve('query') as { graph: () => Promise<{ data: { id: string }[] }> }
				const { data } = await query.graph()
				return { customer_id: data.map(row => row.id) }
			}
		})

		await expect(getScope('quote', 'company')!({ id: 'cus_1', type: 'customer' }, container)).resolves.toEqual({ customer_id: ['cus_1', 'cus_2'] })
	})
})
