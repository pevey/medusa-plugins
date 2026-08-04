import { MedusaError } from '@medusajs/framework/utils'
import { registerActorResolver, resolveActorRoles } from '../actor-resolvers'

const containerWith = (graph: jest.Mock) => ({ resolve: () => ({ graph }) }) as any

describe('resolveActorRoles', () => {
	it('returns null for an actor type with no registered resolver', async () => {
		await expect(resolveActorRoles('unregistered-actor-type', 'x_1', containerWith(jest.fn()))).resolves.toBeNull()
	})

	it('resolves a user through the access_roles link', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{ access_roles: [{ id: 'acrl_1' }, { id: 'acrl_2' }] }] })

		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual(['acrl_1', 'acrl_2'])
		expect(graph).toHaveBeenCalledWith({ entity: 'user', fields: ['access_roles.id'], filters: { id: 'usr_1' } })
	})

	it('returns an empty array for a user that holds no roles', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{}] })

		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual([])
	})

	it('returns an empty array when the actor row does not exist', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [] })

		await expect(resolveActorRoles('user', 'usr_missing', containerWith(graph))).resolves.toEqual([])
	})

	it('lets a plugin register a resolver for a new actor type', async () => {
		registerActorResolver({ actorType: 'affiliate', resolve: async () => ['acrl_aff'] })

		await expect(resolveActorRoles('affiliate', 'aff_1', containerWith(jest.fn()))).resolves.toEqual(['acrl_aff'])
	})

	it('throws when a second registration targets an already-registered actor type', () => {
		registerActorResolver({ actorType: 'replaceable', resolve: async () => ['first'] })

		expect(() => registerActorResolver({ actorType: 'replaceable', resolve: async () => ['second'] })).toThrow(MedusaError)
	})

	it('names the conflicting actor type in the thrown error message', () => {
		registerActorResolver({ actorType: 'named-conflict', resolve: async () => [] })

		expect(() => registerActorResolver({ actorType: 'named-conflict', resolve: async () => [] })).toThrow(/named-conflict/)
	})

	it('throws the duplicate-registration error, not a pairing error, when the second call has valid authenticate/prefixes pairing', () => {
		registerActorResolver({ actorType: 'conflict-paired', resolve: async () => [] })

		expect(() =>
			registerActorResolver({
				actorType: 'conflict-paired',
				resolve: async () => [],
				authenticate: (_req, _res, next) => next(),
				prefixes: ['/conflict-paired']
			})
		).toThrow(/already registered/)
	})

	it('throws the pairing error, not the duplicate-registration error, when the second call fails both checks', () => {
		registerActorResolver({ actorType: 'conflict-unpaired', resolve: async () => [] })

		expect(() =>
			registerActorResolver({
				actorType: 'conflict-unpaired',
				resolve: async () => [],
				authenticate: (_req, _res, next) => next()
			} as any)
		).toThrow(/supplied "authenticate" without "prefixes"/)
	})

	it('re-running the built-in registration path does not throw and does not clobber an existing resolver', async () => {
		// This package can end up with two live copies of this module body
		// sharing one globalThis (src/ and .medusa/server/src/), and each
		// re-require re-runs the module body — which re-registers the
		// built-ins through the private set-if-absent path. That must stay a
		// silent no-op or HMR/two-realm re-evaluation crashes the app.
		expect(() => {
			jest.resetModules()
			require('../actor-resolvers')
		}).not.toThrow()

		const graph = jest.fn().mockResolvedValue({ data: [{ access_roles: [{ id: 'acrl_1' }] }] })
		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual(['acrl_1'])
	})

	it("throws when a public registerActorResolver call targets the reserved 'user' actor type", () => {
		// `user` is already registered by the built-in at module import time,
		// before any test in this file runs.
		expect(() => registerActorResolver({ actorType: 'user', resolve: async () => ['acrl_override'] })).toThrow(/user/)
	})
})

describe('customer actor resolution', () => {
	it('resolves roles through customer groups', async () => {
		const graph = jest.fn().mockResolvedValue({
			data: [{ groups: [{ access_roles: [{ id: 'acrl_wholesale' }] }, { access_roles: [{ id: 'acrl_vip' }] }] }]
		})

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_wholesale', 'acrl_vip'])
		expect(graph).toHaveBeenCalledWith({
			entity: 'customer',
			fields: ['access_roles.id', 'groups.access_roles.id'],
			filters: { id: 'cus_1' }
		})
	})

	it('deduplicates a role reached through two groups', async () => {
		const graph = jest.fn().mockResolvedValue({
			data: [{ groups: [{ access_roles: [{ id: 'acrl_shared' }] }, { access_roles: [{ id: 'acrl_shared' }] }] }]
		})

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_shared'])
	})

	it('returns an empty array for a customer in no groups', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{ groups: [] }] })

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual([])
	})

	it('returns an empty array for a customer whose groups carry no roles', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{ groups: [{ access_roles: [] }, {}] }] })

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual([])
	})
})

describe('api-key actor resolution', () => {
	it('resolves an api key through the access_roles link', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{ access_roles: [{ id: 'acrl_1' }, { id: 'acrl_2' }] }] })

		await expect(resolveActorRoles('api-key', 'apk_1', containerWith(graph))).resolves.toEqual(['acrl_1', 'acrl_2'])
		expect(graph).toHaveBeenCalledWith({ entity: 'api_key', fields: ['access_roles.id'], filters: { id: 'apk_1' } })
	})

	it('returns an empty array for an api key that holds no roles', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{}] })

		await expect(resolveActorRoles('api-key', 'apk_1', containerWith(graph))).resolves.toEqual([])
	})
})

describe('actor authentication registration', () => {
	it('accepts authenticate and prefixes together', () => {
		expect(() =>
			registerActorResolver({
				actorType: 'affiliate-auth',
				resolve: async () => [],
				authenticate: (_req, _res, next) => next(),
				prefixes: ['/affiliate']
			})
		).not.toThrow()
	})

	it('throws when authenticate is supplied without prefixes', () => {
		expect(() => registerActorResolver({ actorType: 'a1', resolve: async () => [], authenticate: (_req, _res, next) => next() } as any)).toThrow(/prefixes/i)
	})

	it('throws when prefixes is supplied without authenticate', () => {
		expect(() => registerActorResolver({ actorType: 'a2', resolve: async () => [], prefixes: ['/a2'] } as any)).toThrow(/authenticate/i)
	})

	const withPrefixes = (actorType: string, prefixes: string[]) => () =>
		registerActorResolver({ actorType, resolve: async () => [], authenticate: (_req: any, _res: any, next: any) => next(), prefixes })

	it('throws on an empty prefixes array, which no request could ever match', () => {
		expect(withPrefixes('a3', [])).toThrow(/empty/i)
	})

	it.each(['/', '', '//'])('throws on the root prefix %p, which would match every path', prefix => {
		// An authenticator on `/` runs against every guarded request, including
		// surfaces core already authenticates — the opposite of "the paths the actor
		// type owns".
		expect(withPrefixes(`root-${prefix.length}`, [prefix])).toThrow(/root prefix/i)
	})

	it.each(['/admin', '/store', '/Admin', '/store/'])('throws on the reserved prefix %p', prefix => {
		// The rejection exists so a plugin authenticator cannot reject guest
		// storefront traffic core would have allowed. Case- and trailing-slash
		// folded, or the reservation is bypassable by typing it differently.
		expect(withPrefixes(`reserved-${prefix.replace(/\W/g, '')}`, [prefix])).toThrow(/reserved prefix/i)
	})

	it('rejects the whole registration when only one of several prefixes is bad', () => {
		expect(withPrefixes('mixed', ['/affiliate', '/admin'])).toThrow(/reserved prefix/i)
		// And leaves nothing behind: a partially-applied registration would have the
		// resolver live with an authenticator that never validated.
		expect((global as any).AccessActorResolvers.has('mixed')).toBe(false)
	})
})

describe('customer resolves direct and group roles', () => {
	it('unions directly-linked roles with group roles', async () => {
		const graph = jest.fn().mockResolvedValue({
			data: [{ access_roles: [{ id: 'acrl_direct' }], groups: [{ access_roles: [{ id: 'acrl_group' }] }] }]
		})

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_direct', 'acrl_group'])
	})

	it('deduplicates a role held both directly and through a group', async () => {
		const graph = jest.fn().mockResolvedValue({
			data: [{ access_roles: [{ id: 'acrl_shared' }], groups: [{ access_roles: [{ id: 'acrl_shared' }] }] }]
		})

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_shared'])
	})

	it('works with only direct roles', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{ access_roles: [{ id: 'acrl_direct' }], groups: [] }] })

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_direct'])
	})

	it('tolerates a null entry inside the groups array', async () => {
		const graph = jest.fn().mockResolvedValue({
			data: [{ access_roles: [], groups: [null, { access_roles: [{ id: 'acrl_group' }] }] }]
		})

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_group'])
	})

	it('requests both field paths in one query', async () => {
		const graph = jest.fn().mockResolvedValue({ data: [{}] })

		await resolveActorRoles('customer', 'cus_1', containerWith(graph))

		expect(graph).toHaveBeenCalledWith({
			entity: 'customer',
			fields: ['access_roles.id', 'groups.access_roles.id'],
			filters: { id: 'cus_1' }
		})
	})
})

describe('actor lookups bypass a scoped query', () => {
	it('resolves ACCESS_UNSCOPED_QUERY in preference to QUERY when registered', async () => {
		const unscopedGraph = jest.fn().mockResolvedValue({ data: [{ access_roles: [{ id: 'acrl_1' }] }] })
		const scopedGraph = jest.fn().mockResolvedValue({ data: [{ access_roles: [] }] })
		const container = {
			hasRegistration: (key: string) => key === 'access_unscoped_query',
			resolve: (key: string) => (key === 'access_unscoped_query' ? { graph: unscopedGraph } : { graph: scopedGraph })
		} as any

		await expect(resolveActorRoles('user', 'usr_1', container)).resolves.toEqual(['acrl_1'])
		expect(unscopedGraph).toHaveBeenCalled()
		expect(scopedGraph).not.toHaveBeenCalled()
	})
})
