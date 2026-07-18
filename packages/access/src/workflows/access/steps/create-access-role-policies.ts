import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { CreateAccessRolePolicyDTO, IAccessModuleService } from "../../../modules/access/types"

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessRolePoliciesStepInput = {
  policies: CreateAccessRolePolicyDTO[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolePoliciesStepId = "create-access-role-policies"

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolePoliciesStep = createStep(
  createAccessRolePoliciesStepId,
  async (data: CreateAccessRolePoliciesStepInput, { container }) => {
    const service = container.resolve<IAccessModuleService>("access")

    if (!data.policies?.length) {
      return new StepResponse([], [])
    }

    const created = await service.createAccessRolePolicies(data.policies)

    return new StepResponse(
      created,
      (created ?? []).map((rp) => rp.id)
    )
  },
  async (createdIds: string[] | undefined, { container }) => {
    if (!createdIds?.length) {
      return
    }

    const service = container.resolve<IAccessModuleService>("access")
    await service.deleteAccessRolePolicies(createdIds)
  }
)
