import { asValue, createContainer } from 'awilix'
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { resolveInheritedActionsStep } from '../resolve-inherited-actions'

/**
 * The escalation check behind attaching a PARENT role: the actor must already
 * hold everything that parent's whole chain confers. This step produces the
 * "everything", so a gap here is a privilege escalation that reads as an
 * ordinary successful request.
 *
 * `listPoliciesForRole` already walks the recursive CTE upward, so the step's own
 * job is narrow — dedupe across roles, preserve the scope distinction — and
 * neither is visible in an HTTP response. The integration suite proves the
 * escalation is refused; these prove the set it is refused against is right.
 *
 * A step cannot be called outside a workflow, so it runs inside a throwaway one
 * with a real container holding a stub service. No production code exists for
 * these tests.
 */
const probeWorkflow = createWorkflow('access-test-resolve-inherited-actions', (input: any) => new WorkflowResponse(resolveInheritedActionsStep(input)))

type StubPolicy = { resource: string; operation: string; scope?: string | null }

const runStep = async (roleIds: string[], policiesByRole: Record<string, StubPolicy[]>) => {
	const listPoliciesForRole = jest.fn(async (roleId: string) => policiesByRole[roleId] ?? [])
	const container: any = createContainer()
	container.register({ access: asValue({ listPoliciesForRole }) })

	const { result } = await probeWorkflow(container).run({ input: { role_ids: roleIds }, throwOnError: true })

	return { actions: result as StubPolicy[], listPoliciesForRole }
}

describe('resolveInheritedActionsStep', () => {
	it('returns nothing, and asks the service nothing, for an empty role list', async () => {
		const { actions, listPoliciesForRole } = await runStep([], {})

		expect(actions).toEqual([])
		expect(listPoliciesForRole).not.toHaveBeenCalled()
	})

	it('ignores duplicate and falsy role ids rather than querying for them', async () => {
		const { listPoliciesForRole } = await runStep(['acrl_1', 'acrl_1', '', undefined as any], {
			acrl_1: [{ resource: 'customer', operation: 'read' }]
		})

		expect(listPoliciesForRole).toHaveBeenCalledTimes(1)
		expect(listPoliciesForRole).toHaveBeenCalledWith('acrl_1')
	})

	it('unions the policies of several roles, deduplicated', async () => {
		const { actions } = await runStep(['acrl_1', 'acrl_2'], {
			acrl_1: [
				{ resource: 'customer', operation: 'read' },
				{ resource: 'customer', operation: 'delete' }
			],
			acrl_2: [
				{ resource: 'customer', operation: 'read' },
				{ resource: 'product', operation: 'read' }
			]
		})

		expect(actions).toEqual([
			{ resource: 'customer', operation: 'read' },
			{ resource: 'customer', operation: 'delete' },
			{ resource: 'product', operation: 'read' }
		])
	})

	it('keeps the same action at two different scopes as two actions', async () => {
		const { actions } = await runStep(['acrl_own', 'acrl_company'], {
			acrl_own: [{ resource: 'customer', operation: 'delete', scope: 'own' }],
			acrl_company: [{ resource: 'customer', operation: 'delete', scope: 'company' }]
		})

		// Collapsing these would let an actor holding only `@own` attach a parent
		// conferring `@company`: the check would find its own `@own` entry and call
		// the requirement satisfied. Two named scopes are incomparable.
		expect(actions).toHaveLength(2)
		expect(actions).toEqual(
			expect.arrayContaining([
				{ resource: 'customer', operation: 'delete', scope: 'own' },
				{ resource: 'customer', operation: 'delete', scope: 'company' }
			])
		)
	})

	it('keeps an unrestricted grant distinct from a scoped one for the same action', async () => {
		const { actions } = await runStep(['acrl_free', 'acrl_own'], {
			acrl_free: [{ resource: 'customer', operation: 'delete', scope: null }],
			acrl_own: [{ resource: 'customer', operation: 'delete', scope: 'own' }]
		})

		expect(actions).toHaveLength(2)
		// `null` becomes an absent `scope` — the shape `canGrantScope` reads as
		// unrestricted, which is strictly broader than any named scope.
		expect(actions).toEqual(
			expect.arrayContaining([{ resource: 'customer', operation: 'delete' }, { resource: 'customer', operation: 'delete', scope: 'own' }])
		)
	})
})
