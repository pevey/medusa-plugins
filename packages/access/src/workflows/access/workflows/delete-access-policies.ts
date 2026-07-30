import { WorkflowData, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { deleteAccessPoliciesStep } from '../steps'

/**
 * @ignore
 * @featureFlag access
 */
export type DeleteAccessPoliciesWorkflowInput = {
	ids: string[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessPoliciesWorkflowId = 'delete-access-policies'

/**
 * @ignore
 * @featureFlag access
 */
export const deleteAccessPoliciesWorkflow = createWorkflow(
	deleteAccessPoliciesWorkflowId,
	(input: WorkflowData<DeleteAccessPoliciesWorkflowInput>): WorkflowData<void> => {
		deleteAccessPoliciesStep(input.ids)
	}
)
