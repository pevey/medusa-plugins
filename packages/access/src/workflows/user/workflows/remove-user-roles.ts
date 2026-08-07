import { WorkflowData, WorkflowResponse, createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import { removeRoleAssignmentsStep } from '../../access/steps/remove-role-assignments'
import { validateUserRolePermissionsStep } from '../steps/validate-user-role-permissions'

/**
 * @ignore
 */
export type RemoveUserRolesWorkflowInput = {
	actor_id: string
	actor?: string
	user_id?: string
	user_ids?: string[]
	role_id?: string
	role_ids?: string[]
}

/**
 * @ignore
 */
export const removeUserRolesWorkflowId = 'remove-user-access-roles'

/**
 * This workflow removes roles from users.
 * Supports two modes:
 * - Remove multiple roles from a single user: { user_id, role_ids }
 * - Remove multiple users from a single role: { user_ids, role_id }
 * It validates that the actor has all the policies from the roles being removed.
 * @ignore
 */
export const removeUserRolesWorkflow = createWorkflow(removeUserRolesWorkflowId, (input: WorkflowData<RemoveUserRolesWorkflowInput>) => {
	const roleIds = transform({ input }, ({ input }) => {
		return input.role_ids ?? (input.role_id ? [input.role_id] : [])
	})

	validateUserRolePermissionsStep({
		actor_id: input.actor_id,
		role_ids: roleIds,
		actor: input.actor
	})

	const removal = transform({ input }, ({ input }) => {
		return {
			role_ids: input.role_ids ?? (input.role_id ? [input.role_id] : []),
			grantee_type: 'user',
			grantee_ids: input.user_ids ?? (input.user_id ? [input.user_id] : [])
		}
	})

	removeRoleAssignmentsStep(removal)

	return new WorkflowResponse(void 0)
})
