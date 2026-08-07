import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { CreateAccessRoleAssignmentDTO } from '../../../modules/access/types'
import { assertCanGrantRoles } from '../../user/steps/validate-user-role-permissions'

/**
 * @ignore
 */
export type ValidateAssignmentPermissionsStepInput = {
	granting_actor_id?: string
	granting_actor_type?: string
	assignments: CreateAccessRoleAssignmentDTO[]
}

/**
 * @ignore
 */
export const validateAssignmentPermissionsStepId = 'validate-access-assignment-permissions'

/**
 * Anti-escalation for the generic assignment workflows: each assignment's
 * roles must be grantable by the granting actor UNDER THAT ASSIGNMENT'S
 * scope — an unscoped assignment needs unscoped authority, a tenant-pinned
 * one is satisfied by authority pinned to the same tenant. Skipped entirely
 * when no granting actor is supplied (system flows: bootstrap, migrations,
 * invite transfer).
 * @ignore
 */
export const validateAssignmentPermissionsStep = createStep(
	validateAssignmentPermissionsStepId,
	async (data: ValidateAssignmentPermissionsStepInput, { container }) => {
		if (!data.granting_actor_id || !data.assignments?.length) {
			return new StepResponse(void 0)
		}

		// Group by the assignment's tenancy scope: the granter evaluation
		// differs per tenant, never per grantee.
		const byScope = new Map<string, { scope?: { type: string; id: string }; roleIds: Set<string> }>()
		for (const assignment of data.assignments) {
			const scope = assignment.scope_type && assignment.scope_id ? { type: assignment.scope_type, id: assignment.scope_id } : undefined
			const key = scope ? `${scope.type} ${scope.id}` : ''
			let group = byScope.get(key)
			if (!group) {
				group = { scope, roleIds: new Set() }
				byScope.set(key, group)
			}
			group.roleIds.add(assignment.role_id)
		}

		for (const group of byScope.values()) {
			await assertCanGrantRoles(container, {
				actorType: data.granting_actor_type ?? 'user',
				actorId: data.granting_actor_id,
				roleIds: [...group.roleIds],
				scope: group.scope
			})
		}

		return new StepResponse(void 0)
	}
)
