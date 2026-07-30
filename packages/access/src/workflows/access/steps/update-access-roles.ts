import { getSelectsAndRelationsFromObjectArray, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService, UpdateAccessRoleDTO } from '../../../modules/access/types'

/**
 * @ignore
 * @featureFlag access
 */
export type UpdateAccessRolesStepInput = {
	selector: Record<string, any>
	update: Omit<UpdateAccessRoleDTO, 'id'>
}

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolesStepId = 'update-access-roles'

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolesStep = createStep(
	updateAccessRolesStepId,
	async (data: UpdateAccessRolesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		const { selects, relations } = getSelectsAndRelationsFromObjectArray([data.update])

		const prevData = await service.listAccessRoles(data.selector, {
			select: selects,
			relations
		})

		const updates = (prevData ?? []).map(r => ({
			id: r.id,
			...data.update
		})) as UpdateAccessRoleDTO[]

		const updated = await service.updateAccessRoles(updates)

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

		const updates = compensationData.prevData.map(r => {
			const payload: Record<string, any> = { id: r.id }
			for (const key of compensationData.updateKeys) {
				payload[key] = r[key]
			}
			return payload
		}) as UpdateAccessRoleDTO[]

		await service.updateAccessRoles(updates)
	}
)
