import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type DeleteAccessPoliciesStepInput = string[]

/**
 * @ignore
 */
export const deleteAccessPoliciesStepId = 'delete-access-policies'

/**
 * @ignore
 */
export const deleteAccessPoliciesStep = createStep(
	{ name: deleteAccessPoliciesStepId, noCompensation: true },
	async (ids: DeleteAccessPoliciesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!ids?.length) {
			return new StepResponse([] as any, [])
		}

		const deleted = await service.deleteAccessPolicies(ids)

		return new StepResponse(deleted, ids)
	},
	async (deletedPoliciesIds, { container }) => {
		if (!deletedPoliciesIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')

		// Restore the soft-deleted roles during compensation
		await service.restoreAccessPolicies(deletedPoliciesIds)
	}
)
