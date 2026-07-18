import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { IAccessModuleService } from "../../../modules/access/types"

/**
 * @ignore
 * @featureFlag access
 */
export type SetRoleParentStepInput = Array<{
  role_id: string
  parent_ids: string[]
}>

/**
 * @ignore
 * @featureFlag access
 */
export const setRoleParentStepId = "set-access-role-parent"

/**
 * @ignore
 * @featureFlag access
 */
export const setRoleParentStep = createStep(
  setRoleParentStepId,
  async (data: SetRoleParentStepInput, { container }) => {
    const service = container.resolve<IAccessModuleService>("access")

    const allCompensationData: Array<{
      role_id: string
      previous_inherited_role_ids: string[]
    }> = []

    if (!data || data.length === 0) {
      return new StepResponse(
        { created: [], removedCount: 0 },
        allCompensationData
      )
    }

    const allToRemoveIds: string[] = []
    const allToCreate: Array<{
      role_id: string
      parent_id: string
    }> = []

    for (const roleData of data) {
      const existingParent = await service.listAccessRoleParents({
        role_id: roleData.role_id,
      })

      const existingInheritedRoleIds = existingParent.map((ri) => ri.parent_id)

      allCompensationData.push({
        role_id: roleData.role_id,
        previous_inherited_role_ids: existingInheritedRoleIds,
      })

      const toAdd = roleData.parent_ids.filter(
        (id) => !existingInheritedRoleIds.includes(id)
      )
      const toRemove = existingInheritedRoleIds.filter(
        (id) => !roleData.parent_ids.includes(id)
      )

      if (toRemove.length > 0) {
        const toRemoveRecords = existingParent.filter((ri) =>
          toRemove.includes(ri.parent_id)
        )
        allToRemoveIds.push(...toRemoveRecords.map((ri) => ri.id))
      }

      if (toAdd.length > 0) {
        allToCreate.push(
          ...toAdd.map((parent_id) => ({
            role_id: roleData.role_id,
            parent_id,
          }))
        )
      }
    }

    if (allToRemoveIds.length > 0) {
      await service.deleteAccessRoleParents(allToRemoveIds)
    }

    let created: any[] = []
    if (allToCreate.length > 0) {
      created = await service.createAccessRoleParents(allToCreate)
    }

    return new StepResponse(
      { created, removedCount: allToRemoveIds.length },
      allCompensationData
    )
  },
  async (
    compensationData:
      | Array<{ role_id: string; previous_inherited_role_ids: string[] }>
      | undefined,
    { container }
  ) => {
    if (!compensationData || compensationData.length === 0) {
      return
    }

    const service = container.resolve<IAccessModuleService>("access")

    for (const roleCompensation of compensationData) {
      const currentParent = await service.listAccessRoleParents({
        role_id: roleCompensation.role_id,
      })

      if (currentParent.length > 0) {
        await service.deleteAccessRoleParents(currentParent.map((ri) => ri.id))
      }

      if (roleCompensation.previous_inherited_role_ids.length > 0) {
        await service.createAccessRoleParents(
          roleCompensation.previous_inherited_role_ids.map((parent_id) => ({
            role_id: roleCompensation.role_id,
            parent_id,
          }))
        )
      }
    }
  }
)
