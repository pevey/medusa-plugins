import { WorkflowData, WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { UpdateAccessRolePolicyDTO } from '../../../modules/access/types'
import { updateAccessRolePoliciesStep } from '../steps/update-access-role-policies'

/**
 * @ignore
 * @featureFlag access
 */
export type UpdateAccessRolePoliciesWorkflowInput = {
	selector: Record<string, any>
	update: Omit<UpdateAccessRolePolicyDTO, 'id'>
}

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolePoliciesWorkflowId = 'update-access-role-policies'

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolePoliciesWorkflow = createWorkflow(
	updateAccessRolePoliciesWorkflowId,
	(input: WorkflowData<UpdateAccessRolePoliciesWorkflowInput>) => {
		return new WorkflowResponse(updateAccessRolePoliciesStep(input))
	}
)
