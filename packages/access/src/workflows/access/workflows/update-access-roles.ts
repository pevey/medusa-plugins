import { isDefined } from '@medusajs/framework/utils'
import { WorkflowData, WorkflowResponse, createWorkflow, transform, when } from '@medusajs/framework/workflows-sdk'
import { UpdateAccessRoleDTO } from '../../../modules/access/types'
import { resolveInheritedActionsStep, setRoleParentStep } from '../steps'
import { updateAccessRolesStep } from '../steps/update-access-roles'
import { validateUserPermissionsStep } from '../steps/validate-user-permissions'

/**
 * @ignore
 */
export type UpdateAccessRolesWorkflowInput = {
	actor_id?: string
	actor?: string
	selector: Record<string, any>
	update: Omit<UpdateAccessRoleDTO, 'id'> & {
		parent_ids?: string[]
	}
}

/**
 * @ignore
 */
export const updateAccessRolesWorkflowId = 'update-access-roles'

/**
 * @ignore
 */
export const updateAccessRolesWorkflow = createWorkflow(updateAccessRolesWorkflowId, (input: WorkflowData<UpdateAccessRolesWorkflowInput>) => {
	// A new parent confers everything in ITS chain (parent-of-parent included, since
	// listPoliciesForRole walks the same recursive CTE), so attaching one without this
	// check is a privilege escalation: the actor need only hold `access_role:update` to
	// inherit any other role's full policy set, including `*:*`.
	const parentIds = transform({ input }, ({ input }) => input.update.parent_ids || [])

	const inheritedActions = resolveInheritedActionsStep({ role_ids: parentIds })

	// Grants are assigned through the role-policies endpoint, not here — a second
	// write path onto the same link table is the bug class this workflow already
	// paid for once with `parent_id`/`parent_ids`.
	const validationData = transform({ input, inheritedActions }, ({ input, inheritedActions }) => ({
		actor_id: input.actor_id!,
		actor: input.actor,
		actions: inheritedActions
	}))

	when({ validationData }, ({ validationData }) => {
		return !!validationData?.actor_id && !!validationData?.actions?.length
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

	return new WorkflowResponse(updatedRoles)
})
