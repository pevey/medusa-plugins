import { getHandlerPolicies, withPolicies } from '../route-binding'

describe('withPolicies', () => {
	it('returns the same function reference so route export identity is preserved', () => {
		const handler = async () => {}
		const wrapped = withPolicies({ resource: 'complaint', operation: 'read' }, handler)

		// Identity matters: the loader stores `routeExports[key]` verbatim, and the
		// traceRoute lookup is keyed on that reference.
		expect(wrapped).toBe(handler)
	})

	it('resolves policies by handler identity', () => {
		const handler = async () => {}
		withPolicies({ resource: 'complaint', operation: 'read' }, handler)

		expect(getHandlerPolicies(handler)).toEqual([{ resource: 'complaint', operation: 'read' }])
	})

	it('normalizes a single policy to a list', () => {
		const single = async () => {}
		const many = async () => {}

		withPolicies({ resource: 'a', operation: 'read' }, single)
		withPolicies([{ resource: 'b', operation: 'read' }, { resource: 'c', operation: 'update' }], many)

		expect(getHandlerPolicies(single)).toHaveLength(1)
		expect(getHandlerPolicies(many)).toHaveLength(2)
	})

	it('keeps declarations distinct per handler', () => {
		const get = async () => {}
		const post = async () => {}

		withPolicies({ resource: 'complaint', operation: 'read' }, get)
		withPolicies({ resource: 'complaint', operation: 'create' }, post)

		expect(getHandlerPolicies(get)).toEqual([{ resource: 'complaint', operation: 'read' }])
		expect(getHandlerPolicies(post)).toEqual([{ resource: 'complaint', operation: 'create' }])
	})

	it('returns undefined for an undeclared handler', () => {
		expect(getHandlerPolicies(async () => {})).toBeUndefined()
	})

	it('ignores non-function values rather than throwing', () => {
		expect(() => withPolicies({ resource: 'a', operation: 'read' }, undefined)).not.toThrow()
		expect(getHandlerPolicies(undefined)).toBeUndefined()
		expect(getHandlerPolicies('not-a-handler')).toBeUndefined()
	})
})
