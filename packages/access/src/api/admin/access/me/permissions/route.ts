import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Policy, WILDCARD, resolveActorRoles, resolvePermissions } from 'medusa-plugin-access/utils'
import { AdminAccessMePermissionsResponse } from '../../../../../admin/types'

/**
 * Returns the authenticated actor's effective permission set, with wildcards
 * already expanded. `permissions` lists only actions granted outright
 * (unrestricted) as flat `resource:operation` strings -- the pre-existing
 * cross-plugin contract other plugins' widgets read. `scoped` reports actions
 * granted only within a scope, kept out of `permissions` so a consumer that
 * cannot apply a filter (this is UI visibility, not enforcement -- the real
 * gate is server-side) does not mistake a scoped grant for an unrestricted
 * one. The "universe" is the union of code-registered policies (our `Policy`
 * registry) and distinct `(resource, operation)` rows in `access_policy`.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse<AdminAccessMePermissionsResponse>) => {
	const actorId = req.auth_context.actor_id
	const actorType = req.auth_context.actor_type

	if (!actorId || !actorType) {
		res.status(200).json({ permissions: [], scoped: [] })
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	// Route through the resolver registry rather than querying `access_roles`
	// directly, so this reports the same roles the guard enforces against: a
	// `customer` holds roles through customer groups as well as directly, and
	// `api-key`'s actor type (`api-key`) is not its Query entity (`api_key`).
	const roleIds = (await resolveActorRoles(actorType, actorId, req.scope)) ?? []

	const universe: Array<{ resource: string; operation: string }> = []
	const seen = new Set<string>()

	const consider = (resource?: string, operation?: string) => {
		if (!resource || !operation || resource === WILDCARD || operation === WILDCARD) {
			return
		}
		const key = `${resource}:${operation}`
		if (seen.has(key)) {
			return
		}
		seen.add(key)
		universe.push({ resource, operation })
	}

	for (const definition of Object.values(Policy)) {
		consider(definition?.resource, definition?.operation)
	}

	const { data: persistedPolicies } = await query.graph({
		entity: 'access_policy',
		fields: ['resource', 'operation']
	})

	for (const policy of persistedPolicies ?? []) {
		consider(policy?.resource, policy?.operation)
	}

	const granted = await resolvePermissions({
		roles: roleIds,
		universe,
		container: req.scope
	})

	const permissions = granted
		.filter(g => !g.scope)
		.map(g => `${g.resource}:${g.operation}`)
		.sort()

	const scoped = granted
		.filter((g): g is { resource: string; operation: string; scope: string } => !!g.scope)
		.sort((a, b) => `${a.resource}:${a.operation}:${a.scope}`.localeCompare(`${b.resource}:${b.operation}:${b.scope}`))

	res.status(200).json({ permissions, scoped })
}
