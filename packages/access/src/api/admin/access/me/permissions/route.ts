import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Policy, WILDCARD, resolvePermissions } from 'medusa-plugin-access/utils'

/**
 * Returns the authenticated actor's effective permission set as a flat array
 * of `resource:operation` strings, with wildcards already expanded. The
 * "universe" is the union of code-registered policies (our `Policy` registry)
 * and distinct `(resource, operation)` rows in `access_policy`.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse<{ permissions: string[] }>) => {
	const actorId = req.auth_context.actor_id
	const actorType = req.auth_context.actor_type

	if (!actorId || !actorType) {
		res.status(200).json({ permissions: [] })
		return
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { data: actors } = await query.graph({
		entity: actorType,
		fields: ['id', 'access_roles.id'],
		filters: { id: actorId }
	})

	const roleIds: string[] = actors?.[0]?.access_roles?.map((r: { id: string }) => r.id).filter(Boolean) ?? []

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

	res.status(200).json({ permissions: Array.from(granted).sort() })
}
