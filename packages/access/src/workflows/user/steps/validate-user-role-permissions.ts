import { canGrantScope, resolveGrantablePermissions } from '../../../utils'
import { MedusaContainer } from '@medusajs/framework/types'
import { arrayDifference, ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 */
export type ValidateUserRolePermissionsStepInput = {
	actor_id: string
	actor?: string
	role_ids: string[]
	/**
	 * The tenancy scope of the assignment being created, when there is one.
	 * Widens the granter evaluation to holdings pinned to exactly this tenant
	 * (coverage-limited); absent means an unscoped assignment, which only
	 * unscoped holdings may authorize.
	 */
	scope_type?: string
	scope_id?: string
}

/**
 * The core of the anti-escalation rule, shared by the user-shaped and the
 * generic assignment workflows: every policy on every target role must be
 * grantable from the actor's own permission set — evaluated under the
 * assignment's tenancy scope per `resolveGrantablePermissions` — or the actor
 * escalates in one hop.
 */
export async function assertCanGrantRoles(
	container: MedusaContainer,
	input: { actorType: string; actorId: string; roleIds: string[]; scope?: { type: string; id: string } }
): Promise<void> {
	if (!input.roleIds.length) {
		return
	}

	const query = container.resolve(ContainerRegistrationKeys.QUERY)
	const uniqueRoleIds = [...new Set(input.roleIds)]

	const { data: targetRoles } = await query.graph({
		entity: 'access_role',
		fields: ['id', 'policies.resource', 'policies.operation', 'policies.scope'],
		filters: { id: uniqueRoleIds }
	})

	// A role narrowed away by a scoped actor's own query (or one that never
	// existed) must fail closed, not silently skip the anti-escalation check
	// below by falling through with an empty/partial `actionsToCheck` -- see
	// `validateUserPermissionsStep` for the sibling pattern.
	if (targetRoles.length !== uniqueRoleIds.length) {
		const missingRoleIds = arrayDifference(
			uniqueRoleIds,
			targetRoles.map((role: any) => role.id)
		)
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `The following roles do not exist: ${missingRoleIds.join(', ')}`)
	}

	const actionsToCheck: { resource: string; operation: string; scope?: string }[] = []
	for (const role of targetRoles) {
		for (const policy of role.policies ?? []) {
			actionsToCheck.push({
				resource: policy.resource,
				operation: policy.operation,
				scope: policy.scope ?? undefined
			})
		}
	}

	if (!actionsToCheck.length) {
		return
	}

	// Route through the resolver registry rather than querying assignments
	// directly: a `customer` holds roles through customer groups as well as
	// directly, and `api-key`'s actor type is not its Query entity name.
	const granted = await resolveGrantablePermissions({
		actorType: input.actorType,
		actorId: input.actorId,
		universe: actionsToCheck.map(action => ({ resource: action.resource, operation: action.operation })),
		scope: input.scope,
		container
	})

	if (granted === null) {
		throw new MedusaError(MedusaError.Types.FORBIDDEN, `No role resolver is registered for actor type "${input.actorType}".`)
	}

	// An actor may grant a policy at scope S only if they hold it unrestricted,
	// or hold it at exactly scope S -- see `canGrantScope`. Every policy on
	// every target role must clear this, or the actor escalates in one hop.
	const escalates = actionsToCheck.some(action => !canGrantScope(granted, action.resource, action.operation, action.scope))

	if (escalates) {
		throw new MedusaError(MedusaError.Types.FORBIDDEN, 'You do not have permission to assign these roles')
	}
}

/**
 * @ignore
 */
export const validateUserRolePermissionsStepId = 'validate-user-access-role-permissions'

/**
 * Validates that the actor has all the policies from the roles being assigned.
 * A user can only assign roles whose policies they themselves have.
 * @ignore
 */
export const validateUserRolePermissionsStep = createStep(
	validateUserRolePermissionsStepId,
	async (data: ValidateUserRolePermissionsStepInput, { container }) => {
		const { actor_id, actor, role_ids, scope_type, scope_id } = data

		if (!role_ids?.length) {
			return new StepResponse(void 0)
		}

		await assertCanGrantRoles(container, {
			actorType: actor ?? 'user',
			actorId: actor_id,
			roleIds: role_ids,
			scope: scope_type && scope_id ? { type: scope_type, id: scope_id } : undefined
		})

		return new StepResponse(void 0)
	}
)
