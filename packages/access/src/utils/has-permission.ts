import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, useCache } from '@medusajs/framework/utils'
import { WILDCARD } from './define-policies'

export type PermissionAction = {
	resource: string
	operation: string | string[]
}

export type HasPermissionInput = {
	roles: string | string[]
	actions: PermissionAction | PermissionAction[]
	container: MedusaContainer
}

export type ResolvePermissionsInput = {
	roles: string | string[]
	/**
	 * The universe of `(resource, operation)` tuples to evaluate against the
	 * actor's policies. The result is the subset granted, wildcards expanded.
	 */
	universe: { resource: string; operation: string }[]
	container: MedusaContainer
}

type RolePoliciesCache = Map<string, Map<string, Set<string>>>

/**
 * Wildcard-aware matching: does any of the roles grant `(resource, operation)`?
 * Single source of truth for `*:*` / `resource:*` / `*:op` semantics.
 */
function policyAllows(rolePoliciesMap: RolePoliciesCache, resource: string, operation: string): boolean {
	for (const resourceMap of rolePoliciesMap.values()) {
		const allowedOps = new Set([...(resourceMap.get(resource) || []), ...(resourceMap.get(WILDCARD) || [])])
		if (allowedOps.has(operation) || allowedOps.has(WILDCARD)) {
			return true
		}
	}
	return false
}

/**
 * Checks if the given role(s) may perform the specified action(s).
 * Enforcement is always active when the access module is loaded (no feature flag).
 */
export async function hasPermission(input: HasPermissionInput): Promise<boolean> {
	const { roles, actions, container } = input

	const roleIds = Array.isArray(roles) ? roles : [roles]
	const actionList = Array.isArray(actions) ? actions : [actions]

	if (!roleIds?.length || !actionList?.length) {
		return true
	}

	const rolePoliciesMap = await fetchRolePolicies(roleIds, container)

	for (const action of actionList) {
		const operations = Array.isArray(action.operation) ? action.operation : [action.operation]

		for (const op of operations) {
			if (!policyAllows(rolePoliciesMap, action.resource, op)) {
				return false
			}
		}
	}

	return true
}

/**
 * Resolves the actor's effective permission set: the subset of `universe`
 * granted, wildcards expanded. Inverse of {@link hasPermission}.
 */
export async function resolvePermissions(input: ResolvePermissionsInput): Promise<Set<string>> {
	const { roles, universe, container } = input

	const roleIds = Array.isArray(roles) ? roles : [roles]

	if (!roleIds.length) {
		return new Set()
	}

	const rolePoliciesMap = await fetchRolePolicies(roleIds, container)
	const granted = new Set<string>()

	for (const { resource, operation } of universe) {
		if (policyAllows(rolePoliciesMap, resource, operation)) {
			granted.add(`${resource}:${operation}`)
		}
	}

	return granted
}

/**
 * Fetches a single role's effective policies (incl. inherited) from cache or DB.
 * `access_role.policies` is replaced by real policy rows by the module service's
 * `listAccessRoles` override, so `policy.resource`/`policy.operation` are present.
 *
 * ---------------------------------------------------------------------------
 * DEFECT #4 — cache deliberately left OFF. See REDESIGN.md §6.
 *
 * A previous attempt enabled this with a short TTL. An adversarial review found
 * that attempt unsound, on premises that were checked and are false:
 *
 *   - "Events would have to be written." They already exist. `MedusaService`
 *     decorates every generated method with `@EmitEvents` and installs a global
 *     MikroORM subscriber, so AccessRole / AccessPolicy / AccessRolePolicy /
 *     AccessRoleParent mutations already emit `access.access-role.created` etc.
 *     Zero service methods need overriding.
 *   - "Matching core's tag derivation is fragile." It is four lines of
 *     deterministic string manipulation over names we control, and unit-testable.
 *   - "A TTL cannot fail silently." `Number('')` is 0, and node-cache treats a
 *     0 TTL as NEVER EXPIRES — so a declared-but-empty env var yields an
 *     unbounded cache, silently. The exact failure mode the TTL was chosen to
 *     avoid.
 *
 * It also shipped a regression: `providers: ['cache-memory']` is only
 * registered when a config sets `in_memory.enable`. apps/backend configures
 * Redis only, so the provider was unresolvable there — no caching at all, plus
 * error/warn logs on every check.
 *
 * The correct fix, when taken up:
 *   1. Request-scoped memoization first. The dominant cost is intra-request
 *      fan-out (the field filter calls hasPermission once per entity path), and
 *      memoizing the in-flight promise on `req.scope` collapses that with ZERO
 *      staleness. This may be the whole answer.
 *   2. Only then, if a cross-request cache is still wanted: cache a
 *      JSON-serializable shape (not a Map — it stringifies to `{}` and would
 *      500 on a Redis hit), drop the hardcoded provider so the configured
 *      default is used, and tag coarsely (`AccessRole:list:*` and friends) so
 *      the events that already fire do the invalidating.
 * ---------------------------------------------------------------------------
 */
async function fetchSingleRolePolicies(roleId: string, container: MedusaContainer): Promise<Map<string, Set<string>>> {
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	const tags: string[] = []
	return await useCache<Map<string, Set<string>>>(
		async () => {
			const { data: roles } = await query.graph({
				entity: 'access_role',
				fields: ['id', 'policies.*'],
				filters: { id: roleId }
			})

			const role = roles[0]
			const resourceMap = new Map<string, Set<string>>()

			tags.push(`AccessRole:${roleId}`)
			if (role?.policies && Array.isArray(role.policies)) {
				for (const policy of role.policies) {
					if (!resourceMap.has(policy.resource)) {
						resourceMap.set(policy.resource, new Set())
					}
					resourceMap.get(policy.resource)!.add(policy.operation)

					tags.push(`AccessPolicy:${policy.id}`)

					// A grant reaching this role through inheritance means an edit to the
					// ANCESTOR invalidates this entry too. `inherited_from_role_id` is
					// NULL for directly-held policies.
					if (policy.inherited_from_role_id) {
						tags.push(`AccessRole:${policy.inherited_from_role_id}`)
					}
				}
			}

			return resourceMap
		},
		{
			container,
			key: roleId,
			// Passed by reference on purpose: `useCache` reads options.tags again
			// after the callback resolves, and the pushes above happen inside it.
			// Snapshotting here (e.g. `Array.from(new Set(tags))`) yields an empty
			// list, because arguments are evaluated before the callback runs.
			tags,
			ttl: 60 * 60 * 24 * 7,
			providers: ['cache-memory']
		}
	)
}

/**
 * Fetches policies for multiple roles by composing individually cached queries.
 */
async function fetchRolePolicies(roleIds: string[], container: MedusaContainer): Promise<RolePoliciesCache> {
	const rolePoliciesMap: RolePoliciesCache = new Map()

	await Promise.all(
		roleIds.map(async roleId => {
			const resourceMap = await fetchSingleRolePolicies(roleId, container)
			rolePoliciesMap.set(roleId, resourceMap)
		})
	)

	return rolePoliciesMap
}
