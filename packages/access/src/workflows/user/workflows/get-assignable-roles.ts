import { WorkflowData, WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'
import { getAssignableRolesStep, GetAssignableRolesStepInput, GetAssignableRolesStepOutput } from '../steps/get-assignable-roles'

/**
 * @ignore
 */
export type GetAssignableRolesWorkflowInput = GetAssignableRolesStepInput

/**
 * @ignore
 */
export type GetAssignableRolesWorkflowOutput = GetAssignableRolesStepOutput

/**
 * @ignore
 */
export const getAssignableRolesWorkflowId = 'get-assignable-access-roles-workflow'

/**
 * Returns the set of `access_role`s that the actor is allowed to assign.
 *
 * @ignore
 */
export const getAssignableRolesWorkflow = createWorkflow(getAssignableRolesWorkflowId, (input: WorkflowData<GetAssignableRolesWorkflowInput>) => {
	const result = getAssignableRolesStep(input)
	return new WorkflowResponse(result)
})
