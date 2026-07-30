import { getSelectsAndRelationsFromObjectArray, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService, UpdateAccessRolePolicyDTO } from '../../../modules/access/types'

/**
 * @ignore
 * @featureFlag access
 */
export type UpdateAccessRolePoliciesStepInput = {
	selector: Record<string, any>
	update: Omit<UpdateAccessRolePolicyDTO, 'id'>
}

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolePoliciesStepId = 'update-access-role-policies'

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolePoliciesStep = createStep(
	updateAccessRolePoliciesStepId,
	async (data: UpdateAccessRolePoliciesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		const { selects, relations } = getSelectsAndRelationsFromObjectArray([data.update])

		const prevData = await service.listAccessRolePolicies(data.selector, {
			select: selects,
			relations
		})

		const updates = (prevData ?? []).map(rp => ({
			id: rp.id,
			...data.update
		})) as UpdateAccessRolePolicyDTO[]

		const updated = await service.updateAccessRolePolicies(updates)

		return new StepResponse(updated, {
			prevData,
			updateKeys: Object.keys(data.update ?? {})
		})
	},
	async (compensationData: { prevData: any[]; updateKeys: string[] } | undefined, { container }) => {
		if (!compensationData?.prevData?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')

		const updates = compensationData.prevData.map(rp => {
			const payload: Record<string, any> = { id: rp.id }
			for (const key of compensationData.updateKeys) {
				payload[key] = rp[key]
			}
			return payload
		}) as UpdateAccessRolePolicyDTO[]

		await service.updateAccessRolePolicies(updates)
	}
)
