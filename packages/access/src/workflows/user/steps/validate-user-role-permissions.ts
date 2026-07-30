import { hasPermission } from '../../../utils'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 * @featureFlag access
 */
export type ValidateUserRolePermissionsStepInput = {
	actor_id: string
	actor?: string
	role_ids: string[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const validateUserRolePermissionsStepId = 'validate-user-access-role-permissions'

/**
 * Validates that the actor has all the policies from the roles being assigned.
 * A user can only assign roles whose policies they themselves have.
 * @ignore
 * @featureFlag access
 */
export const validateUserRolePermissionsStep = createStep(
	validateUserRolePermissionsStepId,
	async (data: ValidateUserRolePermissionsStepInput, { container }) => {
		const { actor_id, actor, role_ids } = data

		if (!role_ids?.length) {
			return new StepResponse(void 0)
		}

		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const { data: targetRoles } = await query.graph({
			entity: 'access_role',
			fields: ['id', 'policies.resource', 'policies.operation'],
			filters: { id: role_ids }
		})

		const actionsToCheck: { resource: string; operation: string }[] = []
		for (const role of targetRoles) {
			for (const policy of role.policies ?? []) {
				actionsToCheck.push({
					resource: policy.resource,
					operation: policy.operation
				})
			}
		}

		if (!actionsToCheck.length) {
			return new StepResponse(void 0)
		}

		const { data: actors } = await query.graph({
			entity: actor ?? 'user',
			fields: ['access_roles.id'],
			filters: { id: actor_id }
		})

		const actorRoleIds: string[] = actors?.[0]?.access_roles?.map((r: any) => r.id).filter(Boolean) ?? []

		if (!actorRoleIds.length) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'You do not have permission to assign these roles')
		}

		const allowed = await hasPermission({
			roles: actorRoleIds,
			actions: actionsToCheck,
			container
		})

		if (!allowed) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'You do not have permission to assign these roles')
		}

		return new StepResponse(void 0)
	}
)
