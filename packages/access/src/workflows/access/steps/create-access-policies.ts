import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { CreateAccessPolicyDTO, IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessPoliciesStepInput = {
	policies: CreateAccessPolicyDTO[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessPoliciesStepId = 'create-access-policies'

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessPoliciesStep = createStep(
	createAccessPoliciesStepId,
	async (data: CreateAccessPoliciesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		// Normalize resource and operation to lowercase
		const normalizedPolicies = data.policies.map(policy => ({
			...policy,
			resource: policy.resource.toLowerCase(),
			operation: policy.operation.toLowerCase()
		}))

		const created = await service.createAccessPolicies(normalizedPolicies)

		return new StepResponse(
			created,
			(created ?? []).map(p => p.id)
		)
	},
	async (createdIds: string[] | undefined, { container }) => {
		if (!createdIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.deleteAccessPolicies(createdIds)
	}
)
