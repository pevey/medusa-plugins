import { authorize, hasPermission } from '../has-permission'

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

		expect(decision).toEqual({ granted: true, scopes: [{ resource: 'customer', scope: 'company' }] })
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

		expect(decision.granted).toBe(true)
		expect((decision as any).scopes).toEqual(
			expect.arrayContaining([
				{ resource: 'customer', scope: 'own' },
				{ resource: 'customer', scope: 'company' }
			])
		)
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

		expect(decision.granted).toBe(false)
		if (!decision.granted) {
			expect(decision.missing).toEqual([{ resource: 'customer', operation: 'delete' }])
		}
	})

	it('ignores a resource-wildcard (customer:*) grant that carries a stored scope', async () => {
		const decision = await authorize({
			roles: 'acrl_7',
			actions: { resource: 'customer', operation: 'delete' },
			container: containerFor({ acrl_7: [{ resource: 'customer', operation: '*', scope: 'company' }] })
		})

		expect(decision.granted).toBe(false)
		if (!decision.granted) {
			expect(decision.missing).toEqual([{ resource: 'customer', operation: 'delete' }])
		}
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
