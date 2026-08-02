import { resolvePermissions } from '../../../utils'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

/**
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export type GetAssignableRolesStepInput = {
	/**
	 * Actor ID whose assignability is evaluated.
	 */
	actor_id: string
	/**
	 * Actor entity name. Defaults to "user".
	 */
	actor?: string
	/**
	 * Optional filters forwarded to the `access_role` query (e.g. `q`, `id`).
	 */
	filters?: Record<string, unknown>
	/**
	 * Optional pagination forwarded to the `access_role` query.
	 */
	pagination?: { skip?: number; take?: number }
}

type AssignableRole = {
	id: string
	name: string
	description: string | null
}

/**
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export type GetAssignableRolesStepOutput = {
	roles: AssignableRole[]
	count: number
}

/**
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export const getAssignableRolesStepId = 'get-assignable-access-roles'

/**
 * Resolves the set of roles the actor is allowed to assign.
 *
 * @ignore
 * @featureFlag access
 * @since 2.16.0
 */
export const getAssignableRolesStep = createStep(
	getAssignableRolesStepId,
	async (data: GetAssignableRolesStepInput, { container }): Promise<StepResponse<GetAssignableRolesStepOutput>> => {
		const { actor_id, actor, filters, pagination } = data

		const query = container.resolve(ContainerRegistrationKeys.QUERY)

		const { data: actors } = await query.graph({
			entity: actor ?? 'user',
			fields: ['access_roles.id'],
			filters: { id: actor_id }
		})

		const actorRoleIds: string[] = actors?.[0]?.access_roles?.map((r: any) => r.id).filter(Boolean) ?? []

		if (!actorRoleIds.length) {
			return new StepResponse({ roles: [], count: 0 })
		}

		// Candidates are fetched unpaginated so `count` reflects the whole assignable set rather
		// than the assignable subset of one page; pagination is applied after filtering, matching
		// `getAssignablePoliciesStep`.
		const { data: candidates } = await query.graph({
			entity: 'access_role',
			fields: ['id', 'name', 'description', 'policies.resource', 'policies.operation'],
			filters: filters ?? {}
		})

		const roleActions = new Map<string, { resource: string; operation: string }[]>()
		const universe: { resource: string; operation: string }[] = []

		for (const role of candidates ?? []) {
			const actions = (role.policies ?? [])
				.filter((p: any) => p.resource != null && p.operation != null)
				.map((p: any) => ({ resource: p.resource as string, operation: p.operation as string }))

			roleActions.set(role.id, actions)
			universe.push(...actions)
		}

		// One resolution over the union of every candidate's actions, rather than a
		// `hasPermission` call per candidate.
		const granted = await resolvePermissions({ roles: actorRoleIds, universe, container })

		const assignable: AssignableRole[] = []

		for (const role of candidates ?? []) {
			const actions = roleActions.get(role.id) ?? []
			const allowed = actions.every(a => granted.has(`${a.resource}:${a.operation}`))

			if (allowed) {
				assignable.push({
					id: role.id,
					name: role.name,
					description: role.description ?? null
				})
			}
		}

		const { skip = 0, take } = pagination ?? {}
		const page = typeof take === 'number' ? assignable.slice(skip, skip + take) : assignable.slice(skip)

		return new StepResponse({ roles: page, count: assignable.length })
	}
)
