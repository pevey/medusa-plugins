import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Policy, WILDCARD, resolveActorHoldings, resolvePermissions } from 'medusa-plugin-access/utils'
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

	// Route through the resolver registry rather than querying assignments
	// directly, so this reports the same holdings the guard enforces against: a
	// `customer` holds roles through customer groups as well as directly, and
	// `api-key`'s actor type (`api-key`) is not its Query entity (`api_key`).
	const holdings = (await resolveActorHoldings(actorType, actorId, req.scope)) ?? []

	// `permissions`/`scoped` reflect unscoped holdings only — the pre-existing
	// contract. Tenancy-pinned holdings are summarized separately below.
	const roleIds = holdings.filter(holding => holding.scope === null).map(holding => holding.role_id)

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

	const byDimension = new Map<string, { ids: Set<string>; roles: Set<string> }>()
	for (const holding of holdings) {
		if (!holding.scope) {
			continue
		}
		let entry = byDimension.get(holding.scope.type)
		if (!entry) {
			entry = { ids: new Set(), roles: new Set() }
			byDimension.set(holding.scope.type, entry)
		}
		entry.ids.add(holding.scope.id)
		entry.roles.add(holding.role_id)
	}
	const tenancy = [...byDimension]
		.map(([type, entry]) => ({ type, ids: [...entry.ids].sort(), roles: [...entry.roles].sort() }))
		.sort((a, b) => a.type.localeCompare(b.type))

	res.status(200).json({ permissions, scoped, ...(tenancy.length ? { tenancy } : {}) })
}
