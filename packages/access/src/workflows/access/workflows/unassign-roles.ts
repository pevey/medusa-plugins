import { WorkflowData, WorkflowResponse, createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import { getRoleAssignmentsStep } from '../steps/get-role-assignments'
import { removeAssignmentsByIdStep } from '../steps/remove-assignments-by-id'
import { validateAssignmentPermissionsStep } from '../steps/validate-assignment-permissions'

/**
 * @ignore
 */
export type UnassignRolesWorkflowInput = {
	assignment_ids: string[]
	/** Same contract as assign: absent means a system flow, no validation. */
	granting_actor_id?: string
	granting_actor_type?: string
}

/**
 * @ignore
 */
export const unassignRolesWorkflowId = 'unassign-access-roles'

/**
 * Removes assignments by id. Validation mirrors assignment: revoking is
 * gated by the same delegation rule, evaluated under each row's own scope.
 * @ignore
 */
export const unassignRolesWorkflow = createWorkflow(unassignRolesWorkflowId, (input: WorkflowData<UnassignRolesWorkflowInput>) => {
	const assignments = getRoleAssignmentsStep({ ids: input.assignment_ids })

	const validation = transform({ input, assignments }, ({ input, assignments }) => ({
		granting_actor_id: input.granting_actor_id,
		granting_actor_type: input.granting_actor_type,
		assignments: assignments.map(assignment => ({
			role_id: assignment.role_id,
			grantee_type: assignment.grantee_type,
			grantee_id: assignment.grantee_id,
			scope_type: assignment.scope_type,
			scope_id: assignment.scope_id
		}))
	}))

	validateAssignmentPermissionsStep(validation)

	removeAssignmentsByIdStep({ ids: input.assignment_ids })

	return new WorkflowResponse(void 0)
})
