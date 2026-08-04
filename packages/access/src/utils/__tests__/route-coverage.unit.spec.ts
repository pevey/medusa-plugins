import { definePolicies } from '../define-policies'
import { getRouteCoverage, getStaleGuards, getUnregisteredGuardResources, reportDiscardedPolicies, reportRouteCoverage, reportUnregisteredGuardResources } from '../route-coverage'
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

	it('is reported even when coverage is 100%', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets' }])
		guardResource({ resource: 'widget', prefix: '/admin/widgets' })
		requirePolicies({
			matcher: '/admin/gone',
			method: ['GET'],
			policies: [{ resource: 'gone', operation: 'read' }]
		})

		// Coverage and drift are independent: every route is declared, AND a
		// declaration points at nothing. Reporting used to return early on full
		// coverage, silencing this.
		expect(getRouteCoverage().uncovered).toEqual([])

		const logged: string[] = []
		reportRouteCoverage({
			info: (m: string) => logged.push(m),
			warn: (m: string) => logged.push(m),
			debug: (m: string) => logged.push(m)
		})

		expect(logged.some(m => m.includes('match no registered route'))).toBe(true)
		expect(logged.some(m => m.includes('/admin/gone'))).toBe(true)
	})
})

describe('prefix filtering is segment-aware (I1 regression)', () => {
	it('does not count a sibling prefix that shares a string prefix as covered/uncovered', () => {
		reset([
			{ method: 'GET', matcher: '/store/a' },
			{ method: 'GET', matcher: '/storefront/b' }
		])
		requirePolicies({ matcher: '/store/a', method: ['GET'], policies: [{ resource: 'a', operation: 'read' }] })
		// deliberately no declaration for /storefront/b

		const store = getRouteCoverage('/store')
		expect(store.total).toBe(1)
		expect(store.uncovered).toEqual([])

		const storefront = getRouteCoverage('/storefront')
		expect(storefront.total).toBe(1)
		expect(storefront.uncovered).toEqual([{ method: 'GET', matcher: '/storefront/b' }])
	})

	it('does not report a stale guard registered under a sibling prefix', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets' }])
		requirePolicies({ matcher: '/storefront/gone', method: ['GET'], policies: [{ resource: 'gone', operation: 'read' }] })

		expect(getStaleGuards('/store')).toEqual([])
	})
})

describe('drift reporting runs even with zero routes under a prefix (I2 regression)', () => {
	it('reports a stale guard under a prefix that has no registered routes at all', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets' }])
		requirePolicies({ matcher: '/hooks/legacy', method: ['GET'], policies: [{ resource: 'hooks', operation: 'read' }] })

		const logged: string[] = []
		reportRouteCoverage({
			info: (m: string) => logged.push(m),
			warn: (m: string) => logged.push(m),
			debug: (m: string) => logged.push(m)
		})

		expect(logged.some(m => m.includes('/hooks/legacy'))).toBe(true)
	})
})

describe('reportDiscardedPolicies', () => {
	const capture = () => {
		const logged: string[] = []
		const logger = {
			info: (m: string) => logged.push(m),
			warn: (m: string) => logged.push(m),
			debug: (m: string) => logged.push(m)
		}
		return { logged, logger }
	}

	beforeEach(() => {
		reset()
		;(global as any).AccessDiscardedPolicies = []
	})

	afterAll(() => {
		;(global as any).AccessDiscardedPolicies = []
	})

	it('is silent when nothing was discarded', () => {
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		expect(logged).toEqual([])
	})

	it('names the resource, the operation as written, and the closed set', () => {
		definePolicies({ name: 'ReportTypo', resource: 'report_thing', operation: 'updte' })
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		const all = logged.join('\n')
		expect(all).toContain('report_thing:updte')
		expect(all).toContain('ReportTypo')
		// the operator has to be told the set to compare the typo against
		expect(all).toContain('export')
	})

	it('names the missing fields for an incomplete declaration, not the closed set', () => {
		definePolicies({ name: 'IncompleteReport', resource: '', operation: '' } as any)
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		const all = logged.join('\n')
		expect(all).toContain('missing resource, operation')
		// Telling someone to check their operation against the closed set is no help
		// when the field is simply absent.
		expect(all).not.toContain('outside the closed set')
	})

	it('states the consequence — that no role can hold the grant', () => {
		definePolicies({ name: 'ConsequenceTypo', resource: 'consequence_thing', operation: 'updte' })
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		expect(logged.join('\n')).toMatch(/no role can hold/i)
	})

	it('names the full route — matcher and methods — of every declaration requiring the discarded grant', () => {
		definePolicies({ name: 'RoutedTypo', resource: 'routed_thing', operation: 'updte' })
		requirePolicies({
			matcher: '/admin/routed-things/:id',
			method: ['POST', 'PUT'],
			policies: [{ resource: 'routed_thing', operation: 'updte' }]
		})
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		const all = logged.join('\n')
		expect(all).toContain('/admin/routed-things/:id')
		expect(all).toContain('POST')
		expect(all).toContain('PUT')
	})

	it('matches a declaration that lists the operation among several', () => {
		definePolicies({ name: 'MultiOpTypo', resource: 'multi_thing', operation: 'updte' })
		requirePolicies({
			matcher: '/admin/multi-things',
			method: ['POST'],
			policies: [{ resource: 'multi_thing', operation: ['read', 'updte'] }]
		})
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		expect(logged.join('\n')).toContain('/admin/multi-things')
	})

	it('says so when no registered declaration requires the discarded grant', () => {
		definePolicies({ name: 'OrphanTypo', resource: 'orphan_thing', operation: 'updte' })
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		expect(logged.join('\n')).toMatch(/no route/i)
	})

	it('does not attribute a wildcard declaration to the discarded operation', () => {
		definePolicies({ name: 'WildcardTypo', resource: 'wildcard_thing', operation: 'updte' })
		requirePolicies({
			matcher: '/admin/wildcard-things',
			method: ['POST'],
			policies: [{ resource: 'wildcard_thing', operation: '*' }]
		})
		const { logged, logger } = capture()

		reportDiscardedPolicies(logger)

		expect(logged.join('\n')).not.toContain('/admin/wildcard-things')
	})
})

describe('probe normalization', () => {
	beforeEach(() => reset())

	it('counts a trailing-slash route as covered', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets/' }])
		guardResource({ resource: 'widget', prefix: '/admin/widgets' })

		expect(getRouteCoverage().uncovered).toEqual([])
	})

	it('does not report a declaration stale against a trailing-slash route', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets/' }])
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })

		expect(getStaleGuards()).toEqual([])
	})

	it('does not report a declaration stale against a route differing only in case', () => {
		reset([{ method: 'GET', matcher: '/admin/Widgets' }])
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })

		expect(getStaleGuards()).toEqual([])
	})

	// Express routes `/Admin/widgets` to the `/admin/widgets` handler, so a report
	// that filtered its prefix case-sensitively disagreed with what the guard
	// actually matched -- and a route dropping silently out of the report reads as
	// "nothing to see here", which is the one thing a coverage report must never
	// do wrongly.
	it('counts a route whose prefix differs only in case', () => {
		reset([{ method: 'GET', matcher: '/Admin/widgets' }])

		expect(getRouteCoverage('/admin').total).toBe(1)
		expect(getRouteCoverage('/admin').uncovered).toHaveLength(1)

		guardResource({ resource: 'widget', prefix: '/admin/widgets' })
		expect(getRouteCoverage('/admin').uncovered).toEqual([])
	})

	it('considers a declaration whose prefix differs only in case when reporting drift', () => {
		reset([{ method: 'GET', matcher: '/admin/widgets' }])
		requirePolicies({ matcher: '/Admin/gone', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })

		expect(getStaleGuards('/admin').map(guard => guard.matcher)).toEqual(['/Admin/gone'])
	})
})

describe('unregistered guard resources', () => {
	const capture = () => {
		const logged: string[] = []
		const logger = {
			info: (m: string) => logged.push(m),
			warn: (m: string) => logged.push(m),
			debug: (m: string) => logged.push(m)
		}
		return { logged, logger }
	}

	beforeEach(() => reset())

	it('reports a resource no definePolicies call registered, naming the declaration requiring it', () => {
		requirePolicies({
			matcher: '/admin/unregistered-things/:id',
			method: ['POST', 'DELETE'],
			policies: [{ resource: 'never_declared_thing', operation: 'update' }]
		})

		const found = getUnregisteredGuardResources()
		expect(found).toHaveLength(1)
		expect(found[0].resource).toBe('never_declared_thing')
		expect(found[0].guards).toEqual([{ matcher: '/admin/unregistered-things/:id', methods: ['POST', 'DELETE'] }])

		const { logged, logger } = capture()
		reportUnregisteredGuardResources(logger)

		const all = logged.join('\n')
		expect(all).toContain('never_declared_thing')
		expect(all).toContain('/admin/unregistered-things/:id')
		expect(all).toContain('POST,DELETE')
		// the operator has to be told how to fix it, not only what is wrong
		expect(all).toContain('definePolicies')
	})

	it('does not report a resource that was registered', () => {
		definePolicies({ name: 'ReadDeclaredThing', resource: 'declared_thing', operation: 'read' })
		requirePolicies({
			matcher: '/admin/declared-things',
			method: ['GET'],
			policies: [{ resource: 'declared_thing', operation: 'read' }]
		})

		expect(getUnregisteredGuardResources()).toEqual([])

		const { logged, logger } = capture()
		reportUnregisteredGuardResources(logger)
		expect(logged).toEqual([])
	})

	it('is silent when there are no declarations at all', () => {
		const { logged, logger } = capture()

		reportUnregisteredGuardResources(logger)

		expect(logged).toEqual([])
	})

	it('never reports the wildcard, which no policy can declare', () => {
		requirePolicies({ matcher: '/admin/anything', method: ['GET'], policies: [{ resource: '*', operation: 'read' }] })

		expect(getUnregisteredGuardResources()).toEqual([])
	})

	it('marks a resource live when a registered route matches, and says the routes deny today', () => {
		reset([{ method: 'POST', matcher: '/admin/live-things/:id' }])
		requirePolicies({
			matcher: '/admin/live-things/:id',
			method: ['POST'],
			policies: [{ resource: 'live_unregistered_thing', operation: 'update' }]
		})

		expect(getUnregisteredGuardResources()[0].live).toBe(true)

		const { logged, logger } = capture()
		reportUnregisteredGuardResources(logger)
		expect(logged.join('\n')).toContain('denies every actor without a wildcard grant today')
	})

	it('marks a resource latent when no registered route matches, and says nothing is denied yet', () => {
		reset([{ method: 'GET', matcher: '/admin/somewhere-else' }])
		requirePolicies({
			matcher: '/admin/latent-things/:id',
			method: ['POST'],
			policies: [{ resource: 'latent_unregistered_thing', operation: 'update' }]
		})

		expect(getUnregisteredGuardResources()[0].live).toBe(false)

		const { logged, logger } = capture()
		reportUnregisteredGuardResources(logger)
		expect(logged.join('\n')).toContain('nothing is denied until one appears')
	})

	it('reports a declaration whose casing differs from the registered name, since enforcement compares them raw', () => {
		definePolicies({ name: 'ReadCasedThing', resource: 'casedThing', operation: 'read' })
		requirePolicies({
			matcher: '/admin/cased-things',
			method: ['GET'],
			// `definePolicies` normalized the registration to `cased_thing`, so this
			// literal matches no policy and the grant is unholdable.
			policies: [{ resource: 'casedThing', operation: 'read' }]
		})

		expect(getUnregisteredGuardResources().map(entry => entry.resource)).toEqual(['casedThing'])
	})

	it('lists a guard once when it names the same resource at several operations', () => {
		guardResource({ resource: 'multi_op_unregistered_thing', prefix: '/admin/multi-op-things' })

		const [found] = getUnregisteredGuardResources()
		const keys = found.guards.map(guard => `${guard.methods.join(',')} ${guard.matcher}`)
		expect(new Set(keys).size).toBe(keys.length)
	})
})
