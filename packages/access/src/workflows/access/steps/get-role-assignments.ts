import { MedusaError, arrayDifference } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { AccessRoleAssignmentDTO, IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type GetRoleAssignmentsStepInput = {
	ids: string[]
}

/**
 * @ignore
 */
export const getRoleAssignmentsStepId = 'get-access-role-assignments'

/**
 * Fetches assignments by id, failing closed on any missing one — a partial
 * result would let a removal (and its validation) silently skip rows.
 * @ignore
 */
export const getRoleAssignmentsStep = createStep(
	getRoleAssignmentsStepId,
	async (data: GetRoleAssignmentsStepInput, { container }): Promise<StepResponse<AccessRoleAssignmentDTO[]>> => {
		const service = container.resolve<IAccessModuleService>('access')
		const unique = [...new Set(data.ids)]

		const assignments = await service.listAccessRoleAssignments({ id: unique })

		if (assignments.length !== unique.length) {
			const missing = arrayDifference(
				unique,
				assignments.map(assignment => assignment.id)
			)
			throw new MedusaError(MedusaError.Types.NOT_FOUND, `The following role assignments do not exist: ${missing.join(', ')}`)
		}

		return new StepResponse(assignments)
	}
)
