import { canGrantScope, resolveActorRoles, resolvePermissions } from '../../../utils'
import { arrayDifference, ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 * @featureFlag access
 */
export type ValidateUserPermissionsStepInput = {
	actor_id: string
	actor?: string
	policies?: { policy_id: string; scope?: string }[]
	actions?: {
		resource: string
		operation: string
		scope?: string
	}[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const validateUserPermissionsStepId = 'validate-user-access-permissions'

/**
 * Validates that a user has access to all the policies they are trying to assign.
 * A user can only create roles and add policies that they themselves have access to,
 * and only at a scope no broader than the one they themselves hold -- see
 * `canGrantScope`. An unscoped assignment (`scope` undefined) requires the actor to
 * hold the policy unrestricted.
 * @ignore
 * @featureFlag access
 */
export const validateUserPermissionsStep = createStep(validateUserPermissionsStepId, async (data: ValidateUserPermissionsStepInput, { container }) => {
	const { actor_id, actor, policies, actions } = data

	if (!policies?.length && !actions?.length) {
		return
	}

	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	// Route through the resolver registry rather than querying `access_roles`
	// directly: a `customer` holds roles through customer groups as well as
	// directly, and `api-key`'s actor type (`api-key`) is not its Query entity
	// (`api_key`). A hand-rolled lookup gets both wrong.
	const roleIds = await resolveActorRoles(actor ?? 'user', actor_id, container)

	if (roleIds === null) {
		throw new MedusaError(MedusaError.Types.FORBIDDEN, `No role resolver is registered for actor type "${actor ?? 'user'}".`)
	}

	if (!roleIds.length) {
		throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Forbidden')
	}

	// Both may be supplied at once -- e.g. creating a role that both attaches
	// policies and inherits a parent. Every entry must pass, not just one group.
	const actionsToCheck: { resource: string; operation: string; scope?: string }[] = []

	if (policies?.length) {
		const policyIds = Array.from(new Set(policies.map(p => p.policy_id)))
		const { data: targetPolicies } = await query.graph({
			entity: 'access_policy',
			fields: ['id', 'resource', 'operation'],
			filters: { id: policyIds }
		})

		// A user cannot grant a policy that doesn't exist.
		const inexistentPolicies = arrayDifference(
			policyIds,
			targetPolicies.map(p => p.id)
		)
		if (inexistentPolicies.length) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `The following policies do not exist: ${inexistentPolicies.join(', ')}`)
		}

		const byId = new Map(targetPolicies.map(p => [p.id, p]))
		actionsToCheck.push(
			...policies.map(p => {
				const policy = byId.get(p.policy_id)!
				return { resource: policy.resource, operation: policy.operation, scope: p.scope }
			})
		)
	}

	if (actions?.length) {
		actionsToCheck.push(...actions)
	}

	const granted = await resolvePermissions({
		roles: roleIds,
		universe: actionsToCheck.map(a => ({ resource: a.resource, operation: a.operation })),
		container
	})

	// An actor may grant a policy at scope S only if they hold it unrestricted,
	// or hold it at exactly scope S -- see `canGrantScope`.
	const escalates = actionsToCheck.some(a => !canGrantScope(granted, a.resource, a.operation, a.scope))

	if (escalates) {
		throw new MedusaError(MedusaError.Types.FORBIDDEN, 'You do not have access to some of the policies you are trying to assign.')
	}
})
