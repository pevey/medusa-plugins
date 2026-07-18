import {
  getSelectsAndRelationsFromObjectArray,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { IAccessModuleService, UpdateAccessPolicyDTO } from "../../../modules/access/types"

/**
 * @ignore
 * @featureFlag access
 */
export type UpdateAccessPoliciesStepInput = {
  selector: Record<string, any>
  update: Omit<UpdateAccessPolicyDTO, "id">
}

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessPoliciesStepId = "update-access-policies"

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessPoliciesStep = createStep(
  updateAccessPoliciesStepId,
  async (data: UpdateAccessPoliciesStepInput, { container }) => {
    const service = container.resolve<IAccessModuleService>("access")

    const { selects, relations } = getSelectsAndRelationsFromObjectArray([
      data.update,
    ])

    const prevData = await service.listAccessPolicies(data.selector, {
      select: selects,
      relations,
    })

    // Normalize resource and operation to lowercase if present
    const normalizedUpdate = { ...data.update }
    if (normalizedUpdate.resource) {
      normalizedUpdate.resource = normalizedUpdate.resource.toLowerCase()
    }
    if (normalizedUpdate.operation) {
      normalizedUpdate.operation = normalizedUpdate.operation.toLowerCase()
    }

    const updates = (prevData ?? []).map((p) => ({
      id: p.id,
      ...normalizedUpdate,
    })) as UpdateAccessPolicyDTO[]

    const updated = await service.updateAccessPolicies(updates)

    return new StepResponse(updated, {
      prevData,
      updateKeys: Object.keys(data.update ?? {}),
    })
  },
  async (
    compensationData: { prevData: any[]; updateKeys: string[] } | undefined,
    { container }
  ) => {
    if (!compensationData?.prevData?.length) {
      return
    }

    const service = container.resolve<IAccessModuleService>("access")

    const updates = compensationData.prevData.map((p) => {
      const payload: Record<string, any> = { id: p.id }
      for (const key of compensationData.updateKeys) {
        payload[key] = p[key]
      }
      return payload
    }) as UpdateAccessPolicyDTO[]

    await service.updateAccessPolicies(updates)
  }
)
