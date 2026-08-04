import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 */
export type ValidateRolePolicyExistsStepInput = {
	role_id: string
	policy_id: string
}

/**
 * @ignore
 */
export const validateRolePolicyExistsStepId = 'validate-role-policy-exists'

/**
 * Confirms the grant being re-scoped exists before anything tries to update it.
 *
 * Without this the update runs against a selector matching nothing, writes no
 * rows, and reports success — so an operator narrowing `customer:delete` to
 * `customer:delete@company` on a role that never held `customer:delete` is told
 * the tightening applied when it did not. A permissions change that silently
 * does nothing while reporting 200 is worth one query to prevent.
 *
 * `validateUserPermissionsStep` already rejects a `policy_id` that is not a
 * policy at all; the case left is a real policy on a real role that simply does
 * not hold it.
 *
 * Lives here rather than inside `updateAccessRolePoliciesStep` because that step
 * takes a generic `{ selector, update }` and has to stay usable by a future
 * caller whose selector legitimately matches nothing.
 *
 * @ignore
 */
export const validateRolePolicyExistsStep = createStep(
	validateRolePolicyExistsStepId,
	async (data: ValidateRolePolicyExistsStepInput, { container }) => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const { data: existing } = await query.graph({
			entity: 'access_role_policy',
			fields: ['id'],
			filters: { role_id: data.role_id, policy_id: data.policy_id }
		})

		if (!existing.length) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `Role "${data.role_id}" holds no grant for policy "${data.policy_id}" — there is nothing to re-scope.`)
		}
	}
)
