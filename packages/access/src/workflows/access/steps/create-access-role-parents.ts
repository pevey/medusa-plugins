import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type CreateAccessRoleParentDTO = {
	role_id: string
	parent_id: string
	metadata?: Record<string, unknown> | null
}

/**
 * @ignore
 */
export type CreateAccessRoleParentsStepInput = {
	role_parents: CreateAccessRoleParentDTO[]
}

/**
 * @ignore
 */
export const createAccessRoleParentsStepId = 'create-access-role-parents'

/**
 * @ignore
 */
export const createAccessRoleParentsStep = createStep(
	createAccessRoleParentsStepId,
	async (data: CreateAccessRoleParentsStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!data.role_parents?.length) {
			return new StepResponse([], [])
		}

		const created = await service.createAccessRoleParents(data.role_parents)

		return new StepResponse(
			created,
			(created ?? []).map(ri => ri.id)
		)
	},
	async (createdIds: string[] | undefined, { container }) => {
		if (!createdIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.deleteAccessRoleParents(createdIds)
	}
)
