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
 * DEFECT #4 — the cache below is INERT and must not be naively enabled.
 * See REDESIGN.md §6 ("#4 is larger than it looks"). Blocks Phase 3.
 *
 * `useCache` short-circuits without `enable: true`, so today every permission
 * check is a fresh query. Adding `enable: true` ALONE is a security regression:
 *
 *   1. Tag mismatch. The caching strategy derives tags as `AccessRole:<id>`
 *      (upperCaseFirst(toCamelCase(entityType)) from the event name). The tags
 *      built below are `access_role:<id>` — they would never match, so nothing
 *      would ever be cleared.
 *   2. No events. Auto-invalidation fires from an event-bus subscription on
 *      `*`. Nothing in this module emits on role / policy / role-policy /
 *      role-parent mutation, so no invalidation would occur at all.
 *
 * With the 7-day TTL below and neither addressed, a revoked role would stay
 * effective for a week. Complete fix: rename tags, emit mutation events,
 * shorten the TTL, enable, and test that a role change invalidates.
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

			tags.push(`access_role:${roleId}`)
			if (role?.policies && Array.isArray(role.policies)) {
				for (const policy of role.policies) {
					if (!resourceMap.has(policy.resource)) {
						resourceMap.set(policy.resource, new Set())
					}
					resourceMap.get(policy.resource)!.add(policy.operation)

					tags.push(`access_policy:${policy.id}`)
				}
			}

			return resourceMap
		},
		{
			container,
			key: roleId,
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
