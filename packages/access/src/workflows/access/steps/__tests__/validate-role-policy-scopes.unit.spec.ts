import { asValue, createContainer } from 'awilix'
import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { defineScope, hasScope } from '../../../../utils/scopes'
import { validateRolePolicyScopesStep } from '../validate-role-policy-scopes'

/**
 * The data-integrity half of role-policy assignment: it runs unconditionally,
 * independent of who the actor is, so a config mistake is refused with a clean
 * 400 rather than surfacing as a raw constraint violation or a grant that can
 * never be enforced.
 *
 * The integration suite covers the three refusals through HTTP. These cover the
 * branches it cannot reach cheaply — the unscoped short-circuit, an unknown
 * policy id being someone else's problem, and a mixed batch where only one entry
 * is bad — plus the shape of each message, since all three answer 400.
 *
 * A step cannot be called outside a workflow, so it runs inside a throwaway one
 * with a real container holding a stub query. No production code exists for this.
 */
const probeWorkflow = createWorkflow('access-test-validate-role-policy-scopes', (input: any) => new WorkflowResponse(validateRolePolicyScopesStep(input)))

type StubPolicy = { id: string; key: string; resource: string; operation: string }

const runStep = async (policies: { policy_id: string; scope?: string }[], known: StubPolicy[] = []) => {
	const graph = jest.fn(async () => ({ data: known }))
	const container: any = createContainer()
	container.register({ query: asValue({ graph }) })

	// try/catch, not `expect(...).rejects`: against the workflow engine's promise
	// the matcher does not observe the rejection and the assertion passes with the
	// step never having refused anything. See TESTING.md.
	let error: any
	try {
		await probeWorkflow(container).run({ input: { policies }, throwOnError: true })
	} catch (caught) {
		error = caught
	}
	return { graph, error }
}

describe('validateRolePolicyScopesStep', () => {
	beforeAll(() => {
		if (!hasScope('customer', 'vrps_company')) {
			defineScope({ name: 'vrps_company', resource: 'customer', filter: async () => ({ id: [] }) })
		}
	})

	const CUSTOMER_DELETE: StubPolicy = { id: 'acpol_1', key: 'customer:delete', resource: 'customer', operation: 'delete' }
	const WILDCARD_POLICY: StubPolicy = { id: 'acpol_star', key: '*:*', resource: '*', operation: '*' }

	it('rejects the same policy assigned twice in one request, naming it', async () => {
		// `access_role_policy`'s unique index is (role_id, policy_id) with no scope
		// column, so this can never be inserted. Catching it here is the difference
		// between a clean 400 and a raw DB constraint error.
		const { error } = await runStep([{ policy_id: 'acpol_1' }, { policy_id: 'acpol_1', scope: 'vrps_company' }])

		expect(error?.message).toMatch(/assigned more than once.*acpol_1/s)
		expect(error?.type).toBe('invalid_data')
	})

	it('does not query at all when nothing carries a scope', async () => {
		const { graph, error } = await runStep([{ policy_id: 'acpol_1' }, { policy_id: 'acpol_2' }])

		expect(error).toBeUndefined()
		// The common case is unscoped assignment; it must not cost a round trip.
		expect(graph).not.toHaveBeenCalled()
	})

	it('rejects a scope on a wildcard policy, naming the policy', async () => {
		// `defineScope` is keyed by (resource, name) and there is no `(*, name)`
		// entry to find, so such a grant could never be narrowed.
		const { error } = await runStep([{ policy_id: 'acpol_star', scope: 'vrps_company' }], [WILDCARD_POLICY])

		expect(error?.message).toMatch(/wildcard policy "\*:\*"/)
	})

	it('rejects a scope with no defineScope registration for that resource, naming both', async () => {
		const { error } = await runStep([{ policy_id: 'acpol_1', scope: 'never_registered' }], [CUSTOMER_DELETE])

		expect(error?.message).toMatch(/No scope "never_registered" is registered for resource "customer"/)
	})

	it('accepts a scope registered for exactly that resource', async () => {
		const { error } = await runStep([{ policy_id: 'acpol_1', scope: 'vrps_company' }], [CUSTOMER_DELETE])

		expect(error).toBeUndefined()
	})

	it('leaves an unknown policy id to the step that owns that check', async () => {
		// Reporting it here too would produce two different errors for one mistake,
		// and this step cannot say whether the id is unknown or merely unreadable.
		const { error } = await runStep([{ policy_id: 'acpol_ghost', scope: 'vrps_company' }], [])

		expect(error).toBeUndefined()
	})

	it('refuses a batch for one bad entry, even when the others are fine', async () => {
		const { error } = await runStep(
			[
				{ policy_id: 'acpol_1', scope: 'vrps_company' },
				{ policy_id: 'acpol_star', scope: 'vrps_company' }
			],
			[CUSTOMER_DELETE, WILDCARD_POLICY]
		)

		expect(error?.message).toMatch(/wildcard policy/)
	})
})
