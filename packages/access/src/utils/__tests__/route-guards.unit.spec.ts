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

describe('request-path normalization (Express routes these; the guard must too)', () => {
	beforeEach(resetRegistries)

	it('matches case-insensitively', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		// Express sets neither `case sensitive routing` nor `strict routing`, so it
		// dispatches /admin/Complaints/abc to the /admin/complaints/:id handler.
		// A case-sensitive guard would miss it and fail open.
		expect(matchRoutePolicies('/admin/Complaints/abc', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
		expect(matchRoutePolicies('/admin/COMPLAINTS', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
	})

	it('matches a trailing slash on the request path', () => {
		requirePolicies({
			matcher: '/admin/access/roles',
			method: ['POST'],
			policies: [{ resource: 'access_role', operation: 'create' }]
		})

		// One trailing character previously re-opened an unguarded role-creation route.
		expect(matchRoutePolicies('/admin/access/roles/', 'POST')).toEqual([{ resource: 'access_role', operation: 'create' }])
	})

	it('does not let a trailing slash fall through to the subtree rule', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		// '/admin/complaints/' must be the COLLECTION (create), not the subtree
		// (update) — otherwise an update grant would let you create.
		expect(matchRoutePolicies('/admin/complaints/', 'POST')).toEqual([{ resource: 'complaint', operation: 'create' }])
	})

	it('treats HEAD as GET', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		// Express dispatches HEAD to the GET handler; an unguarded HEAD is an
		// existence oracle.
		expect(matchRoutePolicies('/admin/complaints/cmp_1', 'HEAD')).toEqual([{ resource: 'complaint', operation: 'read' }])
	})

	it('collapses duplicate slashes', () => {
		guardResource({ resource: 'complaint', prefix: '/admin/complaints' })

		expect(matchRoutePolicies('/admin//complaints', 'GET')).toEqual([{ resource: 'complaint', operation: 'read' }])
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

	it('seals case-insensitively and ignores a trailing slash', () => {
		sealNamespace('/admin/complaints')

		// Capitalisation previously walked straight past the seal.
		expect(isPathSealed('/admin/Complaints/abc')).toBe(true)
		expect(isPathSealed('/admin/COMPLAINTS')).toBe(true)
		expect(isPathSealed('/admin/complaints/')).toBe(true)
	})
})

describe('hasPermission with no roles', () => {
	it('denies rather than allows', async () => {
		const { hasPermission } = await import('../has-permission')

		// Returns before touching the container, so a stub is sufficient.
		await expect(
			hasPermission({
				roles: [],
				actions: { resource: 'mcp', operation: 'write' },
				container: {} as any
			})
		).resolves.toBe(false)
	})

	it('allows when nothing is required', async () => {
		const { hasPermission } = await import('../has-permission')

		await expect(hasPermission({ roles: [], actions: [], container: {} as any })).resolves.toBe(true)
	})
})

describe('guard registry indexing', () => {
	beforeEach(resetRegistries)

	it('does not return a guard from a different top-level segment', () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		requirePolicies({ matcher: '/store/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'export' }] })

		expect(matchRoutePolicies('/admin/widgets', 'GET')).toEqual([{ resource: 'widget', operation: 'read' }])
		expect(matchRoutePolicies('/store/widgets', 'GET')).toEqual([{ resource: 'widget', operation: 'export' }])
	})

	it('still applies a root-level wildcard guard to every segment', () => {
		requirePolicies({ matcher: '/*', method: ['GET'], policies: [{ resource: 'everything', operation: 'read' }] })

		expect(matchRoutePolicies('/admin/widgets', 'GET')).toEqual([{ resource: 'everything', operation: 'read' }])
		expect(matchRoutePolicies('/store/things', 'GET')).toEqual([{ resource: 'everything', operation: 'read' }])
	})

	it('picks up guards registered after a previous lookup built the index', () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		expect(matchRoutePolicies('/admin/widgets', 'GET')).toHaveLength(1)

		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'update' }] })
		expect(matchRoutePolicies('/admin/widgets', 'GET')).toHaveLength(2)
	})

	it('rebuilds when the registry array is replaced wholesale', () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		expect(matchRoutePolicies('/admin/widgets', 'GET')).toHaveLength(1)

		resetRegistries()
		requirePolicies({ matcher: '/admin/gadgets', method: ['GET'], policies: [{ resource: 'gadget', operation: 'read' }] })

		expect(matchRoutePolicies('/admin/widgets', 'GET')).toEqual([])
		expect(matchRoutePolicies('/admin/gadgets', 'GET')).toEqual([{ resource: 'gadget', operation: 'read' }])
	})

	it('is case-insensitive on the indexed segment', () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })

		expect(matchRoutePolicies('/Admin/Widgets', 'GET')).toEqual([{ resource: 'widget', operation: 'read' }])
	})

	it('does not bucket a matcher whose first segment embeds a param', () => {
		requirePolicies({ matcher: '/user:id/x', method: ['GET'], policies: [{ resource: 'user', operation: 'read' }] })

		expect(matchRoutePolicies('/user123/x', 'GET')).toEqual([{ resource: 'user', operation: 'read' }])
	})

	it('buckets a non-ASCII first segment so a case-variant request still matches (toLowerCase/regex-i folding divergence)', () => {
		// U+00B5 MICRO SIGN ('µ') and U+03BC GREEK SMALL LETTER MU ('μ') both
		// uppercase to U+039C (Greek capital mu), so guard.regex's 'i' flag
		// (which canonicalizes via toUpperCase) treats them as equal — but
		// they lowercase to themselves, staying distinct. A bucket key built
		// with toLowerCase would put this guard under 'µapi' while a request
		// for the greek-mu variant looks up 'μapi': a miss, even though
		// Express would route the request straight to the guarded handler.
		requirePolicies({ matcher: '/µapi/secret', method: ['GET'], policies: [{ resource: 'secret', operation: 'read' }] })

		expect(matchRoutePolicies('/μapi/secret', 'GET')).toEqual([{ resource: 'secret', operation: 'read' }])
	})
})

describe('seal exemptions', () => {
	beforeEach(resetRegistries)

	it('never seals /auth even when explicitly sealed', () => {
		sealNamespace('/auth')

		expect(isPathSealed('/auth')).toBe(false)
		expect(isPathSealed('/auth/user/emailpass')).toBe(false)
	})

	it('rejects an empty or root prefix as invalid', () => {
		expect(() => sealNamespace('/')).toThrow(/not a valid prefix/i)
		expect(() => sealNamespace('')).toThrow(/not a valid prefix/i)
		expect(isPathSealed('/admin/anything')).toBe(false)
	})

	it('still seals a sibling that merely starts with the same characters', () => {
		sealNamespace('/authoring')

		expect(isPathSealed('/authoring/drafts')).toBe(true)
		expect(isPathSealed('/auth/session')).toBe(false)
	})
})
