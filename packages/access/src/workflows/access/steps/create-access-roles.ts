import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessRoleDTO = {
	name: string
	description?: string | null
	metadata?: Record<string, unknown> | null
}

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessRolesStepInput = {
	roles: CreateAccessRoleDTO[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolesStepId = 'create-access-roles'

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolesStep = createStep(
	createAccessRolesStepId,
	async (data: CreateAccessRolesStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!data.roles?.length) {
			return new StepResponse([], [])
		}
		const created = await service.createAccessRoles(data.roles)

		return new StepResponse(
			created,
			(created ?? []).map(r => r.id)
		)
	},
	async (createdIds: string[] | undefined, { container }) => {
		if (!createdIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.deleteAccessRoles(createdIds)
	}
)
