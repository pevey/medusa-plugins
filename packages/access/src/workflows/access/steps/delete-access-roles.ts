import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 * @featureFlag access
 */
export type DeleteAccessRolesStepInput = string[]

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessRolesStepId = 'delete-access-roles'

/**
 * This step deletes one or more RBAC roles.
 * @param ids - The IDs of the roles to delete
 * @param container - The workflow container
 * @returns A step response with the deleted role IDs
 * @ignore
 * @featureFlag access
 */
export const deleteAccessRolesStep = createStep(
	deleteAccessRolesStepId,
	async (ids: DeleteAccessRolesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!ids?.length) {
			return new StepResponse([] as any, [])
		}

		const deleted = await service.deleteAccessRoles(ids)

		return new StepResponse(deleted, ids)
	},
	async (deletedRoleIds, { container }) => {
		if (!deletedRoleIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')

		// Restore the soft-deleted roles during compensation
		await service.restoreAccessRoles(deletedRoleIds)
	}
)
