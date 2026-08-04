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
import { rearmWarnings } from '../warn-once'

// Captured once so a later `mockImplementation` can restore real behaviour --
// `mockReset` alone would leave the mock returning `undefined` for any
// describe block that runs after "scoped grants at the guard".
const realAuthorize = jest.requireActual('../has-permission').authorize

// Captured before any test runs, so the built-in `user`/`customer`/`api-key`
// resolvers can be restored rather than re-registered — `registerActorResolver`
// throws on a duplicate, and only `user`'s resolver is individually exported.
const BUILTIN_RESOLVERS = new Map((global as any).AccessActorResolvers ?? [])

/**
 * Every registry the guard reads, reset together.
 *
 * It used to cover three of them, which is why one describe had to wipe the
 * actor resolvers itself and carried a warning that doing so leaked for the rest
 * of the file. Anything a test mutates and this does not restore becomes a
 * cross-describe dependency that jest's declaration order silently holds up.
 */
const resetRegistries = () => {
	;(global as any).AccessRouteGuards = []
	;(global as any).AccessSealedNamespaces = []
	;(global as any).AccessScopes = new Map()
	;(global as any).AccessActorResolvers = new Map(BUILTIN_RESOLVERS)
	;(global as any).AccessActorAuthenticators = new Map()
	for (const bucket of ['actor-type', 'unenforceable-scope', 'non-canonical-scope'] as const) {
		rearmWarnings(bucket)
	}
}

const warn = jest.fn()
const error = jest.fn()
const debug = jest.fn()

const makeReq = (overrides: Record<string, any> = {}) =>
	({
		method: 'GET',
		originalUrl: '/admin/widgets',
		path: '/admin/widgets',
		auth_context: { actor_id: 'usr_1', actor_type: 'user' },
		scope: {
			resolve: (key: string) => (key === 'logger' ? { warn, error, debug } : { graph: jest.fn() }),
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
		// `resetRegistries` already restored the built-ins and dropped everything
		// else, so registering this describe's own actor type cannot collide.
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
	beforeEach(() => {
		resetRegistries()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
		// No built-ins here: this block registers its own actor types and asserts on
		// which authenticator runs, so a `user` resolver in the map would only add
		// noise.
		;(global as any).AccessActorResolvers = new Map()
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
	// A real Express `res` is an EventEmitter; the ledger backstop listens for
	// `finish`. `emitFinish` stands in for Node flushing the last chunk, and
	// honours `once` semantics -- handlers are dropped after firing, as Node does.
	const listeners = new Map<string, Function[]>()
	res.once = jest.fn((event: string, handler: Function) => {
		listeners.set(event, [...(listeners.get(event) ?? []), handler])
		return res
	})
	res.emitFinish = () => {
		const handlers = listeners.get('finish') ?? []
		listeners.delete('finish')
		handlers.forEach(handler => handler())
	}
	return res
}

/**
 * Two properties of the ledger backstop that a real response CANNOT express, so
 * they stay on a double. Everything else about the wrapped and unwrapped
 * terminal paths is proven end to end against a real server further down — the
 * double hid three separate defects (a body shipped under a 403 head, a
 * truncated denial, a doubled denial body) precisely because it modelled no
 * headers and no second terminal call.
 */
describe('the finish backstop, where a real response cannot reach', () => {
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

	const installedOn = (res: any) => (res.once as jest.Mock).mock.calls.some(([event]: [string]) => event === 'finish')

	// `finish` cannot precede a terminal call on the wire — anything written after
	// it is a write-after-end — so this ordering is unreachable over HTTP. It stays
	// because it pins the reason the backstop reads the ledger directly instead of
	// calling `release()`: consuming that one-shot answer here would let a
	// genuinely unsatisfied response released through a wrapped path go unchecked.
	it('does not consume the release latch, so a later wrapped path is still checked', async () => {
		const res = makeStreamRes()
		await admitScoped(res)

		res.emitFinish()
		expect(error).toHaveBeenCalledWith(expect.stringContaining('SHIPPED'))

		res.send('unnarrowed rows')

		expect(res.statusCode).toBe(403)
		expect(res.sent).toMatchObject({ type: 'forbidden' })
	})

	// An unscoped request has no observable difference on the wire — there is no
	// ledger, so nothing to log either way. Listener installation is the only
	// evidence that the backstop stays off the fail-open path.
	it('is installed for a scoped request and not for an unscoped one', async () => {
		const scoped = makeStreamRes()
		await admitScoped(scoped)
		expect(installedOn(scoped)).toBe(true)

		resetRegistries()
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [] })
		const unscoped = makeStreamRes()

		await accessGuard(makeReq({ originalUrl: '/admin/widgets' }), unscoped, jest.fn())

		expect(installedOn(unscoped)).toBe(false)
	})
})

/**
 * The tests above prove the backstop's logic against a `res` double. These prove
 * the premise underneath it: that Node's `finish` really fires on a real
 * response when a handler bypasses the wrapped terminal paths, and that a real
 * bypass really does ship its body.
 *
 * Real express, a real `http.Server`, a real `ServerResponse` — the only thing
 * faked is the container. Express is not a declared dependency of this package
 * and deliberately is not one: nothing in `src/` imports it, and it is always
 * present anyway because `@medusajs/framework` runs on it.
 *
 * The bypass is a middleware mounted BEFORE the guard capturing `writeHead` and
 * `end`, then calling them out of band. That is the ordering hazard no
 * wrapper-based interception can close, and it is not hypothetical: logging,
 * compression and timeout middleware all capture terminal methods, and one that
 * calls its captured copy on a later tick never meets the guard's wrapper.
 *
 * Both have to be captured, which the second test pins: Node's
 * `OutgoingMessage.end` calls `this.writeHead` to emit implicit headers, so a
 * bypass of `end` alone still lands on the `writeHead` wrapper and is denied.
 */
describe('the finish backstop against a real express response', () => {
	const express = require('express')
	const { Server, ServerResponse } = require('http')

	let server: InstanceType<typeof Server>
	let origin: string
	/** Resolves once the server side of the response is over. */
	let responseSettled: Promise<void>
	let markResponseSettled: () => void
	let downloadDir: string
	let downloadPath: string

	beforeAll(async () => {
		const { mkdtempSync, writeFileSync } = require('fs')
		const { join } = require('path')
		const { tmpdir } = require('os')
		downloadDir = mkdtempSync(join(tmpdir(), 'access-guard-'))
		downloadPath = join(downloadDir, 'unnarrowed.txt')
		writeFileSync(downloadPath, 'unnarrowed rows from a file on disk')

		const app = express()

		app.use((req: any, res: any, next: any) => {
			req.auth_context = { actor_id: 'usr_1', actor_type: 'user' }
			req.scope = makeReq().scope
			// Captured before the guard installs its wrappers — this is the whole
			// bypass, and it is the shape a real middleware would take.
			res.locals.escapeHatch = { writeHead: res.writeHead.bind(res), end: res.end.bind(res) }
			next()
		})
		app.use(accessGuard)

		// `res.once('finish')` here registers AFTER the guard's, and Node fires
		// listeners in registration order — so on the finish path this resolving
		// means the backstop has already run. Deterministic, rather than draining
		// ticks and hoping. `close` is the companion for the destroy branch, where
		// the socket dies and `finish` never fires at all.
		const signal = (res: any) => {
			res.once('finish', () => markResponseSettled())
			res.once('close', () => markResponseSettled())
		}

		app.get('/admin/widgets/bypass', (_req: any, res: any) => {
			signal(res)
			const { writeHead, end } = res.locals.escapeHatch
			writeHead(200, { 'content-type': 'text/plain' })
			end('unnarrowed rows')
		})

		app.get('/admin/widgets/end-only', (_req: any, res: any) => {
			signal(res)
			ServerResponse.prototype.end.call(res, 'unnarrowed rows')
		})

		app.get('/admin/widgets/wrapped', (_req: any, res: any) => {
			signal(res)
			res.end('unnarrowed rows')
		})

		// No bypass at all: the ordinary explicit-status streaming pattern, through
		// the wrapped methods, which is what the writeHead wrapper was added for.
		app.get('/admin/widgets/write-head-first', (_req: any, res: any) => {
			signal(res)
			res.writeHead(200, { 'content-type': 'text/plain' })
			res.end('unnarrowed rows')
		})

		// Both set headers describing a body the denial then replaces: `redirect`
		// sets Location and a Content-Length for its own little HTML body, and
		// `sendFile` sets Content-Length, Content-Type and Content-Disposition for
		// the file. Neither is a leak, but a 403 whose declared length does not
		// match its body is a broken response.
		app.get('/admin/widgets/redirect', (_req: any, res: any) => {
			signal(res)
			res.redirect('/admin/widgets/elsewhere')
		})

		app.get('/admin/widgets/download', (_req: any, res: any) => {
			signal(res)
			res.sendFile(downloadPath)
		})

		app.get('/admin/widgets/send', (_req: any, res: any) => {
			signal(res)
			res.send('unnarrowed rows')
		})

		// Express routes an object body through `res.json`, which then calls `send`
		// internally — the re-entry the one-shot answer exists for.
		app.get('/admin/widgets/send-object', (_req: any, res: any) => {
			signal(res)
			res.send({ widgets: ['unnarrowed'] })
		})

		app.get('/admin/widgets/write-then-end', (_req: any, res: any) => {
			signal(res)
			res.write('chunk-a')
			res.end('chunk-b')
		})

		// What a scoped `query.graph` does for the handler, via the interceptor.
		app.get('/admin/widgets/satisfied', (req: any, res: any) => {
			signal(res)
			req.accessEnforcement.narrowed.add('widget')
			res.send('legitimately narrowed rows')
		})

		// `flushHeaders` reaches the wire through `_implicitHeader`, which calls
		// `writeHead` — so it meets the wrapper and is denied cleanly.
		app.get('/admin/widgets/flush-then-end', (_req: any, res: any) => {
			signal(res)
			res.flushHeaders()
			res.end('unnarrowed rows')
		})

		// Headers on the wire WITHOUT meeting a wrapper, which is the only way to
		// reach the destroy branch: the violation becomes detectable after the
		// status is already committed, so truncating is all that is left.
		app.get('/admin/widgets/escaped-head-then-end', (_req: any, res: any) => {
			signal(res)
			res.locals.escapeHatch.writeHead(200, { 'content-type': 'text/plain' })
			res.end('unnarrowed rows')
		})

		app.get('/admin/widgets/escaped-head-then-write-end', (_req: any, res: any) => {
			signal(res)
			res.locals.escapeHatch.writeHead(200, { 'content-type': 'text/plain' })
			res.write('chunk-a')
			res.end('chunk-b')
		})

		app.get('/admin/widgets/server-error', (_req: any, res: any) => {
			signal(res)
			res.status(500).end('the handler blew up')
		})

		// Declared nowhere. Returns a shape the field filter WOULD act on if this
		// route were declared -- an entity envelope with a relation the actor cannot
		// read -- so an identical response is evidence the guard left it alone,
		// not evidence there was nothing to do.
		app.get('/admin/undeclared-probe', (_req: any, res: any) => {
			signal(res)
			res.json({ customers: [{ id: 'cus_1', orders: [{ id: 'ord_1' }] }] })
		})

		server = app.listen(0)
		await new Promise<void>(resolve => server.once('listening', resolve))
		origin = `http://127.0.0.1:${(server.address() as any).port}`
	})

	afterAll(async () => {
		await new Promise<void>(resolve => server.close(() => resolve()))
		require('fs').rmSync(downloadDir, { recursive: true, force: true })
		;(global as any).AccessActorResolvers.set('user', linkedAccessRoles('user'))
	})

	beforeEach(() => {
		resetRegistries()
		error.mockClear()
		responseSettled = new Promise<void>(resolve => (markResponseSettled = resolve))

		defineScope({ name: 'own', resource: 'widget', filter: async actor => ({ owner_id: actor.id }) })
		requirePolicies({ matcher: '/admin/widgets/*', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		// Scoped grant, and no handler here queries `widget`, so the ledger stays
		// unsatisfied — the condition both cases below hinge on.
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'widget', scope: 'own' }] })
	})

	it('fires on a real response whose body escaped every wrapped path', async () => {
		const res = await fetch(`${origin}/admin/widgets/bypass`)
		const body = await res.text()
		await responseSettled

		// The bypass is not prevented, and saying so is the point: the wraps never
		// saw this response, so the unnarrowed body really did ship.
		expect(res.status).toBe(200)
		expect(body).toBe('unnarrowed rows')

		// Which is exactly why the backstop has to be the thing that notices.
		expect(error).toHaveBeenCalledWith(expect.stringContaining('SHIPPED'))
		expect(error).toHaveBeenCalledWith(expect.stringContaining('widget'))
	})

	it('leaves the wrapped path denying, and does not also report it as an escape', async () => {
		const res = await fetch(`${origin}/admin/widgets/wrapped`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
		expect(body).not.toContain('unnarrowed rows')

		// One gap, one line: the release check already logged it, and the backstop
		// must stay quiet on a response that was denied rather than shipped.
		expect(error).toHaveBeenCalledTimes(1)
		expect(error).not.toHaveBeenCalledWith(expect.stringContaining('SHIPPED'))
	})

	it('catches a bypass of end alone, because Node routes it through the wrapped writeHead', async () => {
		const res = await fetch(`${origin}/admin/widgets/end-only`)
		await responseSettled

		// Defence in depth worth pinning: escaping `end` is not enough on its own,
		// so the interception layer is wider than the four wrapped names suggest.
		expect(res.status).toBe(403)
		expect(error).not.toHaveBeenCalledWith(expect.stringContaining('SHIPPED'))
	})

	it('emits a well-formed 403 when denying a redirect, with no stale Location', async () => {
		const res = await fetch(`${origin}/admin/widgets/redirect`, { redirect: 'manual', signal: AbortSignal.timeout(5000) })
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
		// A Content-Length describing the redirect's own body would leave the client
		// waiting for bytes that never come, or truncating ours.
		const declared = res.headers.get('content-length')
		expect(declared === null || Number(declared) === Buffer.byteLength(body)).toBe(true)
		// A 403 still carrying the redirect target invites a client to follow it.
		expect(res.headers.get('location')).toBeNull()
	})

	it('emits a well-formed 403 when denying a file download, with no stale entity headers', async () => {
		const res = await fetch(`${origin}/admin/widgets/download`, { signal: AbortSignal.timeout(5000) })
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		expect(body).not.toContain('unnarrowed rows from a file on disk')
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })

		const declared = res.headers.get('content-length')
		expect(declared === null || Number(declared) === Buffer.byteLength(body)).toBe(true)
		// Otherwise a browser saves the denial JSON as `unnarrowed.txt`.
		expect(res.headers.get('content-disposition')).toBeNull()
	})

	// WP2's stated acceptance criterion, and the invariant the whole fail-open
	// contract rests on: installing this plugin next to an access-unaware one must
	// not change that plugin's output. Asserting a status is not enough -- the
	// filter rewrites bodies, so the bytes are what has to match.
	it('leaves an undeclared route byte-identical whether or not the actor holds a scoped grant', async () => {
		const read = async () => {
			const res = await fetch(`${origin}/admin/undeclared-probe`)
			return { status: res.status, type: res.headers.get('content-type'), length: res.headers.get('content-length'), body: await res.text() }
		}

		// An actor whose grants would build the interceptor and install the field
		// filter on any DECLARED route.
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'widget', scope: 'own' }] })
		const withScopedGrant = await read()

		// An actor holding nothing at all.
		;(authorize as jest.Mock).mockResolvedValue({ granted: false, missing: [] })
		const withNothing = await read()

		expect(withScopedGrant).toEqual(withNothing)
		// Not merely equal to each other -- equal to what the handler wrote.
		expect(JSON.parse(withScopedGrant.body)).toEqual({ customers: [{ id: 'cus_1', orders: [{ id: 'ord_1' }] }] })
		expect(withScopedGrant.status).toBe(200)
		expect(error).not.toHaveBeenCalled()
	})

	it('replaces an unsatisfied res.send with a 403 instead of shipping the body', async () => {
		const res = await fetch(`${origin}/admin/widgets/send`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		expect(body).not.toContain('unnarrowed rows')
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
		expect(error).toHaveBeenCalledWith(expect.stringContaining('completed without narrowing or asserting: widget'))
	})

	it('denies an object body once, through the json-to-send re-entry', async () => {
		const res = await fetch(`${origin}/admin/widgets/send-object`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		expect(body).not.toContain('unnarrowed')
		// One answer, one body: a per-path check would re-enter and try to deny the
		// replacement it had already written.
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
	})

	it('denies at the first write, before a stream can flush its headers', async () => {
		const res = await fetch(`${origin}/admin/widgets/write-then-end`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		expect(body).not.toContain('chunk-a')
		expect(body).not.toContain('chunk-b')
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
	})

	it('lets a satisfied response through untouched', async () => {
		const res = await fetch(`${origin}/admin/widgets/satisfied`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(200)
		expect(body).toBe('legitimately narrowed rows')
		expect(error).not.toHaveBeenCalled()
	})

	it('leaves res.send alone on an unscoped request', async () => {
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [] })

		const res = await fetch(`${origin}/admin/widgets/send`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(200)
		expect(body).toBe('unnarrowed rows')
		expect(error).not.toHaveBeenCalled()
	})

	it('denies a flushed-header response cleanly, because flushing meets the writeHead wrapper', async () => {
		const res = await fetch(`${origin}/admin/widgets/flush-then-end`)
		const body = await res.text()
		await responseSettled

		// Worth pinning: `flushHeaders` is the ordinary way a streaming handler
		// commits its status early, and it does NOT cost the client a truncation.
		expect(res.status).toBe(403)
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
		expect(error).not.toHaveBeenCalledWith(expect.stringContaining('DESTROYED'))
	})

	it('truncates rather than completing a response whose headers escaped the wrappers', async () => {
		// The status was committed before the violation was detectable, so the
		// socket dying IS the denial. What the client gets is a network error, not
		// a short body — worth asserting as such, because it is the one denial
		// shape a caller cannot mistake for data.
		await expect(fetch(`${origin}/admin/widgets/escaped-head-then-end`)).rejects.toThrow()
		await responseSettled

		expect(error).toHaveBeenCalledWith(expect.stringContaining('DESTROYED'))
		expect(error).toHaveBeenCalledWith(expect.stringContaining('truncated body rather than a 403'))
		expect(error).not.toHaveBeenCalledWith(expect.stringContaining('replacing the response with 403'))
	})

	it('logs one truncation line however many terminal calls reach it', async () => {
		await expect(fetch(`${origin}/admin/widgets/escaped-head-then-write-end`)).rejects.toThrow()
		await responseSettled

		const truncations = error.mock.calls.filter(([message]: [string]) => message.includes('DESTROYED'))
		expect(truncations).toHaveLength(1)
	})

	it('leaves a response that already failed alone, and does not report it as an escape', async () => {
		const res = await fetch(`${origin}/admin/widgets/server-error`)
		const body = await res.text()
		await responseSettled

		// `>= 400` never claimed success, so the ledger has nothing to withhold.
		expect(res.status).toBe(500)
		expect(body).toBe('the handler blew up')
		expect(error).not.toHaveBeenCalled()
	})

	it('suppresses the body when a handler sets its status before writing', async () => {
		const res = await fetch(`${origin}/admin/widgets/write-head-first`)
		const body = await res.text()
		await responseSettled

		expect(res.status).toBe(403)
		// The status alone is not the denial. A caller reads the body regardless of
		// it, so a 403 carrying the unnarrowed rows is still a leak.
		expect(body).not.toContain('unnarrowed rows')
		expect(JSON.parse(body)).toMatchObject({ type: 'forbidden' })
	})
})

/**
 * Every branch answers with the same status and the same message on purpose — a
 * Medusa backend is usually internet-facing, and which check refused a caller is
 * configuration detail they should not be able to probe for. That leaves the log
 * as the only place a test (or an operator) can tell them apart, which is what
 * these pin.
 */
describe('denial reasons are recorded for the operator, never for the requester', () => {
	const denialReason = () => {
		const line = debug.mock.calls.map(([message]: [string]) => String(message)).find(message => message.includes('[access] denied ('))
		return line?.match(/denied \(([a-z_]+)\)/)?.[1]
	}

	// The built-in `user` resolver queries the container; these cases only need it
	// to return an id, so they swap in a stub. `resetRegistries` restores the
	// built-ins, so anything that resets mid-test has to re-apply this.
	const useStubUserResolver = () => {
		;(global as any).AccessActorResolvers = new Map()
		registerActorResolver({ actorType: 'user', resolve: async () => ['role_1'] })
	}

	beforeEach(() => {
		resetRegistries()
		warn.mockClear()
		error.mockClear()
		debug.mockClear()
		;(authorize as jest.Mock).mockImplementation(realAuthorize)
		useStubUserResolver()
	})

	const deny = async (setup: () => void, reqOverrides: Record<string, any> = {}) => {
		setup()
		const next = jest.fn()
		await accessGuard(makeReq(reqOverrides), makeRes(), next)
		return { reason: denialReason(), error: next.mock.calls[0]?.[0] }
	}

	const declared = () => requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
	const scopedDecision = (scopes: any[]) => (authorize as jest.Mock).mockResolvedValue({ granted: true, scopes })

	it('records sealed_namespace', async () => {
		const { reason } = await deny(() => sealNamespace('/admin/sealed'), { originalUrl: '/admin/sealed/thing' })
		expect(reason).toBe('sealed_namespace')
	})

	it('records no_actor', async () => {
		const { reason } = await deny(declared, { auth_context: undefined })
		expect(reason).toBe('no_actor')
	})

	it('records no_resolver', async () => {
		const { reason } = await deny(declared, { auth_context: { actor_id: 'x_1', actor_type: 'unregistered-type' } })
		expect(reason).toBe('no_resolver')
	})

	it('records missing_grant', async () => {
		const { reason } = await deny(() => {
			declared()
			;(authorize as jest.Mock).mockResolvedValue({ granted: false, missing: [] })
		})
		expect(reason).toBe('missing_grant')
	})

	it('records unenforceable_scope', async () => {
		const { reason } = await deny(() => {
			declared()
			scopedDecision([{ resource: 'widget', scope: 'never_registered' }])
		})
		expect(reason).toBe('unenforceable_scope')
	})

	it('records non_canonical_scope', async () => {
		const { reason } = await deny(() => {
			declared()
			defineScope({ name: 'own', resource: 'widgets', filter: async () => ({ id: ['w_1'] }) })
			scopedDecision([{ resource: 'widgets', scope: 'own' }])
		})
		expect(reason).toBe('non_canonical_scope')
	})

	it('records multi_operation_scope', async () => {
		const { reason } = await deny(() => {
			requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: ['read', 'update'] }] })
			defineScope({ name: 'own', resource: 'widget', filter: async () => ({ id: ['w_1'] }) })
			scopedDecision([{ resource: 'widget', scope: 'own' }])
		})
		expect(reason).toBe('multi_operation_scope')
	})

	it('records mutation_without_assert', async () => {
		const { reason } = await deny(
			() => {
				requirePolicies({ matcher: '/admin/widgets', method: ['POST'], policies: [{ resource: 'widget', operation: 'update' }] })
				defineScope({ name: 'own', resource: 'widget', filter: async () => ({ id: ['w_1'] }) })
				scopedDecision([{ resource: 'widget', scope: 'own' }])
			},
			{ method: 'POST' }
		)
		expect(reason).toBe('mutation_without_assert')
	})

	it('records scope_resolver_failed', async () => {
		const { reason } = await deny(() => {
			declared()
			defineScope({
				name: 'own',
				resource: 'widget',
				filter: async () => {
					throw new Error('db down')
				}
			})
			scopedDecision([{ resource: 'widget', scope: 'own' }])
		})
		expect(reason).toBe('scope_resolver_failed')
	})

	it('records empty_scope_filter', async () => {
		const { reason } = await deny(() => {
			declared()
			defineScope({ name: 'own', resource: 'widget', filter: async () => ({}) })
			scopedDecision([{ resource: 'widget', scope: 'own' }])
		})
		expect(reason).toBe('empty_scope_filter')
	})

	it('answers every one of them with an identical status and message', async () => {
		const cases: [string, () => void, Record<string, any>][] = [
			['sealed_namespace', () => sealNamespace('/admin/sealed'), { originalUrl: '/admin/sealed/thing' }],
			['no_actor', declared, { auth_context: undefined }],
			['no_resolver', declared, { auth_context: { actor_id: 'x_1', actor_type: 'unregistered-type' } }],
			[
				'missing_grant',
				() => {
					declared()
					;(authorize as jest.Mock).mockResolvedValue({ granted: false, missing: [] })
				},
				{}
			],
			[
				'empty_scope_filter',
				() => {
					declared()
					defineScope({ name: 'own', resource: 'widget', filter: async () => ({}) })
					scopedDecision([{ resource: 'widget', scope: 'own' }])
				},
				{}
			]
		]

		const answers: string[] = []
		for (const [, setup, overrides] of cases) {
			resetRegistries()
			useStubUserResolver()
			;(authorize as jest.Mock).mockImplementation(realAuthorize)
			const { error: thrown } = await deny(setup, overrides)
			answers.push(`${thrown?.type}|${thrown?.message}`)
		}

		// The whole point: an attacker probing these cannot tell them apart, so the
		// set of distinct answers is exactly one.
		expect(new Set(answers).size).toBe(1)
		expect(answers[0]).toBe('forbidden|Insufficient permissions')
	})

	it('keeps the reason out of the error the requester receives', async () => {
		const { error: thrown } = await deny(() => {
			declared()
			;(authorize as jest.Mock).mockResolvedValue({ granted: false, missing: [] })
		})

		// Medusa serializes `{ code, type, message }`. None of them may carry it.
		expect(JSON.stringify({ code: (thrown as any)?.code, type: thrown?.type, message: thrown?.message })).not.toContain('missing_grant')
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

	it('warns about a non-canonical scope again once any scope is registered', async () => {
		// The third bucket WP2 asked for. `defineScope` clears it alongside the
		// unenforceable-scope bucket, so a fixed registration confirms itself
		// without a process restart -- and without this the re-arm call could be
		// deleted with the whole suite staying green.
		requirePolicies({ matcher: '/admin/widgets', method: ['GET'], policies: [{ resource: 'widget', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockResolvedValue({ granted: true, scopes: [{ resource: 'widgets', scope: 'own' }] })
		defineScope({ name: 'own', resource: 'widgets', filter: async () => ({ id: ['w_1'] }) })

		await accessGuard(makeReq(), makeRes(), jest.fn())
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('widgets:own')

		warn.mockClear()
		await accessGuard(makeReq(), makeRes(), jest.fn())
		expect(warn).not.toHaveBeenCalled()

		// Registering any scope re-arms the bucket.
		defineScope({ name: 'rearm_probe', resource: 'widget', filter: async () => ({ id: ['w_1'] }) })

		await accessGuard(makeReq(), makeRes(), jest.fn())
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('widgets:own')
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

/**
 * The pruner is what makes "never fetched" true rather than "fetched and then
 * stripped". Its one untested link was the load-bearing one: `makeFieldPruner`
 * hands `AccessFieldFilter` the **canonical snake_case root** the interceptor
 * keys filters by, while the proven post-query path hands it the response
 * envelope key. If the canonical form does not resolve, pruning silently returns
 * everything — it fails open, so no response changes and no test notices.
 *
 * Asserting on the response cannot see this: pruning and stripping produce
 * byte-identical bodies by construction. The only seam that can is the query
 * itself, so these read the `fields` that reached the real `query.graph`.
 */
/**
 * The post-query strip is the second line: it covers a response not built from
 * the query layer, and a pruning fault. Its traversal (`deletePath`) recurses
 * through arrays and nested objects, and none of that was exercised — the one
 * integration test that reaches it uses a single flat relation.
 */
describe('the response strip removes a field wherever it appears in the tree', () => {
	beforeAll(() => {
		definePolicies([
			{ name: 'StripReadCustomer', resource: 'customer', operation: 'read' },
			{ name: 'StripReadOrder', resource: 'order', operation: 'read' }
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

	const strip = async (body: any, fields: string[] = ['id', 'orders.id']) => {
		requirePolicies({ matcher: '/admin/customers', method: ['GET'], policies: [{ resource: 'customer', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockImplementation(async (input: any) => {
			const actions = Array.isArray(input.actions) ? input.actions : [input.actions]
			// Reads customers, cannot read orders at all -- so `orders` is stripped
			// rather than kept-and-narrowed.
			if (actions.some((a: any) => a.resource === 'order')) {
				return { granted: false, missing: actions }
			}
			return { granted: true, scopes: [] }
		})

		const req = makeReq({ originalUrl: '/admin/customers' })
		;(req as any).queryConfig = { entity: 'customer', fields }

		const res = makeRes()
		await accessGuard(req, res, jest.fn())
		res.json(body)
		for (let i = 0; i < 20; i++) {
			await new Promise(resolve => setImmediate(resolve))
		}
		return body
	}

	it('strips the field from every element of a list, not only the first', async () => {
		const body = {
			customers: [
				{ id: 'cus_1', orders: [{ id: 'ord_1' }] },
				{ id: 'cus_2', orders: [{ id: 'ord_2' }] },
				{ id: 'cus_3', orders: [{ id: 'ord_3' }] }
			]
		}

		await strip(body)

		// The whole relation goes, in every element -- not just its fields.
		expect(body.customers.map(customer => 'orders' in customer)).toEqual([false, false, false])
		// Everything else survives: the strip removes a path, not the row.
		expect(body.customers.map(customer => customer.id)).toEqual(['cus_1', 'cus_2', 'cus_3'])
	})

	it('strips a single-entity envelope as well as a list one', async () => {
		const body: any = { customer: { id: 'cus_1', orders: [{ id: 'ord_1' }] } }

		await strip(body)

		expect(body.customer).toEqual({ id: 'cus_1' })
	})

	it('removes the outermost denied relation, not the requested leafs parent', async () => {
		const body: any = { customer: { id: 'cus_1', orders: [{ id: 'ord_1', items: [{ id: 'li_1' }] }] } }

		await strip(body, ['id', 'orders.items.id'])

		// The denial is on `order`, two levels above the requested leaf. Removing
		// `orders.items` would leave the orders themselves standing and still
		// disclose them; the branch that goes is the one the actor cannot read.
		expect(body.customer).toEqual({ id: 'cus_1' })
	})

	it('leaves pagination metadata beside the entity alone', async () => {
		const body: any = { customers: [{ id: 'cus_1', orders: [{ id: 'ord_1' }] }], count: 1, offset: 0, limit: 20 }

		await strip(body)

		expect(body).toEqual({ customers: [{ id: 'cus_1' }], count: 1, offset: 0, limit: 20 })
	})

	it('is unbothered by a null relation, an empty list, or an absent key', async () => {
		const body: any = { customers: [{ id: 'cus_1', orders: null }, { id: 'cus_2', orders: [] }, { id: 'cus_3' }] }

		await strip(body)

		expect(body.customers).toEqual([{ id: 'cus_1' }, { id: 'cus_2' }, { id: 'cus_3' }])
	})

	// The reason the relation goes rather than its fields: leaving `orders: [{}, {}, {}]`
	// behind tells an actor with no `order:read` at all how many orders the
	// customer has.
	it('discloses no cardinality for a relation the actor cannot read', async () => {
		const body: any = { customer: { id: 'cus_1', orders: [{ id: 'ord_1' }, { id: 'ord_2' }, { id: 'ord_3' }] } }

		await strip(body)

		expect(body.customer.orders).toBeUndefined()
		expect(JSON.stringify(body)).not.toContain('{}')
	})
})

describe('pre-query field pruning reaches the database with fewer fields', () => {
	beforeAll(() => {
		definePolicies([
			{ name: 'PruneReadCustomer', resource: 'customer', operation: 'read' },
			{ name: 'PruneReadOrder', resource: 'order', operation: 'read' }
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

	const fieldsReachingTheDatabase = async (options: { canReadOrders: boolean }) => {
		defineScope({ name: 'own', resource: 'customer', filter: async () => ({ id: ['cus_1'] }) })
		requirePolicies({ matcher: '/admin/customers', method: ['GET'], policies: [{ resource: 'customer', operation: 'read' }] })
		;(global as any).AccessActorResolvers.set('user', async () => ['role_1'])
		;(authorize as jest.Mock).mockImplementation(async (input: any) => {
			const actions = Array.isArray(input.actions) ? input.actions : [input.actions]
			if (actions.some((a: any) => a.resource === 'order')) {
				return options.canReadOrders ? { granted: true, scopes: [] } : { granted: false, missing: actions }
			}
			// Scoped, so the interceptor -- and with it the pruner -- is built at all.
			return { granted: true, scopes: [{ resource: 'customer', scope: 'own' }] }
		})

		const graph = jest.fn(async () => ({ data: [] }))
		let scopedQuery: any
		const req = makeReq({
			originalUrl: '/admin/customers',
			scope: {
				resolve: (key: string) => (key === 'logger' ? { warn, error, debug } : { graph }),
				register: (registrations: any) => {
					const registered = registrations.query
					scopedQuery = typeof registered?.resolve === 'function' ? registered.resolve() : registered
				},
				hasRegistration: jest.fn(() => false)
			}
		})

		await accessGuard(req, makeRes(), jest.fn())
		expect(scopedQuery).toBeDefined()

		await scopedQuery.graph({ entity: 'customer', fields: ['id', 'orders.id'], filters: {} })
		return graph.mock.calls[0]?.[0]?.fields
	}

	it('drops a relation the actor cannot read before the query runs', async () => {
		const fields = await fieldsReachingTheDatabase({ canReadOrders: false })

		expect(fields).toEqual(['id'])
		// The point of the whole mechanism: those rows are never read out of the
		// database, rather than read and then deleted from the response.
		expect(fields).not.toContain('orders.id')
	})

	it('leaves the selection alone when the actor can read the relation', async () => {
		const fields = await fieldsReachingTheDatabase({ canReadOrders: true })

		// Without this the test above passes for a pruner that drops everything,
		// or for one that never resolves the entity and returns nothing.
		expect(fields).toEqual(['id', 'orders.id'])
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
				resolve: (key: string) => (key === 'logger' ? { warn, error, debug } : { graph }),
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
