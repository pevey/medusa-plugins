import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type RemoveAssignmentsByIdStepInput = {
	ids: string[]
}

/**
 * @ignore
 */
export const removeAssignmentsByIdStepId = 'remove-access-role-assignments-by-id'

/**
 * Soft-deletes the given assignments so compensation can restore the exact
 * rows.
 * @ignore
 */
export const removeAssignmentsByIdStep = createStep(
	removeAssignmentsByIdStepId,
	async (data: RemoveAssignmentsByIdStepInput, { container }) => {
		if (!data.ids?.length) {
			return new StepResponse(void 0, [])
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.softDeleteAccessRoleAssignments(data.ids)

		return new StepResponse(void 0, data.ids)
	},
	async (removedIds: string[] | undefined, { container }) => {
		if (!removedIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.restoreAccessRoleAssignments(removedIds)
	}
)
