import { WorkflowData, WorkflowResponse, createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import { CreateAccessRoleAssignmentDTO } from '../../../modules/access/types'
import { validateRolesExistStep } from '../../invite/steps/validate-roles-exist'
import { createRoleAssignmentsStep } from '../steps/create-role-assignments'
import { validateAssignmentPermissionsStep } from '../steps/validate-assignment-permissions'

/**
 * @ignore
 */
export type AssignRolesWorkflowInput = {
	assignments: CreateAccessRoleAssignmentDTO[]
	/**
	 * The actor whose authority the assignments are created under. Omit ONLY
	 * for system flows (bootstrap, migrations, invite transfer) — with it
	 * absent, no anti-escalation validation runs.
	 */
	granting_actor_id?: string
	granting_actor_type?: string
}

/**
 * @ignore
 */
export const assignRolesWorkflowId = 'assign-access-roles'

/**
 * The generic assignment workflow: grants roles to any grantee — actor or
 * indirection entity — optionally pinned to a tenancy scope. Validates that
 * the granting actor may delegate each assignment's roles under that
 * assignment's scope.
 * @ignore
 */
export const assignRolesWorkflow = createWorkflow(assignRolesWorkflowId, (input: WorkflowData<AssignRolesWorkflowInput>) => {
	const roleIds = transform({ input }, ({ input }) => [...new Set((input.assignments ?? []).map(assignment => assignment.role_id))])

	validateRolesExistStep(roleIds)

	validateAssignmentPermissionsStep({
		granting_actor_id: input.granting_actor_id,
		granting_actor_type: input.granting_actor_type,
		assignments: input.assignments
	})

	const created = createRoleAssignmentsStep({ assignments: input.assignments })

	return new WorkflowResponse(created)
})
