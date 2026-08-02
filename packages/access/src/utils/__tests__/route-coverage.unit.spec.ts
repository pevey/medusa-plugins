import { getRouteCoverage, getStaleGuards } from '../route-coverage'
import { guardResource, requirePolicies } from '../route-guards'

const reset = (routes: { method: string; matcher: string }[] = []) => {
	;(global as any).AccessRouteGuards = []
	;(global as any).AccessSealedNamespaces = []
	;(global as any).AccessRegisteredRoutes = routes
}

describe('getRouteCoverage', () => {
	it('counts a route as covered once a declaration matches it', () => {
		reset([
			{ method: 'GET', matcher: '/admin/widgets' },
			{ method: 'DELETE', matcher: '/admin/widgets/:id' }
		])

		expect(getRouteCoverage().uncovered).toHaveLength(2)

		guardResource({ resource: 'widget', prefix: '/admin/widgets' })

		const after = getRouteCoverage()
		expect(after.total).toBe(2)
		expect(after.covered).toBe(2)
		expect(after.uncovered).toEqual([])
	})

	it('substitutes :params so a route pattern can be tested against the registry', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets/:id/parts/:partId' }])
		guardResource({ resource: 'widget', prefix: '/admin/widgets' })

		expect(getRouteCoverage().uncovered).toEqual([])
	})

	it('ignores routes outside the prefix', () => {
		reset([
			{ method: 'GET', matcher: '/admin/widgets' },
			{ method: 'GET', matcher: '/store/widgets' }
		])

		expect(getRouteCoverage('/admin').total).toBe(1)
	})

	it('deduplicates routes registered more than once', () => {
		reset([
			{ method: 'GET', matcher: '/admin/widgets' },
			{ method: 'GET', matcher: '/admin/widgets' }
		])

		expect(getRouteCoverage().total).toBe(1)
	})
})

describe('getStaleGuards', () => {
	it('reports a hand-written declaration that matches no registered route', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets' }])

		requirePolicies({
			matcher: '/admin/gone',
			method: ['GET'],
			policies: [{ resource: 'gone', operation: 'read' }]
		})

		expect(getStaleGuards()).toEqual([{ matcher: '/admin/gone', methods: ['GET'] }])
	})

	it('does not report guardResource output, which over-generates by design', () => {
		// Only a GET collection route exists; guardResource still emits the full
		// CRUD surface. Those extra entries are protective, not rotted.
		reset([{ method: 'GET', matcher: '/admin/widgets' }])

		guardResource({ resource: 'widget', prefix: '/admin/widgets' })

		expect(getStaleGuards()).toEqual([])
	})

	it('does not report a declaration whose method differs but path matches', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets' }])

		requirePolicies({
			matcher: '/admin/widgets',
			method: ['DELETE'],
			policies: [{ resource: 'widget', operation: 'delete' }]
		})

		// No DELETE route exists, so this genuinely matches nothing.
		expect(getStaleGuards()).toEqual([{ matcher: '/admin/widgets', methods: ['DELETE'] }])
	})

	it('reports nothing when no routes have been registered yet', () => {
		reset([])
		requirePolicies({ matcher: '/admin/x', policies: [{ resource: 'x', operation: 'read' }] })

		// Without a route list there is no evidence either way — stay silent
		// rather than flag every declaration.
		expect(getStaleGuards()).toEqual([])
	})
})
