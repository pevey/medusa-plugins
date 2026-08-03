import { hasScope } from '../../../utils/scopes'
import { WILDCARD } from '../../../utils/define-policies'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 */
export type ValidateRolePolicyScopesStepInput = {
	policies: { policy_id: string; scope?: string }[]
}

/**
 * @ignore
 */
export const validateRolePolicyScopesStepId = 'validate-role-policy-scopes'

/**
 * Validates that a `scope` requested on a role-policy assignment can ever
 * resolve: not on a wildcard policy (which `defineScope` has no `(*, name)`
 * entry for) and only for a scope name actually registered via `defineScope`
 * for that policy's resource. Also rejects the same `policy_id` appearing
 * more than once in one request (regardless of scope) -- `access_role_policy`'s
 * unique index is `(role_id, policy_id)` with no `scope` column, so two
 * entries for the same policy (whether same scope, different scopes, or one
 * scoped/one not) can never both be inserted; without this check that
 * surfaces as a raw DB constraint violation instead of a clean 400. To change
 * an existing assignment's scope, re-scope it in place via
 * `POST /admin/access/roles/:id/policies/:policy_id` rather than assigning the
 * same policy twice here.
 *
 * Runs unconditionally -- independent of who the actor is -- because this is
 * a data-integrity check, not an authorization check; skipping it whenever no
 * actor is supplied would let a config error through unnoticed until it 403s
 * (or 500s) a real request at 3am.
 * @ignore
 */
export const validateRolePolicyScopesStep = createStep(validateRolePolicyScopesStepId, async (data: ValidateRolePolicyScopesStepInput, { container }) => {
	const policies = data.policies ?? []

	const seen = new Set<string>()
	const duplicated = new Set<string>()
	for (const { policy_id } of policies) {
		if (seen.has(policy_id)) {
			duplicated.add(policy_id)
		}
		seen.add(policy_id)
	}
	if (duplicated.size) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`The following policies were assigned more than once in the same request: ${Array.from(duplicated).join(', ')}`
		)
	}

	const scoped = policies.filter(p => !!p.scope)

	if (!scoped.length) {
		return
	}

	const query = container.resolve(ContainerRegistrationKeys.QUERY)
	const policyIds = Array.from(new Set(scoped.map(p => p.policy_id)))

	const { data: targetPolicies } = await query.graph({
		entity: 'access_policy',
		fields: ['id', 'key', 'resource', 'operation'],
		filters: { id: policyIds }
	})

	const byId = new Map(targetPolicies.map(p => [p.id, p]))

	for (const { policy_id, scope } of scoped) {
		const policy = byId.get(policy_id)
		// A nonexistent policy id is reported by validateUserPermissionsStep (or
		// the FK constraint if that step is skipped) -- not this step's concern.
		if (!policy) {
			continue
		}

		if (policy.resource === WILDCARD || policy.operation === WILDCARD) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Cannot assign a scope to wildcard policy "${policy.key}"`)
		}

		if (!hasScope(policy.resource, scope!)) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No scope "${scope}" is registered for resource "${policy.resource}" (policy "${policy.key}")`)
		}
	}
})
