import { WorkflowData, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { deleteAccessRolesStep } from '../steps'

/**
 * @ignore
 */
export type DeleteAccessRolesWorkflowInput = {
	ids: string[]
}

/**
 * @ignore
 */
export const deleteAccessRolesWorkflowId = 'delete-access-roles'

/**
 * @ignore
 */
export const deleteAccessRolesWorkflow = createWorkflow(
	deleteAccessRolesWorkflowId,
	(input: WorkflowData<DeleteAccessRolesWorkflowInput>): WorkflowData<void> => {
		deleteAccessRolesStep(input.ids)
	}
)
