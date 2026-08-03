import { WorkflowData, WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { createAccessPoliciesStep } from '../steps'

/**
 * @ignore
 */
export type CreateAccessPoliciesWorkflowInput = {
	policies: any[]
}

/**
 * @ignore
 */
export const createAccessPoliciesWorkflowId = 'create-access-policies'

/**
 * @ignore
 */
export const createAccessPoliciesWorkflow = createWorkflow(createAccessPoliciesWorkflowId, (input: WorkflowData<CreateAccessPoliciesWorkflowInput>) => {
	return new WorkflowResponse(createAccessPoliciesStep(input))
})
