import { MedusaError, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 * @featureFlag access
 */
export const validateRolesExistStepId = 'validate-access-roles-exist-step'

/**
 * This step validates that the provided role IDs exist in the RBAC module.
 * Throws an error if any role is not found.
 *
 * @example
 * validateRolesExistStep(["role_123", "role_456"])
 * @ignore
 * @featureFlag access
 */
export const validateRolesExistStep = createStep(validateRolesExistStepId, async (roleIds: string[], { container }) => {
	if (!roleIds.length) {
		return new StepResponse(undefined)
	}

	const accessService: any = container.resolve('access')
	const existingRoles = await accessService.listAccessRoles({
		id: roleIds
	})

	const existingRoleIds = new Set(existingRoles.map((r: any) => r.id))
	const missingRoles = roleIds.filter(id => !existingRoleIds.has(id))

	if (missingRoles.length) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `The following role IDs do not exist: ${missingRoles.join(', ')}`)
	}

	return new StepResponse(undefined)
})
