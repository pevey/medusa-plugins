jest.mock('../has-permission', () => {
	const actual = jest.requireActual('../has-permission')
	return { ...actual, authorize: jest.fn(actual.authorize) }
})

// `canonicalQueryRoot` (query-roots.ts) reads the real module registry via
// `MedusaModule.getAllJoinerConfigs()`. Mirrors the fixture shape used by
// `scoped-query.unit.spec.ts`; aliases cover both this file's pre-existing
// scoped-resource name ("customer") and the new describe block's ("widget").
jest.mock('@medusajs/framework/modules-sdk', () => ({
	MedusaModule: {
		getAllJoinerConfigs: () => [
			{ serviceName: 'widget', alias: [{ name: ['widget', 'widgets'], entity: 'Widget' }] },
			{
				serviceName: 'customer',
				alias: [
					{ name: ['customer', 'customers'], entity: 'Customer' },
					{ name: ['order', 'orders'], entity: 'Order' }
				],
				schema: `
					type Customer {
						id: ID
						orders: [Order]
					}
					type Order {
						id: ID
						sales_channel_id: String
					}
				`
			}
		]
	}
}))

import { accessGuard } from '../access-guard'
import { linkedAccessRoles, registerActorResolver } from '../actor-resolvers'
import { authorize } from '../has-permission'
import { requirePolicies, sealNamespace } from '../route-guards'
import { definePolicies } from '../define-policies'
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
const error = jest.fn()

const makeReq = (overrides: Record<string, any> = {}) =>
	({
		method: 'GET',
		originalUrl: '/admin/widgets',
		path: '/admin/widgets',
		auth_context: { actor_id: 'usr_1', actor_type: 'user' },
		scope: {
			resolve: (key: string) => (key === 'logger' ? { warn, error } : { graph: jest.fn() }),
			register: jest.fn(),
			hasRegistration: jest.fn(() => false)
		},
		...overrides
	}) as any

const makeRes = () => {
	const res: any = { headersSent: false, statusCode: 200 }
	res.json = jest.fn()
	res.status = jest.fn((code: number) => {
		res.statusCode = code
		return res
	})
	return res
}

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
	// A non-reserved actor type: `user`/`customer`/`api-key` are reserved and
	// duplicate registration throws, so overriding a built-in here would collide
	// with that. The actor's grants are stubbed at `authorize`
	// (mocked above) rather than through real role/policy data, so role
	// resolution just needs to return a non-null id — the mocked decision
	// ignores it.
	const SCOPED_ACTOR_TYPE = 'scoped-test-actor'

	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
		// Re-registering an actor type throws, and this describe's tests each
		// register SCOPED_ACTOR_TYPE fresh -- reset the resolver map
		// per test rather than reuse the built-in-carrying one from
		// `resetRegistries` (this describe never needs `user`/`customer`).
		//
		// WARNING: this wipes the built-in `user`/`customer`/`api-key` resolvers
		// for the REST OF THE FILE. Every describe below re-registers what it
		// needs, which is the only reason it is safe. A new describe appended
		// after this one that assumes the built-ins are present will fail, and
		// the failure will look like a resolver bug rather than test-order
		// contamination -- register explicitly instead of relying on them.
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

describe('the guard admits and narrows scoped grants', () => {
	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		error.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
	})

	afterAll(() => {
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	// `makeReq()`'s default actor type is 'user' (built-in resolver, which
	// queries a real link) rather than a custom test type, so its resolver is
	// replaced directly on the registry -- `registerActorResolver` throws on a
	// duplicate registration. The stubbed role ids are never inspected: the
	// mocked `authorize` below decides access directly.
	const grantScoped = (resource = 'widget') => {
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource, scope: 'own' }] })
	}

	it('admits a scoped GET, shadows both query keys, and records enforcement', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		grantScoped()
		const req = makeReq({ originalUrl: '/admin/widgets' })
		const next = jest.fn()

		await accessGuard(req, makeRes(), next)

		expect(next).toHaveBeenCalledWith()
		expect((req as any).accessScopes).toEqual([{ resource: 'widget', scope: 'own' }])
		expect((req as any).accessEnforcement.required.has('widget')).toBe(true)
		expect(req.scope.register).toHaveBeenCalledWith(
			expect.objectContaining({ query: expect.anything(), remoteQuery: expect.anything(), access_unscoped_query: expect.anything() })
		)
	})

	it('still denies when the scope has no registered filter', async () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		grantScoped()
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})

	it('denies when the filter resolver throws', async () => {
		defineScope({
			name: 'own',
			resource: 'widget',
			filter: async () => {
				throw new Error('db down')
			}
		})
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		grantScoped()
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})

	it('denies a scoped mutation unless a matching declaration asserts scope', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets/:id', method: ['DELETE'], policies: [{ resource: 'widget', operation: 'delete' }] })
		grantScoped()
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets/w_1', method: 'DELETE' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})

	it('admits a scoped mutation when the declaration asserts scope', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({
			matcher: '/admin/widgets/:id',
			method: ['DELETE'],
			policies: [{ resource: 'widget', operation: 'delete' }],
			assertsScope: true
		})
		grantScoped()
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets/w_1', method: 'DELETE' }), makeRes(), next)

		expect(next).toHaveBeenCalledWith()
	})

	it('denies when a scoped resource is required by two different operations', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({
			matcher: '/admin/widgets/special',
			method: ['GET'],
			policies: [
				{ resource: 'widget', operation: 'read' },
				{ resource: 'widget', operation: 'update' }
			]
		})
		grantScoped() // scoped on at least one of the two operations
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets/special' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})

	it('replaces an unnarrowed 2xx response with a 403', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		grantScoped()
		const req = makeReq({ originalUrl: '/admin/widgets' })
		const res = makeRes()
		const originalJsonSpy = res.json

		await accessGuard(req, res, jest.fn())
		// handler responds without any widget query having run
		res.json({ things: [] })

		expect(res.status).toHaveBeenCalledWith(403)
		expect(originalJsonSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'forbidden' }))
		expect(originalJsonSpy).not.toHaveBeenCalledWith({ things: [] })
	})

	it('denies when the registered filter resolves to an empty filter', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async () => ({}) })
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		grantScoped()
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
		expect(error).toHaveBeenCalled()
	})

	it('denies when a scope is registered under a non-canonical resource name', async () => {
		defineScope({ name: 'own', resource: 'widgets', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widgets', operation: 'read' }] })
		grantScoped('widgets')
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('widgets:own'))
	})

	it('proceeds when the scope is registered under the canonical resource name', async () => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		grantScoped()
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), next)

		expect(next).toHaveBeenCalledWith()
	})
})

/**
 * A `res` double covering the terminal paths a real Express response exposes.
 * `send`/`end`/`write` are what a handler answering with a string, a Buffer, a
 * file, or a stream goes through — none of which touch `res.json`, which is
 * where the enforcement ledger's release check used to live alone.
 */
const makeStreamRes = () => {
	const res: any = { headersSent: false, statusCode: 200, destroyed: false, sent: undefined, ended: false, chunks: [] }
	res.status = jest.fn((code: number) => {
		res.statusCode = code
		return res
	})
	res.json = jest.fn((body: any) => {
		res.sent = body
		res.headersSent = true
		return res
	})
	res.send = jest.fn((body: any) => {
		res.sent = body
		res.headersSent = true
		return res
	})
	res.write = jest.fn((chunk: any) => {
		res.chunks.push(chunk)
		res.headersSent = true
		return true
	})
	res.end = jest.fn((chunk?: any) => {
		if (chunk !== undefined) {
			res.sent = chunk
		}
		res.ended = true
		res.headersSent = true
		return res
	})
	res.destroy = jest.fn(() => {
		res.destroyed = true
		return res
	})
	return res
}

describe('the enforcement ledger releases non-JSON responses', () => {
	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		error.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
	})

	afterAll(() => {
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	const admitScoped = async (res: any) => {
		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'widget', scope: 'own' }] })

		const req = makeReq({ originalUrl: '/admin/widgets' })
		await accessGuard(req, res, jest.fn())
		return req
	}

	it('replaces an unsatisfied res.send with a 403 instead of shipping the body', async () => {
		const res = makeStreamRes()
		await admitScoped(res)

		res.send('unnarrowed csv rows')

		expect(res.statusCode).toBe(403)
		expect(res.sent).not.toBe('unnarrowed csv rows')
		expect(res.sent).toMatchObject({ type: 'forbidden' })
	})

	it('replaces an unsatisfied res.end with a 403', async () => {
		const res = makeStreamRes()
		await admitScoped(res)

		res.end('unnarrowed body')

		expect(res.statusCode).toBe(403)
		expect(res.sent).not.toBe('unnarrowed body')
	})

	it('denies at the first write, before a stream can flush its headers', async () => {
		const res = makeStreamRes()
		await admitScoped(res)

		res.write('chunk one')

		expect(res.statusCode).toBe(403)
		expect(res.chunks).not.toContain('chunk one')
	})

	it('lets a satisfied response through untouched', async () => {
		const res = makeStreamRes()
		const req = await admitScoped(res)
		;(req as any).accessEnforcement.narrowed.add('widget')

		res.send('legitimately narrowed rows')

		expect(res.statusCode).toBe(200)
		expect(res.sent).toBe('legitimately narrowed rows')
	})

	it('checks once, so json delegating to send internally cannot double-deny', async () => {
		const res = makeStreamRes()
		const req = await admitScoped(res)
		;(req as any).accessEnforcement.asserted.add('widget')

		res.json({ widgets: [] })
		res.send('express delegating internally')

		expect(res.statusCode).toBe(200)
	})

	it('destroys the response when the violation is only detectable after headers went out', async () => {
		const res = makeStreamRes()
		await admitScoped(res)
		res.headersSent = true

		res.end('trailing chunk')

		expect(res.destroyed).toBe(true)
	})

	it('logs the gap at error level, naming the unnarrowed resource', async () => {
		const res = makeStreamRes()
		await admitScoped(res)

		res.send('unnarrowed')

		expect(error).toHaveBeenCalledWith(expect.stringContaining('widget'))
	})

	it('leaves res.send alone on an unscoped request', async () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [] })
		const res = makeStreamRes()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), res, jest.fn())
		res.send('ordinary response')

		expect(res.statusCode).toBe(200)
		expect(res.sent).toBe('ordinary response')
	})
})

describe('undeclared routes: memoized, otherwise untouched', () => {
	const REQUEST_SCOPE = Symbol.for('access.requestScope')

	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		error.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
	})

	afterAll(() => {
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	it('memoizes role resolution on an authenticated request to an undeclared route', async () => {
		const req = makeReq({ originalUrl: '/admin/some-third-party-route' })
		const next = jest.fn()

		await accessGuard(req, makeRes(), next)

		expect(next).toHaveBeenCalledWith()
		expect((req.scope as any)[REQUEST_SCOPE]).toBe(true)
	})

	it('does not mark an unauthenticated request', async () => {
		const req = makeReq({ originalUrl: '/store/anything', auth_context: undefined })

		await accessGuard(req, makeRes(), jest.fn())

		expect((req.scope as any)[REQUEST_SCOPE]).toBeUndefined()
	})

	it('does not run a registered actor authenticator on an undeclared route', async () => {
		// Running it would let access end a request the app would otherwise have
		// served -- the fail-open guarantee is that installing this plugin cannot
		// change how an access-unaware route behaves.
		const authenticate = jest.fn((_req: any, _res: any, done: () => void) => done())
		registerActorResolver({
			actorType: 'undeclared_probe_actor',
			resolve: async () => [],
			authenticate,
			prefixes: ['/probe']
		})

		await accessGuard(makeReq({ originalUrl: '/probe/anything', auth_context: undefined }), makeRes(), jest.fn())

		expect(authenticate).not.toHaveBeenCalled()
	})

	it('does not wrap the response on an undeclared route', async () => {
		const res = makeRes()
		const originalJson = res.json

		await accessGuard(makeReq({ originalUrl: '/admin/some-third-party-route' }), res, jest.fn())

		expect(res.json).toBe(originalJson)
	})

	it('still denies an undeclared route inside a sealed namespace', async () => {
		sealNamespace('/admin/sealed')
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/sealed/anything' }), makeRes(), next)

		expect(next.mock.calls[0][0]?.type).toBe('forbidden')
	})
})

describe('configuration warnings re-arm when the registry that fixes them changes', () => {
	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
	})

	afterAll(() => {
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	it('warns about an unenforceable scope again once any scope is registered', async () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'widget', scope: 'ghost' }] })

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), jest.fn())
		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), jest.fn())
		expect(warn).toHaveBeenCalledTimes(1)

		// The operator's fix. Not the ghost scope itself -- the point is that the
		// dedupe is cleared by registry mutation, so the next request re-reports
		// whatever is still wrong instead of staying silent until a restart.
		defineScope({ name: 'own', resource: 'widget', filter: async () => ({ owner_id: 'x' }) })

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), jest.fn())
		expect(warn).toHaveBeenCalledTimes(2)
	})

	it('warns about an unresolved actor type again once a resolver is registered', async () => {
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })

		await accessGuard(makeReq({ auth_context: { actor_id: 'a_1', actor_type: 'ghost_actor' } }), makeRes(), jest.fn())
		await accessGuard(makeReq({ auth_context: { actor_id: 'a_2', actor_type: 'ghost_actor' } }), makeRes(), jest.fn())
		expect(warn).toHaveBeenCalledTimes(1)

		registerActorResolver({ actorType: 'rearm_probe_actor', resolve: async () => [] })

		await accessGuard(makeReq({ auth_context: { actor_id: 'a_3', actor_type: 'ghost_actor' } }), makeRes(), jest.fn())
		expect(warn).toHaveBeenCalledTimes(2)
	})
})

describe('client disconnect', () => {
	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
	})

	afterAll(() => {
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	it('stops before resolving roles when the client has already gone', async () => {
		const resolve = jest.fn(async () => ['role_1'])
		;(global as any).AccessActorResolvers.set('user', resolve)
		const res = makeRes()
		res.destroyed = true
		const next = jest.fn()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), res, next)

		expect(resolve).not.toHaveBeenCalled()
		expect(next).not.toHaveBeenCalled()
	})

	it('still resolves roles for a live request', async () => {
		const resolve = jest.fn(async () => ['role_1'])
		;(global as any).AccessActorResolvers.set('user', resolve)
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [] })

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), makeRes(), jest.fn())

		expect(resolve).toHaveBeenCalled()
	})
})

describe('a scoped relation is narrowed in the response', () => {
	beforeAll(() => {
		// The filter only checks paths resolving to a registered policy resource.
		definePolicies([
			{ name: 'RelReadCustomer', resource: 'customer', operation: 'read' },
			{ name: 'RelReadOrder', resource: 'order', operation: 'read' }
		])
	})

	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		error.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
	})

	afterAll(() => {
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	// The actor reads customers outright and orders only within their sales
	// channel. The row filter reaches only the query root, so every order of a
	// visible customer arrives -- including ones in other channels.
	const request = async (responseBody: any, options: { inScopeIds?: string[]; graphThrows?: boolean; unscoped?: boolean } = {}) => {
		defineScope({ name: 'sales_channel', resource: 'order', filter: async () => ({ sales_channel_id: ['sc_1'] }) })
		requirePolicies({ matcher: '/admin/customers', method: ['GET'], policies: [{ resource: 'customer', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockImplementation(async (input: any) => {
			const actions = Array.isArray(input.actions) ? input.actions : [input.actions]
			if (!options.unscoped && actions.some((a: any) => a.resource === 'order')) {
				return { granted: true, scopes: [{ resource: 'order', scope: 'sales_channel' }] }
			}
			return { granted: true, scopes: [] }
		})

		// The lookup that decides which relation ids the scope admits.
		const graph = jest.fn(async () => {
			if (options.graphThrows) {
				throw new Error('db down')
			}
			return { data: (options.inScopeIds ?? []).map(id => ({ id })) }
		})

		const req = makeReq({
			originalUrl: '/admin/customers',
			scope: {
				resolve: (key: string) => (key === 'logger' ? { warn, error } : { graph }),
				register: jest.fn(),
				hasRegistration: jest.fn(() => false)
			}
		})
		;(req as any).queryConfig = { entity: 'customer', fields: ['id', 'orders.id'] }

		const res = makeRes()
		await accessGuard(req, res, jest.fn())
		res.json(responseBody)
		// The filter chain awaits authorize, then the scope filter, then the
		// in-scope lookup -- one tick is not enough to settle it.
		for (let i = 0; i < 20; i++) {
			await new Promise(resolve => setImmediate(resolve))
		}
		return { graph }
	}

	it('drops relation rows outside the actor scope and keeps the ones inside', async () => {
		const body = { customers: [{ id: 'cus_1', orders: [{ id: 'ord_in' }, { id: 'ord_out' }] }] }

		await request(body, { inScopeIds: ['ord_in'] })

		expect(body.customers[0].orders.map(o => o.id)).toEqual(['ord_in'])
	})

	it('keeps the relation rather than stripping it wholesale', async () => {
		// The regression this exists for: a scoped grant used to remove the whole
		// branch, so the actor saw none of their own channel's orders.
		const body = { customers: [{ id: 'cus_1', orders: [{ id: 'ord_in' }] }] }

		await request(body, { inScopeIds: ['ord_in'] })

		expect(body.customers[0].orders).toHaveLength(1)
	})

	it('asks the database which ids are in scope rather than testing rows itself', async () => {
		const body = { customers: [{ id: 'cus_1', orders: [{ id: 'ord_in' }, { id: 'ord_out' }] }] }

		const { graph } = await request(body, { inScopeIds: ['ord_in'] })

		expect(graph).toHaveBeenCalledWith(
			expect.objectContaining({
				entity: 'order',
				filters: expect.objectContaining({ id: ['ord_in', 'ord_out'], sales_channel_id: ['sc_1'] })
			})
		)
	})

	it('drops the relation when a row carries no id to check', async () => {
		const body: any = { customers: [{ id: 'cus_1', orders: [{ total: 10 }] }] }

		await request(body, { inScopeIds: [] })

		expect(body.customers[0].orders).toBeUndefined()
	})

	it('drops the relation when the scope lookup fails', async () => {
		const body: any = { customers: [{ id: 'cus_1', orders: [{ id: 'ord_in' }] }] }

		await request(body, { graphThrows: true })

		expect(body.customers[0].orders).toBeUndefined()
	})

	it('leaves an unscoped relation untouched', async () => {
		const body = { customers: [{ id: 'cus_1', orders: [{ id: 'ord_1' }, { id: 'ord_2' }] }] }

		await request(body, { unscoped: true, inScopeIds: [] })

		expect(body.customers[0].orders).toHaveLength(2)
	})
})
