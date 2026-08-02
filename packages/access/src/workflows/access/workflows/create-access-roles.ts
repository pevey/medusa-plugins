import { createWorkflow, transform, when, WorkflowData, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { createAccessRoleParentsStep, createAccessRolePoliciesStep, createAccessRolesStep, resolveInheritedActionsStep } from '../steps'
import { validateUserPermissionsStep } from '../steps/validate-user-permissions'

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
export const createAccessRolesWorkflowId = 'create-access-roles'

/**
 * @ignore
 * @featureFlag access
 */
export const createAccessRolesWorkflow = createWorkflow(createAccessRolesWorkflowId, (input: WorkflowData<CreateAccessRolesWorkflowInput>) => {
	// A parent confers its whole chain (parent-of-parent included), so the actor must
	// already hold everything the requested parents would grant -- otherwise attaching
	// one is a privilege escalation independent of any policy_ids check.
	const parentIds = transform({ input }, ({ input }) => {
		const allParentIds = new Set<string>()
		input.roles.forEach(role => {
			role.parent_ids?.forEach(parentId => allParentIds.add(parentId))
		})
		return Array.from(allParentIds)
	})

	const inheritedActions = resolveInheritedActionsStep({ role_ids: parentIds })

	const validationData = transform({ input, inheritedActions }, ({ input, inheritedActions }) => {
		const allPolicyIds = new Set<string>()
		input.roles.forEach(role => {
			role.policy_ids?.forEach(policyId => allPolicyIds.add(policyId))
		})
		return {
			actor_id: input.actor_id!,
			actor: input.actor,
			policies: Array.from(allPolicyIds).map(policy_id => ({ policy_id })),
			actions: inheritedActions
		}
	})

	when({ validationData }, ({ validationData }) => {
		return !!validationData?.actor_id && (!!validationData?.policies?.length || !!validationData?.actions?.length)
	}).then(() => {
		validateUserPermissionsStep(validationData)
	})

	const roleData = transform({ input }, ({ input }) => ({
		roles: input.roles.map(r => ({
			name: r.name,
			description: r.description,
			metadata: r.metadata
		}))
	}))

	const createdRoles = createAccessRolesStep(roleData)

	const parentData = transform({ input, createdRoles }, ({ input, createdRoles }) => {
		const parents: any[] = []

		createdRoles.forEach((role, index) => {
			const inheritedRoleIds = input.roles[index].parent_ids || []
			inheritedRoleIds.forEach(inheritedRoleId => {
				parents.push({
					role_id: role.id,
					parent_id: inheritedRoleId
				})
			})
		})

		return { role_parents: parents }
	})

	const policiesData = transform({ input, createdRoles }, ({ input, createdRoles }) => {
		const allPolicies: any[] = []
		createdRoles.forEach((role, index) => {
			const policyIds = input.roles[index].policy_ids || []
			policyIds.forEach(policy_id => {
				allPolicies.push({
					role_id: role.id,
					policy_id: policy_id
				})
			})
		})
		return { policies: allPolicies }
	})

	createAccessRoleParentsStep(parentData)

	createAccessRolePoliciesStep(policiesData)

	return new WorkflowResponse(createdRoles)
})
