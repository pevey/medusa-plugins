import { WorkflowData, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { deleteAccessPoliciesStep } from '../steps'

/**
 * @ignore
 */
export type DeleteAccessPoliciesWorkflowInput = {
	ids: string[]
}

/**
 * @ignore
 */
export const deleteAccessPoliciesWorkflowId = 'delete-access-policies'

/**
 * @ignore
 */
export const deleteAccessPoliciesWorkflow = createWorkflow(
	deleteAccessPoliciesWorkflowId,
	(input: WorkflowData<DeleteAccessPoliciesWorkflowInput>): WorkflowData<void> => {
		deleteAccessPoliciesStep(input.ids)
	}
)
