import { canGrantScope, resolveActorRoles, resolvePermissions } from '../../../utils'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 * @since 2.16.0
 */
export type GetAssignablePoliciesStepInput = {
	/**
	 * Actor ID whose assignability is evaluated.
	 */
	actor_id: string
	/**
	 * Actor entity name. Defaults to "user".
	 */
	actor?: string
	/**
	 * Optional filters forwarded to the `access_policy` query (e.g. `q`, `id`, `resource`, `operation`).
	 */
	filters?: Record<string, unknown>
	/**
	 * Optional pagination applied to the assignable subset after permission resolution.
	 */
	pagination?: { skip?: number; take?: number }
}

type AssignablePolicy = {
	id: string
	key: string
	resource: string
	operation: string
	description: string | null
}

/**
 * @ignore
 * @since 2.16.0
 */
export type GetAssignablePoliciesStepOutput = {
	policies: AssignablePolicy[]
	count: number
}

/**
 * @ignore
 * @since 2.16.0
 */
export const getAssignablePoliciesStepId = 'get-assignable-access-policies'

/**
 * Resolves the set of policies the actor is allowed to assign.
 *
 * @ignore
 * @since 2.16.0
 */
export const getAssignablePoliciesStep = createStep(
	getAssignablePoliciesStepId,
	async (data: GetAssignablePoliciesStepInput, { container }): Promise<StepResponse<GetAssignablePoliciesStepOutput>> => {
		const { actor_id, actor, filters, pagination } = data

		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		// Route through the resolver registry rather than querying `access_roles`
		// directly: a `customer` holds roles through customer groups as well as
		// directly, and `api-key`'s actor type is not its Query entity name.
		const actorRoleIds = await resolveActorRoles(actor ?? 'user', actor_id, container)

		if (!actorRoleIds?.length) {
			return new StepResponse({ policies: [], count: 0 })
		}

		const { data: candidates } = await query.graph({
			entity: 'access_policy',
			fields: ['id', 'key', 'resource', 'operation', 'description'],
			filters: {
				...(filters ?? {}),
				resource: { $ne: null },
				operation: { $ne: null }
			}
		})

		const granted = await resolvePermissions({
			roles: actorRoleIds,
			universe: (candidates ?? []).map((p: any) => ({
				resource: p.resource as string,
				operation: p.operation as string
			})),
			container
		})

		// `POST /admin/access/roles/:id/policies` accepts either a bare policy id
		// (unrestricted) or `{ id, scope }`, so a policy is assignable if the actor
		// can grant it at ANY scope they hold -- unrestricted, or at one of their
		// own scopes. Listing only unrestricted-grantable policies would hide a
		// policy the actor can legitimately assign scoped, since `canGrantScope`
		// on the assignment path allows exactly that.
		const assignable: AssignablePolicy[] = []
		for (const policy of candidates ?? []) {
			const scopesHeld = granted.filter(g => g.resource === policy.resource && g.operation === policy.operation).map(g => g.scope)
			const grantable = scopesHeld.some(scope => canGrantScope(granted, policy.resource, policy.operation, scope))

			if (grantable) {
				assignable.push({
					id: policy.id,
					key: policy.key,
					resource: policy.resource,
					operation: policy.operation,
					description: policy.description ?? null
				})
			}
		}

		const { skip = 0, take } = pagination ?? {}
		const page = typeof take === 'number' ? assignable.slice(skip, skip + take) : assignable.slice(skip)

		return new StepResponse({ policies: page, count: assignable.length })
	}
)
