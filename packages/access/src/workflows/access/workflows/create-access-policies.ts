import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { createAccessPoliciesStep } from "../steps"

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessPoliciesWorkflowInput = {
  policies: any[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessPoliciesWorkflowId = "create-access-policies"

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessPoliciesWorkflow = createWorkflow(
  createAccessPoliciesWorkflowId,
  (input: WorkflowData<CreateAccessPoliciesWorkflowInput>) => {
    return new WorkflowResponse(createAccessPoliciesStep(input))
  }
)
