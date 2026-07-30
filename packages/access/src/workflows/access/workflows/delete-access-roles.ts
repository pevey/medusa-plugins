import { WorkflowData, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { deleteAccessRolesStep } from '../steps'

/**
 * @ignore
 * @featureFlag access
 */
export type DeleteAccessRolesWorkflowInput = {
	ids: string[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessRolesWorkflowId = 'delete-access-roles'

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessRolesWorkflow = createWorkflow(
	deleteAccessRolesWorkflowId,
	(input: WorkflowData<DeleteAccessRolesWorkflowInput>): WorkflowData<void> => {
		deleteAccessRolesStep(input.ids)
	}
)
