import { isDefined } from '@medusajs/framework/utils'
import { WorkflowData, WorkflowResponse, createWorkflow, transform, when } from '@medusajs/framework/workflows-sdk'
import { UpdateAccessRoleDTO } from '../../../modules/access/types'
import { createAccessRolePoliciesStep, resolveInheritedActionsStep, setRoleParentStep } from '../steps'
import { updateAccessRolesStep } from '../steps/update-access-roles'
import { validateUserPermissionsStep } from '../steps/validate-user-permissions'

/**
 * @ignore
 * @featureFlag access
 */
export type UpdateAccessRolesWorkflowInput = {
	actor_id?: string
	actor?: string
	selector: Record<string, any>
	update: Omit<UpdateAccessRoleDTO, 'id'> & {
		parent_ids?: string[]
		policy_ids?: string[]
	}
}

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolesWorkflowId = 'update-access-roles'

/**
 * @ignore
 * @featureFlag access
 */
export const updateAccessRolesWorkflow = createWorkflow(updateAccessRolesWorkflowId, (input: WorkflowData<UpdateAccessRolesWorkflowInput>) => {
	// A new parent confers everything in ITS chain (parent-of-parent included, since
	// listPoliciesForRole walks the same recursive CTE), so attaching one without this
	// check is a privilege escalation: the actor need only hold `access_role:update` to
	// inherit any other role's full policy set, including `*:*`.
	const parentIds = transform({ input }, ({ input }) => input.update.parent_ids || [])

	const inheritedActions = resolveInheritedActionsStep({ role_ids: parentIds })

	const validationData = transform({ input, inheritedActions }, ({ input, inheritedActions }) => {
		const policyIds = input.update.policy_ids || []
		return {
			actor_id: input.actor_id!,
			policies: policyIds.map(policy_id => ({ policy_id })),
			actor: input.actor,
			actions: inheritedActions
		}
	})

	when({ validationData }, ({ validationData }) => {
		return !!validationData?.actor_id && (!!validationData?.policies?.length || !!validationData?.actions?.length)
	}).then(() => {
		validateUserPermissionsStep(validationData)
	})

	const roleUpdateData = transform({ input }, ({ input }) => ({
		selector: input.selector,
		update: {
			name: input.update.name,
			description: input.update.description,
			metadata: input.update.metadata
		}
	}))

	const updatedRoles = updateAccessRolesStep(roleUpdateData)

	const parentUpdateData = transform({ input, updatedRoles }, ({ input, updatedRoles }) => {
		if (!isDefined(input.update.parent_ids)) {
			return []
		}

		return updatedRoles.map(role => ({
			role_id: role.id,
			parent_ids: input.update.parent_ids || []
		}))
	})

	setRoleParentStep(parentUpdateData)

	const policiesUpdateData = transform({ input, updatedRoles }, ({ input, updatedRoles }) => {
		if (!isDefined(input.update.policy_ids)) {
			return { policies: [] }
		}

		const allPolicies: any[] = []
		updatedRoles.forEach(role => {
			const policyIds = input.update.policy_ids || []
			policyIds.forEach(policyId => {
				allPolicies.push({
					role_id: role.id,
					policy_id: policyId
				})
			})
		})
		return { policies: allPolicies }
	})

	createAccessRolePoliciesStep(policiesUpdateData)

	return new WorkflowResponse(updatedRoles)
})
