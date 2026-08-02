import { guardResource, isPathSealed, matchRoutePolicies, requirePolicies, sealNamespace } from '../route-guards'

const resetRegistries = () => {
	;(global as any).AccessRouteGuards = []
	;(global as any).AccessSealedNamespaces = []
}

describe('guardResource', () => {
	beforeEach(resetRegistries)

	it('covers the collection and every depth beneath it', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		expect(matchRoutePolicies('/admin/complaints', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
		expect(matchRoutePolicies('/admin/complaints/cmp_1', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
		expect(matchRoutePolicies('/admin/complaints/cmp_1/notes/n_1', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
	})

	it('closes the DELETE-on-:id gap that anchored matchers leave open', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		// The bug this replaces: a bare '/admin/complaints' DELETE declaration
		// compiles to ^/admin/complaints$ and cannot match a sub-path.
		expect(matchRoutePolicies('/admin/complaints/cmp_1', 'DELETE')).toEqual([{ resource: 'complaint', operation: 'delete' }])
	})

	it('maps POST to create on the collection and update on the subtree', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		expect(matchRoutePolicies('/admin/complaints', 'POST')).toEqual([{ resource: 'complaint', operation: 'create' }])
		expect(matchRoutePolicies('/admin/complaints/cmp_1/notes', 'POST')).toEqual([{ resource: 'complaint', operation: 'update' }])
	})

	it('leaves a sibling prefix untouched', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		expect(matchRoutePolicies('/admin/complaint-tags', 'GET')).toEqual([])
	})

	it('tolerates a trailing slash on the prefix', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints/' })

		expect(matchRoutePolicies('/admin/complaints', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
		expect(matchRoutePolicies('/admin/complaints/cmp_1', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
	})

	it('is a floor: a specific declaration adds to it rather than replacing it', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })
		requirePolicies({
			matcher: '/admin/complaints/:id/activities*',
			method: ['POST'],
			policies: [{ resource: 'complaint_activity', operation: 'update' }]
		})

		const required = matchRoutePolicies('/admin/complaints/cmp_1/activities', 'POST')

		expect(required).toEqual(
			expect.arrayContaining([
				{ resource: 'complaint', operation: 'update' },
				{ resource: 'complaint_activity', operation: 'update' }
			])
		)
		expect(required).toHaveLength(2)
	})
})

describe('sealNamespace', () => {
	beforeEach(resetRegistries)

	it('matches the prefix itself and anything beneath it', () => {
		sealNamespace('/admin/complaints')

		expect(isPathSealed('/admin/complaints')).toBe(true)
		expect(isPathSealed('/admin/complaints/cmp_1')).toBe(true)
		expect(isPathSealed('/admin/complaints/cmp_1/notes')).toBe(true)
	})

	it('matches on segment boundaries, not string prefix', () => {
		sealNamespace('/admin/order')

		// The trap: '/admin/orders'.startsWith('/admin/order') is true.
		expect(isPathSealed('/admin/orders')).toBe(false)
		expect(isPathSealed('/admin/orders/ord_1')).toBe(false)
		expect(isPathSealed('/admin/order-edits')).toBe(false)
		expect(isPathSealed('/admin/order')).toBe(true)
	})

	it('does not seal unrelated prefixes', () => {
		sealNamespace('/admin/complaints')

		expect(isPathSealed('/admin/complaint-tags')).toBe(false)
		expect(isPathSealed('/admin/products')).toBe(false)
	})

	it('is idempotent and order-independent', () => {
		sealNamespace('/admin/complaints')
		sealNamespace('/admin/complaints/')
		sealNamespace('/admin/complaints')

		expect((global as any).AccessSealedNamespaces).toEqual(['/admin/complaints'])
	})

	it('seals nothing by default', () => {
		expect(isPathSealed('/admin/anything')).toBe(false)
	})
})
