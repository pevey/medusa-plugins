import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type DeleteAccessRolePoliciesStepInput = string[]

/**
 * @ignore
 */
export const deleteAccessRolePoliciesStepId = 'delete-access-role-policies'

/**
 * @ignore
 */
export const deleteAccessRolePoliciesStep = createStep(
	{ name: deleteAccessRolePoliciesStepId, noCompensation: true },
	async (ids: DeleteAccessRolePoliciesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!ids?.length) {
			return new StepResponse([] as any, [])
		}

		const deleted = await service.deleteAccessRolePolicies(ids)

		return new StepResponse(deleted, ids)
	},
	async (deletedRolePolicyIds, { container }) => {
		if (!deletedRolePolicyIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.restoreAccessRolePolicies(deletedRolePolicyIds)
	}
)
