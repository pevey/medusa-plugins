import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { UpdateAccessPolicyDTO } from "../../../modules/access/types"
import { updateAccessPoliciesStep } from "../steps/update-access-policies"

/**
 * @ignore
 * @featureFlag access
 */
export type UpdateAccessPoliciesWorkflowInput = {
  selector: Record<string, any>
  update: Omit<UpdateAccessPolicyDTO, "id">
}

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessPoliciesWorkflowId = "update-access-policies"

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessPoliciesWorkflow = createWorkflow(
  updateAccessPoliciesWorkflowId,
  (input: WorkflowData<UpdateAccessPoliciesWorkflowInput>) => {
    return new WorkflowResponse(updateAccessPoliciesStep(input))
  }
)
