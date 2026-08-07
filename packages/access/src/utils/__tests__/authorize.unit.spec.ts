/// <reference types="jest" />
import { authorize, hasPermission, resolvePermissions } from '../has-permission'
import type { AccessDecision } from '../has-permission'
import { defineTenancy } from '../tenancy'

// `AccessDecision` is a discriminated union, so `missing` and `scopes` are only reachable after
// narrowing. These assert the branch *and* narrow to it: the `expect` throws when the decision is the
// other branch, so a wrong-branch result fails here with a readable diff, and everything after the
// call is typed as the claimed branch. Prefer these over `if (decision.granted) { ... }`, which
// silently skips the assertions it wraps, and over `(decision as any).scopes`, which asserts nothing.
function assertDenied(decision: AccessDecision): asserts decision is Extract<AccessDecision, { granted: false }> {
	expect(decision.granted).toBe(false)
}

function assertGranted(decision: AccessDecision): asserts decision is Extract<AccessDecision, { granted: true }> {
	expect(decision.granted).toBe(true)
}

// Each role resolves to policies; `scope` is null for an unrestricted grant.
const containerFor = (policies: Record<string, { resource: string; operation: string; scope: string | null }[]>) =>
	({
		resolve: () => ({
			graph: async ({ filters }: any) => ({
				data: [{ id: filters.id, policies: policies[filters.id] ?? [] }]
			})
		})
	}) as any

const UNRESTRICTED = { acrl_1: [{ resource: 'customer', operation: 'delete', scope: null }] }
const SCOPED = { acrl_2: [{ resource: 'customer', operation: 'delete', scope: 'company' }] }

describe('authorize', () => {
	it('grants with no scopes for an unrestricted grant', async () => {
		const decision = await authorize({
			roles: 'acrl_1',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor(UNRESTRICTED)
		})

		expect(decision).toEqual({ granted: true, scopes: [] })
	})

	it('grants and reports the scope for a scoped grant', async () => {
		const decision = await authorize({
			roles: 'acrl_2',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor(SCOPED)
		})

		expect(decision).toEqual({ granted: true, scopes: [{ resource: 'customer', alternatives: [{ scope: 'company' }] }] })
	})

	it('reports the unsatisfied action when denied', async () => {
		const decision = await authorize({
			roles: 'acrl_1',
			actions: { resource: 'order', operation: 'delete' },
			container: containerFor(UNRESTRICTED)
		})

		expect(decision).toEqual({ granted: false, missing: [{ resource: 'order', operation: 'delete' }] })
	})

	it('prefers the unrestricted grant when a role holds both', async () => {
		const decision = await authorize({
			roles: 'acrl_3',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor({
				acrl_3: [
					{ resource: 'customer', operation: 'delete', scope: 'company' },
					{ resource: 'customer', operation: 'delete', scope: null }
				]
			})
		})

		expect(decision).toEqual({ granted: true, scopes: [] })
	})

	it('unions scopes when a role holds two scoped grants for the same action', async () => {
		const decision = await authorize({
			roles: 'acrl_4',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor({
				acrl_4: [
					{ resource: 'customer', operation: 'delete', scope: 'own' },
					{ resource: 'customer', operation: 'delete', scope: 'company' }
				]
			})
		})

		assertGranted(decision)
		expect(decision.scopes).toEqual([{ resource: 'customer', alternatives: expect.arrayContaining([{ scope: 'own' }, { scope: 'company' }]) }])
	})

	it('denies when no roles are held', async () => {
		const decision = await authorize({ roles: [], actions: { resource: 'customer', operation: 'delete' }, container: containerFor({}) })

		expect(decision.granted).toBe(false)
	})

	it('a *:* grant with a null scope is unrestricted for a concrete action', async () => {
		const decision = await authorize({
			roles: 'acrl_5',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor({ acrl_5: [{ resource: '*', operation: '*', scope: null }] })
		})

		expect(decision).toEqual({ granted: true, scopes: [] })
	})

	// Rule 3: a scope is rejected at assignment time onto a wildcard grant (Task
	// 7), but if one is somehow stored anyway, authorize must ignore the grant
	// entirely rather than treat it as unrestricted -- a stored value we refuse
	// to create must never widen access.
	it('ignores a *:* grant that carries a stored scope -- it is not unrestricted and denies as if absent', async () => {
		const decision = await authorize({
			roles: 'acrl_6',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor({ acrl_6: [{ resource: '*', operation: '*', scope: 'company' }] })
		})

		assertDenied(decision)
		expect(decision.missing).toEqual([{ resource: 'customer', operation: 'delete' }])
	})

	it('ignores a resource-wildcard (customer:*) grant that carries a stored scope', async () => {
		const decision = await authorize({
			roles: 'acrl_7',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor({ acrl_7: [{ resource: 'customer', operation: '*', scope: 'company' }] })
		})

		assertDenied(decision)
		expect(decision.missing).toEqual([{ resource: 'customer', operation: 'delete' }])
	})
})

describe('hasPermission is strict', () => {
	it('is true for an unrestricted grant', async () => {
		await expect(
			hasPermission({ roles: 'acrl_1', actions: { resource: 'customer', operation: 'delete' }, container: containerFor(UNRESTRICTED) })
		).resolves.toBe(true)
	})

	it('is FALSE for a scoped grant, because the caller cannot apply the filter', async () => {
		await expect(hasPermission({ roles: 'acrl_2', actions: { resource: 'customer', operation: 'delete' }, container: containerFor(SCOPED) })).resolves.toBe(
			false
		)
	})
})

describe('permission lookups bypass a scoped query', () => {
	it('resolves ACCESS_UNSCOPED_QUERY in preference to QUERY when registered', async () => {
		const unscopedGraph = jest.fn().mockResolvedValue({ data: [{ id: 'acrl_1', policies: [{ resource: 'customer', operation: 'delete', scope: null }] }] })
		const scopedGraph = jest.fn().mockResolvedValue({ data: [{ id: 'acrl_1', policies: [] }] })
		const container = {
			hasRegistration: (key: string) => key === 'access_unscoped_query',
			resolve: (key: string) => (key === 'access_unscoped_query' ? { graph: unscopedGraph } : { graph: scopedGraph })
		} as any

		await expect(hasPermission({ roles: 'acrl_1', actions: { resource: 'customer', operation: 'delete' }, container })).resolves.toBe(true)
		expect(unscopedGraph).toHaveBeenCalled()
		expect(scopedGraph).not.toHaveBeenCalled()
	})
})

describe('authorize across multiple operations', () => {
	// A route declaring `product:[create,update]` requires BOTH — matching how core
	// writes its own batch declarations, and denying more is the safe direction.
	const CREATE_ONLY = { acrl_c: [{ resource: 'product', operation: 'create', scope: null }] }
	const BOTH = {
		acrl_b: [
			{ resource: 'product', operation: 'create', scope: null },
			{ resource: 'product', operation: 'update', scope: null }
		]
	}

	it('denies when only one of the listed operations is held', async () => {
		const decision = await authorize({
			roles: 'acrl_c',
			actions: { resource: 'product', operation: ['create', 'update'] },
			container: containerFor(CREATE_ONLY)
		})

		assertDenied(decision)
		expect(decision.missing).toEqual([{ resource: 'product', operation: ['create', 'update'] }])
	})

	it('grants when every listed operation is held', async () => {
		const decision = await authorize({
			roles: 'acrl_b',
			actions: { resource: 'product', operation: ['create', 'update'] },
			container: containerFor(BOTH)
		})

		expect(decision).toEqual({ granted: true, scopes: [] })
	})

	it('reports the scopes of every listed operation, not just the first', async () => {
		const decision = await authorize({
			roles: 'acrl_s',
			actions: { resource: 'product', operation: ['create', 'update'] },
			container: containerFor({
				acrl_s: [
					{ resource: 'product', operation: 'create', scope: 'own' },
					{ resource: 'product', operation: 'update', scope: 'team' }
				]
			})
		})

		assertGranted(decision)
		// Alternatives from both operations union into ONE requirement per
		// resource — the guard's multi-operation check denies this shape anyway.
		expect(decision.scopes).toHaveLength(1)
		expect(decision.scopes[0].resource).toBe('product')
		expect(decision.scopes[0].alternatives).toEqual(expect.arrayContaining([{ scope: 'own' }, { scope: 'team' }]))
	})
})

describe('authorize over tenancy-scoped holdings', () => {
	beforeAll(() => {
		defineTenancy({
			type: 'test_channel',
			resources: { order: ids => ({ sales_channel_id: ids }) }
		})
	})

	const ORDER_READ = { acrl_ops: [{ resource: 'order', operation: 'read', scope: null }] }

	it('narrows a covered resource to the holding tenant', async () => {
		const decision = await authorize({
			holdings: [{ role_id: 'acrl_ops', scope: { type: 'test_channel', id: 'sc_web' } }],
			actions: { resource: 'order', operation: 'read' },
			container: containerFor(ORDER_READ)
		})

		expect(decision).toEqual({
			granted: true,
			scopes: [{ resource: 'order', alternatives: [{ tenancy: { type: 'test_channel', ids: ['sc_web'] } }] }]
		})
	})

	it('unions tenant ids across two scoped assignments of the same role', async () => {
		const decision = await authorize({
			holdings: [
				{ role_id: 'acrl_ops', scope: { type: 'test_channel', id: 'sc_web' } },
				{ role_id: 'acrl_ops', scope: { type: 'test_channel', id: 'sc_retail' } }
			],
			actions: { resource: 'order', operation: 'read' },
			container: containerFor(ORDER_READ)
		})

		expect(decision).toEqual({
			granted: true,
			scopes: [{ resource: 'order', alternatives: [{ tenancy: { type: 'test_channel', ids: ['sc_retail', 'sc_web'] } }] }]
		})
	})

	it('an unscoped holding of the same role subsumes the scoped one', async () => {
		const decision = await authorize({
			holdings: [
				{ role_id: 'acrl_ops', scope: { type: 'test_channel', id: 'sc_web' } },
				{ role_id: 'acrl_ops', scope: null }
			],
			actions: { resource: 'order', operation: 'read' },
			container: containerFor(ORDER_READ)
		})

		expect(decision).toEqual({ granted: true, scopes: [] })
	})

	it('a scoped holding contributes NOTHING for a resource outside the coverage set', async () => {
		const decision = await authorize({
			holdings: [{ role_id: 'acrl_wide', scope: { type: 'test_channel', id: 'sc_web' } }],
			actions: { resource: 'product', operation: 'read' },
			container: containerFor({ acrl_wide: [{ resource: 'product', operation: 'read', scope: null }] })
		})

		assertDenied(decision)
		expect(decision.missing).toEqual([{ resource: 'product', operation: 'read' }])
	})

	it('another unscoped holding fills the gap for an uncovered resource — the additive escape', async () => {
		const decision = await authorize({
			holdings: [
				{ role_id: 'acrl_wide', scope: { type: 'test_channel', id: 'sc_web' } },
				{ role_id: 'acrl_base', scope: null }
			],
			actions: { resource: 'product', operation: 'read' },
			container: containerFor({
				acrl_wide: [{ resource: 'product', operation: 'read', scope: null }],
				acrl_base: [{ resource: 'product', operation: 'read', scope: null }]
			})
		})

		expect(decision).toEqual({ granted: true, scopes: [] })
	})

	it('an actor-relative grant on a scoped holding composes both narrowings into one alternative', async () => {
		const decision = await authorize({
			holdings: [{ role_id: 'acrl_own_ops', scope: { type: 'test_channel', id: 'sc_web' } }],
			actions: { resource: 'order', operation: 'read' },
			container: containerFor({ acrl_own_ops: [{ resource: 'order', operation: 'read', scope: 'own' }] })
		})

		expect(decision).toEqual({
			granted: true,
			scopes: [{ resource: 'order', alternatives: [{ scope: 'own', tenancy: { type: 'test_channel', ids: ['sc_web'] } }] }]
		})
	})

	it('a wildcard grant on a scoped holding is tenancy-narrowed for covered resources, not unrestricted', async () => {
		const decision = await authorize({
			holdings: [{ role_id: 'acrl_super', scope: { type: 'test_channel', id: 'sc_web' } }],
			actions: { resource: 'order', operation: 'read' },
			container: containerFor({ acrl_super: [{ resource: '*', operation: '*', scope: null }] })
		})

		expect(decision).toEqual({
			granted: true,
			scopes: [{ resource: 'order', alternatives: [{ tenancy: { type: 'test_channel', ids: ['sc_web'] } }] }]
		})
	})
})

// Powers `/admin/access/me/permissions` and both assignable endpoints, and
// `canGrantScope` -- which is thoroughly tested -- consumes its output. It had no
// tests of its own.
describe('resolvePermissions', () => {
	const UNIVERSE = [
		{ resource: 'customer', operation: 'read' },
		{ resource: 'customer', operation: 'delete' },
		{ resource: 'product', operation: 'read' }
	]

	it('returns only the subset of the universe the roles grant', async () => {
		const granted = await resolvePermissions({
			roles: 'acrl_1',
			universe: UNIVERSE,
			container: containerFor({ acrl_1: [{ resource: 'customer', operation: 'read', scope: null }] })
		})

		expect(granted).toEqual([{ resource: 'customer', operation: 'read' }])
	})

	it('annotates a scoped grant with its scope, and leaves an unrestricted one bare', async () => {
		const granted = await resolvePermissions({
			roles: 'acrl_mixed',
			universe: UNIVERSE,
			container: containerFor({
				acrl_mixed: [
					{ resource: 'customer', operation: 'read', scope: null },
					{ resource: 'customer', operation: 'delete', scope: 'company' }
				]
			})
		})

		// The distinction `canGrantScope` acts on: no `scope` key means unrestricted,
		// which is strictly broader than any named scope.
		expect(granted).toEqual([
			{ resource: 'customer', operation: 'read' },
			{ resource: 'customer', operation: 'delete', scope: 'company' }
		])
	})

	it('expands a wildcard grant across the whole universe', async () => {
		const granted = await resolvePermissions({
			roles: 'acrl_super',
			universe: UNIVERSE,
			container: containerFor({ acrl_super: [{ resource: '*', operation: '*', scope: null }] })
		})

		expect(granted).toEqual(UNIVERSE)
	})

	it('reports one entry per scope when two roles grant the same action at different scopes', async () => {
		const granted = await resolvePermissions({
			roles: ['acrl_own', 'acrl_company'],
			universe: [{ resource: 'customer', operation: 'delete' }],
			container: containerFor({
				acrl_own: [{ resource: 'customer', operation: 'delete', scope: 'own' }],
				acrl_company: [{ resource: 'customer', operation: 'delete', scope: 'company' }]
			})
		})

		// Not "first match wins": both are real grants and both have to reach
		// `canGrantScope`, or an actor loses the ability to grant at one of them.
		expect(granted).toHaveLength(2)
		expect(granted).toEqual(
			expect.arrayContaining([
				{ resource: 'customer', operation: 'delete', scope: 'own' },
				{ resource: 'customer', operation: 'delete', scope: 'company' }
			])
		)
	})

	it('lets an unrestricted grant win over a scoped one for the same action', async () => {
		const granted = await resolvePermissions({
			roles: ['acrl_own', 'acrl_free'],
			universe: [{ resource: 'customer', operation: 'delete' }],
			container: containerFor({
				acrl_own: [{ resource: 'customer', operation: 'delete', scope: 'own' }],
				acrl_free: [{ resource: 'customer', operation: 'delete', scope: null }]
			})
		})

		expect(granted).toEqual([{ resource: 'customer', operation: 'delete' }])
	})

	it('returns nothing for an actor with no roles, rather than the whole universe', async () => {
		const granted = await resolvePermissions({ roles: [], universe: UNIVERSE, container: containerFor({}) })

		expect(granted).toEqual([])
	})
})
