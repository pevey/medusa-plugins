import { WorkflowData, WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { deleteAccessRolePoliciesStep } from '../steps'

/**
 * @ignore
 * @featureFlag access
 */
export type DeleteAccessRolePoliciesWorkflowInput = {
	role_policy_ids: string[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessRolePoliciesWorkflowId = 'delete-access-role-policies'

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessRolePoliciesWorkflow = createWorkflow(
	deleteAccessRolePoliciesWorkflowId,
	(input: WorkflowData<DeleteAccessRolePoliciesWorkflowInput>) => {
		const deletedRolePolicies = deleteAccessRolePoliciesStep(input.role_policy_ids)

		return new WorkflowResponse(deletedRolePolicies)
	}
)
