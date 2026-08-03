import { canGrantScope, resolveActorRoles, resolvePermissions } from '../../../utils'
import { arrayDifference, ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 */
export type ValidateUserRolePermissionsStepInput = {
	actor_id: string
	actor?: string
	role_ids: string[]
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
		const { actor_id, actor, role_ids } = data

		if (!role_ids?.length) {
			return new StepResponse(void 0)
		}

		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const uniqueRoleIds = [...new Set(role_ids)]

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
			return new StepResponse(void 0)
		}

		// Route through the resolver registry rather than querying `access_roles`
		// directly: a `customer` holds roles through customer groups as well as
		// directly, and `api-key`'s actor type is not its Query entity name.
		const actorRoleIds = await resolveActorRoles(actor ?? 'user', actor_id, container)

		if (actorRoleIds === null) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, `No role resolver is registered for actor type "${actor ?? 'user'}".`)
		}

		if (!actorRoleIds.length) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'You do not have permission to assign these roles')
		}

		const granted = await resolvePermissions({
			roles: actorRoleIds,
			universe: actionsToCheck.map(a => ({ resource: a.resource, operation: a.operation })),
			container
		})

		// An actor may grant a policy at scope S only if they hold it unrestricted,
		// or hold it at exactly scope S -- see `canGrantScope`. Every policy on
		// every target role must clear this, or the actor escalates in one hop.
		const escalates = actionsToCheck.some(a => !canGrantScope(granted, a.resource, a.operation, a.scope))

		if (escalates) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'You do not have permission to assign these roles')
		}

		return new StepResponse(void 0)
	}
)
