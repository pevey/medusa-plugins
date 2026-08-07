import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { CreateAccessRoleAssignmentDTO, IAccessModuleService } from '../../../modules/access/types'

/**
 * @ignore
 */
export type CreateRoleAssignmentsStepInput = {
	assignments: CreateAccessRoleAssignmentDTO[]
}

/**
 * @ignore
 */
export const createRoleAssignmentsStepId = 'create-access-role-assignments'

/**
 * Creates role assignments, skipping ones that already exist — assigning an
 * already-held role is a no-op (the behavior the remote-link predecessor had),
 * not a unique-constraint 500. Compensation deletes only the rows this run
 * actually created.
 * @ignore
 */
export const createRoleAssignmentsStep = createStep(
	createRoleAssignmentsStepId,
	async (data: CreateRoleAssignmentsStepInput, { container }) => {
		const service = container.resolve<IAccessModuleService>('access')

		if (!data.assignments?.length) {
			return new StepResponse([], [])
		}

		const existing = await service.listAccessRoleAssignments({
			role_id: [...new Set(data.assignments.map(assignment => assignment.role_id))],
			grantee_type: [...new Set(data.assignments.map(assignment => assignment.grantee_type))],
			grantee_id: [...new Set(data.assignments.map(assignment => assignment.grantee_id))]
		})

		const key = (assignment: { role_id: string; grantee_type: string; grantee_id: string; scope_type?: string | null; scope_id?: string | null }) =>
			`${assignment.role_id} ${assignment.grantee_type} ${assignment.grantee_id} ${assignment.scope_type ?? ''} ${assignment.scope_id ?? ''}`

		const existingKeys = new Set(existing.map(key))
		const toCreate = data.assignments.filter(assignment => !existingKeys.has(key(assignment)))

		if (!toCreate.length) {
			return new StepResponse([], [])
		}

		const created = await service.createAccessRoleAssignments(toCreate)
		const createdList = Array.isArray(created) ? created : [created]

		return new StepResponse(
			createdList,
			createdList.map(assignment => assignment.id)
		)
	},
	async (createdIds: string[] | undefined, { container }) => {
		if (!createdIds?.length) {
			return
		}

		const service = container.resolve<IAccessModuleService>('access')
		await service.deleteAccessRoleAssignments(createdIds)
	}
)
