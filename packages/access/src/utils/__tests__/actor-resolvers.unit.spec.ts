/// <reference types="jest" />
import { MedusaError } from '@medusajs/framework/utils'
import type { RequestHandler } from 'express'
import { registerActorResolver, registerGranteePath, resolveActorHoldings, resolveActorRoles } from '../actor-resolvers'

const containerWith = (graph: jest.Mock) => ({ resolve: () => ({ graph }) }) as any

/** An assignment row as the resolution query returns it. */
const assignment = (role_id: string, grantee_type: string, grantee_id: string, scope_type: string | null = null, scope_id: string | null = null) => ({
	role_id,
	grantee_type,
	grantee_id,
	scope_type,
	scope_id
})

/**
 * Routes `query.graph` calls by entity: actor-row walks get `actorRows`,
 * assignment lookups get `assignmentRows`.
 */
const graphByEntity = (assignmentRows: any[], actorRows: any[] = []) =>
	jest.fn().mockImplementation(({ entity }: { entity: string }) => {
		if (entity === 'access_role_assignment') {
			return Promise.resolve({ data: assignmentRows })
		}
		return Promise.resolve({ data: actorRows })
	})

// Annotated at the handler rather than inline in the call. Several of these registrations are cast
// `as any` on purpose — that cast is what lets the test hand `registerActorResolver` the invalid
// authenticate/prefixes pairings it is supposed to reject — but casting the object literal also
// strips contextual typing from its function params, leaving `_req`/`_res`/`next` implicitly `any`.
const passThrough: RequestHandler = (_req, _res, next) => next()

describe('resolveActorRoles', () => {
	it('returns null for an actor type with no registered resolver', async () => {
		await expect(resolveActorRoles('unregistered-actor-type', 'x_1', containerWith(jest.fn()))).resolves.toBeNull()
	})

	it('resolves a user through identity assignments', async () => {
		const graph = graphByEntity([assignment('acrl_1', 'user', 'usr_1'), assignment('acrl_2', 'user', 'usr_1')])

		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual(['acrl_1', 'acrl_2'])
		expect(graph).toHaveBeenCalledWith({
			entity: 'access_role_assignment',
			fields: ['role_id', 'grantee_type', 'grantee_id', 'scope_type', 'scope_id'],
			filters: { grantee_type: ['user'], grantee_id: ['usr_1'] }
		})
	})

	it('returns an empty array for a user that holds no roles', async () => {
		const graph = graphByEntity([])

		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual([])
	})

	it('drops rows whose type and id each match a DIFFERENT grantee pair', async () => {
		// The lookup filters grantee_type IN (...) AND grantee_id IN (...) — a
		// row can satisfy both columns without matching any actual pair. The
		// post-filter must reject it or an unrelated grantee's role leaks in.
		const graph = graphByEntity(
			[assignment('acrl_leak', 'customer_group', 'cus_1'), assignment('acrl_ok', 'customer', 'cus_1')],
			[{ groups: [] }]
		)

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_ok'])
	})

	it('excludes scoped holdings — a tenancy-pinned role must never resolve as held-everywhere', async () => {
		const graph = graphByEntity([assignment('acrl_scoped', 'user', 'usr_1', 'company', 'comp_1'), assignment('acrl_plain', 'user', 'usr_1')])

		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual(['acrl_plain'])
	})

	it('lets a plugin register a resolver for a new actor type', async () => {
		registerActorResolver({ actorType: 'affiliate', resolve: async () => ['acrl_aff'] })

		await expect(resolveActorRoles('affiliate', 'aff_1', containerWith(graphByEntity([])))).resolves.toEqual(['acrl_aff'])
	})

	it('unions legacy resolver results with identity assignments', async () => {
		registerActorResolver({ actorType: 'vendor', resolve: async () => ['acrl_computed'] })
		const graph = graphByEntity([assignment('acrl_assigned', 'vendor', 'ven_1')])

		await expect(resolveActorRoles('vendor', 'ven_1', containerWith(graph))).resolves.toEqual(expect.arrayContaining(['acrl_computed', 'acrl_assigned']))
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
				authenticate: passThrough,
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
				authenticate: passThrough
			} as any)
		).toThrow(/supplied "authenticate" without "prefixes"/)
	})

	it('re-running the built-in registration path does not throw and does not clobber an existing registration', async () => {
		// This package can end up with two live copies of this module body
		// sharing one globalThis (src/ and .medusa/server/src/), and each
		// re-require re-runs the module body — which re-registers the
		// built-ins through the private set-if-absent path. That must stay a
		// silent no-op or HMR/two-realm re-evaluation crashes the app.
		expect(() => {
			jest.resetModules()
			require('../actor-resolvers')
		}).not.toThrow()

		const graph = graphByEntity([assignment('acrl_1', 'user', 'usr_1')])
		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual(['acrl_1'])
	})

	it("throws when a public registerActorResolver call targets the reserved 'user' actor type", () => {
		// `user` is already registered by the built-in at module import time,
		// before any test in this file runs.
		expect(() => registerActorResolver({ actorType: 'user', resolve: async () => ['acrl_override'] })).toThrow(/user/)
	})
})

describe('resolveActorHoldings', () => {
	it('returns scoped holdings with their tenancy pins', async () => {
		const graph = graphByEntity([assignment('acrl_mgr', 'user', 'usr_1', 'company', 'comp_acme')])

		await expect(resolveActorHoldings('user', 'usr_1', containerWith(graph))).resolves.toEqual([
			{ role_id: 'acrl_mgr', scope: { type: 'company', id: 'comp_acme' } }
		])
	})

	it('collapses a role held unscoped anywhere, subsuming its scoped holdings', async () => {
		const graph = graphByEntity([
			assignment('acrl_mgr', 'user', 'usr_1'),
			assignment('acrl_mgr', 'user', 'usr_1', 'company', 'comp_acme')
		])

		await expect(resolveActorHoldings('user', 'usr_1', containerWith(graph))).resolves.toEqual([{ role_id: 'acrl_mgr', scope: null }])
	})

	it('deduplicates identical scoped holdings and keeps distinct tenants', async () => {
		const graph = graphByEntity([
			assignment('acrl_mgr', 'user', 'usr_1', 'company', 'comp_acme'),
			assignment('acrl_mgr', 'user', 'usr_1', 'company', 'comp_acme'),
			assignment('acrl_mgr', 'user', 'usr_1', 'company', 'comp_beta')
		])

		await expect(resolveActorHoldings('user', 'usr_1', containerWith(graph))).resolves.toEqual([
			{ role_id: 'acrl_mgr', scope: { type: 'company', id: 'comp_acme' } },
			{ role_id: 'acrl_mgr', scope: { type: 'company', id: 'comp_beta' } }
		])
	})

	it('returns null for an unregistered actor type', async () => {
		await expect(resolveActorHoldings('nobody', 'x_1', containerWith(jest.fn()))).resolves.toBeNull()
	})
})

describe('customer actor resolution', () => {
	it('walks groups and matches group-held assignments', async () => {
		const graph = graphByEntity(
			[assignment('acrl_wholesale', 'customer_group', 'cusgrp_1'), assignment('acrl_vip', 'customer_group', 'cusgrp_2')],
			[{ groups: [{ id: 'cusgrp_1' }, { id: 'cusgrp_2' }] }]
		)

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_wholesale', 'acrl_vip'])
		expect(graph).toHaveBeenCalledWith({
			entity: 'customer',
			fields: ['groups.id'],
			filters: { id: 'cus_1' }
		})
		expect(graph).toHaveBeenCalledWith({
			entity: 'access_role_assignment',
			fields: ['role_id', 'grantee_type', 'grantee_id', 'scope_type', 'scope_id'],
			filters: { grantee_type: ['customer', 'customer_group'], grantee_id: ['cus_1', 'cusgrp_1', 'cusgrp_2'] }
		})
	})

	it('unions directly-held roles with group roles and deduplicates overlap', async () => {
		const graph = graphByEntity(
			[assignment('acrl_shared', 'customer', 'cus_1'), assignment('acrl_shared', 'customer_group', 'cusgrp_1')],
			[{ groups: [{ id: 'cusgrp_1' }] }]
		)

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_shared'])
	})

	it('returns an empty array for a customer in no groups with no direct assignments', async () => {
		const graph = graphByEntity([], [{ groups: [] }])

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual([])
	})

	it('tolerates a null entry inside the groups array', async () => {
		const graph = graphByEntity([assignment('acrl_group', 'customer_group', 'cusgrp_1')], [{ groups: [null, { id: 'cusgrp_1' }] }])

		await expect(resolveActorRoles('customer', 'cus_1', containerWith(graph))).resolves.toEqual(['acrl_group'])
	})

	it('tolerates a missing actor row — identity assignments still resolve', async () => {
		const graph = graphByEntity([assignment('acrl_direct', 'customer', 'cus_ghost')], [])

		await expect(resolveActorRoles('customer', 'cus_ghost', containerWith(graph))).resolves.toEqual(['acrl_direct'])
	})
})

describe('api-key actor resolution', () => {
	it("maps actor type 'api-key' to Query entity 'api_key' for the identity grantee", async () => {
		const graph = graphByEntity([assignment('acrl_1', 'api_key', 'apk_1'), assignment('acrl_2', 'api_key', 'apk_1')])

		await expect(resolveActorRoles('api-key', 'apk_1', containerWith(graph))).resolves.toEqual(['acrl_1', 'acrl_2'])
		expect(graph).toHaveBeenCalledWith(
			expect.objectContaining({
				entity: 'access_role_assignment',
				filters: { grantee_type: ['api_key'], grantee_id: ['apk_1'] }
			})
		)
	})
})

describe('registerGranteePath', () => {
	it('is additive on built-ins and idempotent on duplicates', async () => {
		registerGranteePath('user', { entity: 'team', path: 'teams.id' })
		registerGranteePath('user', { entity: 'team', path: 'teams.id' })

		const graph = graphByEntity([assignment('acrl_team', 'team', 'team_1')], [{ teams: [{ id: 'team_1' }] }])

		await expect(resolveActorRoles('user', 'usr_1', containerWith(graph))).resolves.toEqual(['acrl_team'])
		expect(graph).toHaveBeenCalledWith({
			entity: 'user',
			fields: ['teams.id'],
			filters: { id: 'usr_1' }
		})
	})

	it('throws on an incomplete grantee path', () => {
		expect(() => registerGranteePath('user', { entity: '', path: 'x.id' })).toThrow(/incomplete/)
	})

	it('accepts paths for actor types that are not registered yet', () => {
		expect(() => registerGranteePath('future-type', { entity: 'org', path: 'org.id' })).not.toThrow()
	})
})

describe('actor authentication registration', () => {
	it('accepts authenticate and prefixes together', () => {
		expect(() =>
			registerActorResolver({
				actorType: 'affiliate-auth',
				resolve: async () => [],
				authenticate: passThrough,
				prefixes: ['/affiliate']
			})
		).not.toThrow()
	})

	it('throws when authenticate is supplied without prefixes', () => {
		expect(() => registerActorResolver({ actorType: 'a1', resolve: async () => [], authenticate: passThrough } as any)).toThrow(/prefixes/i)
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
		// identity entity live with an authenticator that never validated.
		expect((global as any).AccessActorResolvers.has('mixed')).toBe(false)
		expect((global as any).AccessActorEntities.has('mixed')).toBe(false)
	})
})

describe('actor lookups bypass a scoped query', () => {
	it('resolves ACCESS_UNSCOPED_QUERY in preference to QUERY when registered', async () => {
		const unscopedGraph = graphByEntity([assignment('acrl_1', 'user', 'usr_1')])
		const scopedGraph = graphByEntity([])
		const container = {
			hasRegistration: (key: string) => key === 'access_unscoped_query',
			resolve: (key: string) => (key === 'access_unscoped_query' ? { graph: unscopedGraph } : { graph: scopedGraph })
		} as any

		await expect(resolveActorRoles('user', 'usr_1', container)).resolves.toEqual(['acrl_1'])
		expect(unscopedGraph).toHaveBeenCalled()
		expect(scopedGraph).not.toHaveBeenCalled()
	})
})
