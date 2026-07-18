import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createAccessRoleParentsStep,
  createAccessRolePoliciesStep,
  createAccessRolesStep,
} from "../steps"
import { validateUserPermissionsStep } from "../steps/validate-user-permissions"

/**
 * @ignore
 * @featureFlag access
 */
export type CreateAccessRolesWorkflowInput = {
  actor_id?: string
  actor?: string
  roles: {
    name: string
    description?: string | null
    metadata?: Record<string, unknown> | null
    parent_ids?: string[]
    policy_ids?: string[]
  }[]
}

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolesWorkflowId = "create-access-roles"

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolesWorkflow = createWorkflow(
  createAccessRolesWorkflowId,
  (input: WorkflowData<CreateAccessRolesWorkflowInput>) => {
    const validationData = transform({ input }, ({ input }) => {
      const allPolicyIds = new Set<string>()
      input.roles.forEach((role) => {
        role.policy_ids?.forEach((policyId) => allPolicyIds.add(policyId))
      })
      return {
        actor_id: input.actor_id!,
        actor: input.actor,
        policy_ids: Array.from(allPolicyIds),
      }
    })

    when({ validationData }, ({ validationData }) => {
      return !!validationData?.actor_id && !!validationData?.policy_ids?.length
    }).then(() => {
      validateUserPermissionsStep(validationData)
    })

    const roleData = transform({ input }, ({ input }) => ({
      roles: input.roles.map((r) => ({
        name: r.name,
        description: r.description,
        metadata: r.metadata,
      })),
    }))

    const createdRoles = createAccessRolesStep(roleData)

    const parentData = transform(
      { input, createdRoles },
      ({ input, createdRoles }) => {
        const parents: any[] = []

        createdRoles.forEach((role, index) => {
          const inheritedRoleIds = input.roles[index].parent_ids || []
          inheritedRoleIds.forEach((inheritedRoleId) => {
            parents.push({
              role_id: role.id,
              parent_id: inheritedRoleId,
            })
          })
        })

        return { role_parents: parents }
      }
    )

    const policiesData = transform(
      { input, createdRoles },
      ({ input, createdRoles }) => {
        const allPolicies: any[] = []
        createdRoles.forEach((role, index) => {
          const policyIds = input.roles[index].policy_ids || []
          policyIds.forEach((policy_id) => {
            allPolicies.push({
              role_id: role.id,
              policy_id: policy_id,
            })
          })
        })
        return { policies: allPolicies }
      }
    )

    createAccessRoleParentsStep(parentData)

    createAccessRolePoliciesStep(policiesData)

    return new WorkflowResponse(createdRoles)
  }
)
