import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"
import {
  GetAssignablePoliciesStepInput,
  GetAssignablePoliciesStepOutput,
  getAssignablePoliciesStep,
} from "../steps/get-assignable-policies"

/**
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export type GetAssignablePoliciesWorkflowInput = GetAssignablePoliciesStepInput

/**
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export type GetAssignablePoliciesWorkflowOutput =
  GetAssignablePoliciesStepOutput

/**
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export const getAssignablePoliciesWorkflowId =
  "get-assignable-access-policies-workflow"

/**
 * Returns the set of `access_policy` rows the actor is allowed to assign.
 *
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export const getAssignablePoliciesWorkflow = createWorkflow(
  getAssignablePoliciesWorkflowId,
  (input: WorkflowData<GetAssignablePoliciesWorkflowInput>) => {
    const result = getAssignablePoliciesStep(input)
    return new WorkflowResponse(result)
  }
)
