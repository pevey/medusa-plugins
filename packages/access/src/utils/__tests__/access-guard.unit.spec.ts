jest.mock('../has-permission', () => {
	const actual = jest.requireActual('../has-permission')
	return { ...actual, authorize: jest.fn(actual.authorize) }
})

import { accessGuard } from '../access-guard'
import { registerActorResolver } from '../actor-resolvers'
import { authorize } from '../has-permission'
import { requirePolicies, sealNamespace } from '../route-guards'
import { defineScope } from '../scopes'

// Captured once so a later `mockImplementation` can restore real behaviour --
// `mockReset` alone would leave the mock returning `undefined` for any
// describe block that runs after "scoped grants at the guard".
const realAuthorize = jest.requireActual('../has-permission').authorize

const resetRegistries = () => {
	;(global as any).AccessRouteGuards = []
	;(global as any).AccessSealedNamespaces = []
	;(global as any).AccessScopes = new Map()
}

const warn = jest.fn()

const makeReq = (overrides: Record<string, any> = {}) =>
	({
		method: 'GET',
		originalUrl: '/admin/widgets',
		path: '/admin/widgets',
		auth_context: { actor_id: 'usr_1', actor_type: 'user' },
		scope: { resolve: (key: string) => (key === 'logger' ? { warn } : { graph: jest.fn() }) },
		...overrides
	}) as any

const makeRes = () => ({ json: jest.fn(), headersSent: false }) as any

/**
 * A `res` double that behaves like a real Express response for the two things
 * `runAuthenticator` depends on: firing `finish` once the response is ended
 * (so an authenticator that never calls `next` — e.g. Medusa's own
 * `authenticate()` factory on an unauthenticated request — still lets the
 * guard's promise settle instead of hanging forever), and exposing `emit` so
 * a test can simulate `close` firing on its own, as it does when a client
 * aborts the connection before the response finishes flushing.
 */
const makeEventRes = () => {
	const listeners = new Map<string, (() => void)[]>()
	const res: any = {
		headersSent: false,
		once: (event: string, cb: () => void) => {
			const bucket = listeners.get(event) ?? []
			bucket.push(cb)
			listeners.set(event, bucket)
		},
		emit: (event: string) => {
			for (const cb of listeners.get(event) ?? []) {
				cb()
			}
		},
		status: jest.fn(() => res),
		json: jest.fn(() => {
			res.headersSent = true
			res.emit('finish')
			return res
		})
	}
	return res
}

describe('accessGuard actor resolution', () => {
	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
	})

	it('denies with 403 rather than throwing when no resolver is registered for the actor type', async () => {
		const next = jest.fn()
		await accessGuard(makeReq({ auth_context: { actor_id: 'x_1', actor_type: 'unregistered-actor-type' } }), makeRes(), next)

		expect(next).toHaveBeenCalledTimes(1)
		const error = next.mock.calls[0][0]
		expect(error).toBeDefined()
		expect(error.type).toBe('forbidden')
	})

	it('warns once per unresolved actor type', async () => {
		await accessGuard(makeReq({ auth_context: { actor_id: 'apk_1', actor_type: 'unmapped' } }), makeRes(), jest.fn())
		await accessGuard(makeReq({ auth_context: { actor_id: 'apk_2', actor_type: 'unmapped' } }), makeRes(), jest.fn())

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('unmapped')
	})

	it('denies an actor whose resolver returns no roles', async () => {
		registerActorResolver({ actorType: 'roleless', resolve: async () => [] })
		const next = jest.fn()

		await accessGuard(makeReq({ auth_context: { actor_id: 'x_1', actor_type: 'roleless' } }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})

	it('passes an undeclared route through without resolving an actor at all', async () => {
		const resolve = jest.fn()
		registerActorResolver({ actorType: 'counted', resolve })
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/undeclared', auth_context: { actor_id: 'x_1', actor_type: 'counted' } }), makeRes(), next)

		expect(next).toHaveBeenCalledWith()
		expect(resolve).not.toHaveBeenCalled()
	})
})

describe('enforcement outside /admin', () => {
	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
	})

	it('enforces a declared /store path', async () => {
		requirePolicies({ matcher: '/store/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/store/widgets', auth_context: { actor_id: 'cus_1', actor_type: 'unmapped' } }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})

	it('still passes an undeclared /store path through', async () => {
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/store/unguarded' }), makeRes(), next)

		expect(next).toHaveBeenCalledWith()
	})

	it('denies an undeclared path under a sealed non-admin namespace', async () => {
		sealNamespace('/store/private')
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/store/private/thing' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})
})

describe('guard mount', () => {
	afterAll(resetRegistries)

	it('mounts on every prefix, not just /admin', () => {
		const middlewares = require('../../api/middlewares').default
		const guardEntry = middlewares.routes.find((route: any) => route.middlewares?.includes(accessGuard))

		expect(guardEntry.matcher).toBe('/*')
	})
})

describe('scoped grants at the guard', () => {
	// A non-reserved actor type: Task 10 makes `user`/`customer`/`api-key`
	// reserved and duplicate registration throw, so overriding a built-in here
	// would collide with that. The actor's grants are stubbed at `authorize`
	// (mocked above) rather than through real role/policy data, so role
	// resolution just needs to return a non-null id — the mocked decision
	// ignores it.
	const SCOPED_ACTOR_TYPE = 'scoped-test-actor'

	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
		// Task 10 makes re-registering an actor type throw, and this describe's
		// tests each register SCOPED_ACTOR_TYPE fresh -- reset the resolver map
		// per test rather than reuse the built-in-carrying one from
		// `resetRegistries` (this describe never needs `user`/`customer`).
		;(global as any).AccessActorResolvers = new Map()
		registerActorResolver({ actorType: SCOPED_ACTOR_TYPE, resolve: async () => ['role_1'] })
	})

	const scopedReq = (overrides: Record<string, any> = {}) => makeReq({ auth_context: { actor_id: 'x_1', actor_type: SCOPED_ACTOR_TYPE }, ...overrides })

	it('denies a scoped grant with no defineScope registration -- no interceptor exists to enforce it either way', async () => {
		// role grants customer:delete@company, and no defineScope('company', 'customer') exists
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'customer', scope: 'company' }] })
		requirePolicies({ matcher: '/admin/customers/:id', method: ['DELETE'], policies: [{ resource: 'customer', operation: 'delete' }] })
		const next = jest.fn()

		await accessGuard(scopedReq({ originalUrl: '/admin/customers/cus_1', method: 'DELETE' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('customer:company'))
	})

	it('still denies a scoped grant even once defineScope is registered -- registration is not enforcement', async () => {
		defineScope({ name: 'company', resource: 'customer', filter: async () => ({ id: ['cus_1'] }) })
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'customer', scope: 'company' }] })
		requirePolicies({ matcher: '/admin/customers/:id', method: ['DELETE'], policies: [{ resource: 'customer', operation: 'delete' }] })
		const req = scopedReq({ originalUrl: '/admin/customers/cus_1', method: 'DELETE' })
		const next = jest.fn()

		await accessGuard(req, makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
		expect((req as any).accessScopes).toBeUndefined()
	})

	it('attaches no scopes and proceeds for an unrestricted grant', async () => {
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [] })
		requirePolicies({ matcher: '/admin/customers', method: ['GET'], policies: [{ resource: 'customer', operation: 'read' }] })
		const req = scopedReq({ originalUrl: '/admin/customers' })
		const next = jest.fn()

		await accessGuard(req, makeRes(), next)

		expect(next).toHaveBeenCalledWith()
		expect((req as any).accessScopes).toEqual([])
	})
})

describe('actor authentication at the guard', () => {
	// Scoped locally rather than folded into the shared `resetRegistries` --
	// that helper is also used by describes earlier in this file that rely on
	// `AccessActorResolvers` carrying the built-in `user`/`customer`/`api-key`
	// registrations, so clearing it there would make those order-dependent on
	// this block running first.
	beforeEach(() => {
		resetRegistries()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
		;(global as any).AccessActorResolvers = new Map()
		;(global as any).AccessActorAuthenticators = new Map()
	})

	it('runs a registered authenticator for a matching prefix when nothing has authenticated yet', async () => {
		const authenticate = jest.fn((req: any, _res: any, next: any) => {
			req.auth_context = { actor_id: 'aff_1', actor_type: 'affiliate' }
			next()
		})
		registerActorResolver({ actorType: 'affiliate', resolve: async () => ['acrl_1'], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliate/payouts', method: ['GET'], policies: [{ resource: 'payout', operation: 'read' }] })

		await accessGuard(makeReq({ originalUrl: '/affiliate/payouts', auth_context: undefined }), makeRes(), jest.fn())

		expect(authenticate).toHaveBeenCalled()
	})

	it('does not run it for a non-matching prefix', async () => {
		const authenticate = jest.fn((_req: any, _res: any, next: any) => next())
		registerActorResolver({ actorType: 'affiliate', resolve: async () => [], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/admin/things', method: ['GET'], policies: [{ resource: 'thing', operation: 'read' }] })

		await accessGuard(makeReq({ originalUrl: '/admin/things', auth_context: undefined }), makeRes(), jest.fn())

		expect(authenticate).not.toHaveBeenCalled()
	})

	it('does not run it when auth_context is already populated', async () => {
		const authenticate = jest.fn((_req: any, _res: any, next: any) => next())
		registerActorResolver({ actorType: 'affiliate', resolve: async () => [], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliate/payouts', method: ['GET'], policies: [{ resource: 'payout', operation: 'read' }] })

		await accessGuard(makeReq({ originalUrl: '/affiliate/payouts' }), makeRes(), jest.fn())

		expect(authenticate).not.toHaveBeenCalled()
	})

	it('matches prefixes on segment boundaries', async () => {
		const authenticate = jest.fn((_req: any, _res: any, next: any) => next())
		registerActorResolver({ actorType: 'affiliate', resolve: async () => [], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliates/x', method: ['GET'], policies: [{ resource: 'thing', operation: 'read' }] })

		await accessGuard(makeReq({ originalUrl: '/affiliates/x', auth_context: undefined }), makeRes(), jest.fn())

		expect(authenticate).not.toHaveBeenCalled()
	})

	it('does not hang when an authenticator ends the response without calling next', async () => {
		const authenticate = jest.fn((_req: any, res: any) => {
			res.status(401).json({})
		})
		registerActorResolver({ actorType: 'affiliate', resolve: async () => [], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliate/payouts', method: ['GET'], policies: [{ resource: 'payout', operation: 'read' }] })
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/affiliate/payouts', auth_context: undefined }), makeEventRes(), next)

		expect(next).not.toHaveBeenCalled()
	})

	it('does not hang when the connection closes before the authenticator ever finishes or calls next', async () => {
		const res = makeEventRes()
		const authenticate = jest.fn((_req: any, _res: any) => {
			// Simulate a client aborting mid-request: the socket is destroyed,
			// `close` fires on its own (headers were never sent), and `finish`
			// never does. Unlike the `finish` case, `res.headersSent` stays
			// `false`, so the guard falls through to its normal actor-id check --
			// the point of this test is only that it falls through at all rather
			// than hanging forever on the unsettled promise.
			res.emit('close')
		})
		registerActorResolver({ actorType: 'affiliate', resolve: async () => [], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliate/payouts', method: ['GET'], policies: [{ resource: 'payout', operation: 'read' }] })
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/affiliate/payouts', auth_context: undefined }), res, next)

		expect(next).toHaveBeenCalled()
	})

	it("surfaces an authenticator's next(err) through the guard's own next", async () => {
		const boom = new Error('boom')
		const authenticate = jest.fn((_req: any, _res: any, next: any) => next(boom))
		registerActorResolver({ actorType: 'affiliate', resolve: async () => [], authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliate/payouts', method: ['GET'], policies: [{ resource: 'payout', operation: 'read' }] })
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/affiliate/payouts', auth_context: undefined }), makeRes(), next)

		expect(next.mock.calls[0][0]).toBe(boom)
	})

	it('continues normal guard processing when the authenticator calls next() cleanly', async () => {
		const resolve = jest.fn(async () => ['role_1'])
		const authenticate = jest.fn((req: any, _res: any, next: any) => {
			req.auth_context = { actor_id: 'aff_1', actor_type: 'affiliate' }
			next()
		})
		registerActorResolver({ actorType: 'affiliate', resolve, authenticate, prefixes: ['/affiliate'] })
		requirePolicies({ matcher: '/affiliate/payouts', method: ['GET'], policies: [{ resource: 'payout', operation: 'read' }] })

		await accessGuard(makeReq({ originalUrl: '/affiliate/payouts', auth_context: undefined }), makeRes(), jest.fn())

		expect(resolve).toHaveBeenCalledWith('aff_1', expect.anything())
	})
})
