import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export const getUsersToBootstrapStepId = 'get-users-to-bootstrap-access'

/**
 * Determines which users should be granted the seeded super-admin role on first
 * load. Returns an empty list (skip) when the store has already been bootstrapped
 * (any role assignment exists — including rows the link-table migration copied)
 * or when the super-admin role is missing.
 */
export const getUsersToBootstrapStep = createStep(
	getUsersToBootstrapStepId,
	async (_input: unknown, { container }): Promise<StepResponse<{ userIds: string[] }>> => {
		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		// Already bootstrapped? Any assignment means someone has a role.
		const { data: existingAssignments } = await query.graph({
			entity: 'access_role_assignment',
			fields: ['id'],
			pagination: { take: 1 }
		})
		if (existingAssignments?.length) {
			return new StepResponse({ userIds: [] })
		}

		// Super-admin role must exist (seeded by the module's initial-data loader).
		const { data: roles } = await query.graph({
			entity: 'access_role',
			fields: ['id'],
			filters: { id: 'acrl_super_admin' }
		})
		if (!roles?.length) {
			return new StepResponse({ userIds: [] })
		}

		const { data: users } = await query.graph({
			entity: 'user',
			fields: ['id']
		})

		return new StepResponse({
			userIds: (users ?? []).map((u: any) => u.id).filter(Boolean)
		})
	}
)
