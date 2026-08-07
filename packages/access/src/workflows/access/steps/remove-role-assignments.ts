import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type RemoveRoleAssignmentsStepInput = {
	role_ids: string[]
	grantee_type: string
	grantee_ids: string[]
}

/**
 * @ignore
 */
export const removeRoleAssignmentsStepId = 'remove-access-role-assignments'

/**
 * Removes every assignment matching the (role × grantee) cross product,
 * scoped ones included — "no longer holds the role" means everywhere.
 * Soft-deletes so compensation can restore the exact rows.
 * @ignore
 */
export const removeRoleAssignmentsStep = createStep(
	removeRoleAssignmentsStepId,
	async (data: RemoveRoleAssignmentsStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!data.role_ids?.length || !data.grantee_ids?.length) {
			return new StepResponse(void 0, [])
		}

		const matching = await service.listAccessRoleAssignments({
			role_id: data.role_ids,
			grantee_type: data.grantee_type,
			grantee_id: data.grantee_ids
		})

		const ids = matching.map(assignment => assignment.id)
		if (ids.length) {
			await service.softDeleteAccessRoleAssignments(ids)
		}

		return new StepResponse(void 0, ids)
	},
	async (removedIds: string[] | undefined, { container }) => {
		if (!removedIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.restoreAccessRoleAssignments(removedIds)
	}
)
