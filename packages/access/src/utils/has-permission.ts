import { MedusaContainer } from '@medusajs/framework/types'
import { useCache } from '@medusajs/framework/utils'
import { WILDCARD } from './define-policies'
import { resolveUnscopedQuery } from './scoped-query'

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

export type ScopeRequirement = { resource: string; scope: string }

export type AccessDecision = { granted: false; missing: PermissionAction[] } | { granted: true; scopes: ScopeRequirement[] }

/**
 * One granted `(resource, operation)` pair. No `scope` means granted outright
 * (unrestricted); `scope` set means granted only within that scope. The same
 * pair can appear more than once when two different scopes are each granted
 * by a different role (union, same rule {@link authorize} follows) — never
 * both a scoped and the unrestricted form at once, since an unrestricted
 * grant always wins for that pair.
 */
export type ResolvedPermission = { resource: string; operation: string; scope?: string }

/**
 * Per role: resource -> operation -> set of scopes granted for that
 * (resource, operation). `null` in the set is the unrestricted marker — a
 * grant with no scope column set, or a wildcard grant (which is always
 * unrestricted).
 */
type RolePoliciesCache = Map<string, Map<string, Map<string, Set<string | null>>>>

/**
 * Marks a container as request-scoped, opting it into per-request memoization
 * of role→policy resolution.
 *
 * Opt-in rather than automatic because `hasPermission` is also called with the
 * ROOT container (jobs, subscribers, CLI). Memoizing there would persist for the
 * process lifetime — an unbounded stale cache, which is the failure mode we are
 * explicitly avoiding.
 */
const REQUEST_SCOPE = Symbol.for('access.requestScope')

/** In-flight promise per (request scope, role). */
const requestMemo = new WeakMap<object, Map<string, Promise<Map<string, Map<string, Set<string | null>>>>>>()

/** Called once per request by the guard; see {@link REQUEST_SCOPE}. */
export function markRequestScope(container: MedusaContainer): void {
	;(container as any)[REQUEST_SCOPE] = true
}

function memoFor(container: MedusaContainer): Map<string, Promise<Map<string, Map<string, Set<string | null>>>>> | undefined {
	if (!(container as any)?.[REQUEST_SCOPE]) {
		return undefined
	}
	let memo = requestMemo.get(container as unknown as object)
	if (!memo) {
		memo = new Map()
		requestMemo.set(container as unknown as object, memo)
	}
	return memo
}

/**
 * Scope-aware matching: the set of scopes across all roles that grant
 * `(resource, operation)`. `null` in the returned set is the unrestricted
 * marker.
 *
 * A wildcard grant (`resource === WILDCARD` or `operation === WILDCARD`) is
 * always unrestricted, so its unrestricted (`null`) contribution is honoured
 * but a scope stored on a wildcard grant is ignored entirely rather than
 * treated as unrestricted — a stored value we refuse to create at assignment
 * time must never widen access here.
 */
function scopesGranted(rolePoliciesMap: RolePoliciesCache, resource: string, operation: string): Set<string | null> {
	const scopes = new Set<string | null>()

	for (const resourceMap of rolePoliciesMap.values()) {
		for (const matchedResource of new Set([resource, WILDCARD])) {
			const opsMap = resourceMap.get(matchedResource)
			if (!opsMap) continue

			for (const matchedOperation of new Set([operation, WILDCARD])) {
				const scopeSet = opsMap.get(matchedOperation)
				if (!scopeSet) continue

				const isWildcardGrant = matchedResource === WILDCARD || matchedOperation === WILDCARD
				for (const scope of scopeSet) {
					if (isWildcardGrant) {
						if (scope === null) {
							scopes.add(null)
						}
						// else: a scope stored on a wildcard grant — ignored entirely, per rule 3.
					} else {
						scopes.add(scope)
					}
				}
			}
		}
	}

	return scopes
}

/**
 * Resolves the scoped access decision for the given role(s) and action(s).
 * Enforcement is always active when the access module is loaded (no feature flag).
 *
 * For each action, every operation must be granted (AND across operations —
 * the same requirement a route's multi-op declaration like `product:[create,
 * update]` has always carried). A grant of `null` scope (including any
 * wildcard grant) is unrestricted and wins over a scoped grant for the same
 * `(resource, operation)` — holding both `@own` and unrestricted is
 * unrestricted. Otherwise every distinct scope granted for the action is
 * reported; scopes from different actions/operations are unioned, never
 * "first match wins" (see Task 1: two ancestor roles can grant the same
 * policy at different scopes).
 */
export async function authorize(input: HasPermissionInput): Promise<AccessDecision> {
	const { roles, actions, container } = input

	const roleIds = Array.isArray(roles) ? roles : [roles]
	const actionList = Array.isArray(actions) ? actions : [actions]

	// Nothing required => nothing to check.
	if (!actionList?.length) {
		return { granted: true, scopes: [] }
	}

	// No roles => no grants => cannot satisfy a requirement. See the historical
	// note this replaced: an empty role list previously granted `true`, which
	// `accessGuard` happened to compensate for but direct callers did not.
	if (!roleIds?.length) {
		return { granted: false, missing: actionList }
	}

	const rolePoliciesMap = await fetchRolePolicies(roleIds, container)

	const missing: PermissionAction[] = []
	const scopesByResource = new Map<string, Set<string>>()

	for (const action of actionList) {
		const operations = Array.isArray(action.operation) ? action.operation : [action.operation]

		let denied = false
		const scopeNamesForAction = new Set<string>()

		for (const op of operations) {
			const scopes = scopesGranted(rolePoliciesMap, action.resource, op)

			if (!scopes.size) {
				denied = true
				break
			}

			// `null` (unrestricted) present means this operation needs no filter,
			// regardless of any scoped grants also held for it — an unrestricted
			// grant always wins for that operation.
			if (!scopes.has(null)) {
				for (const scope of scopes) {
					scopeNamesForAction.add(scope as string)
				}
			}
		}

		if (denied) {
			missing.push(action)
			continue
		}

		if (scopeNamesForAction.size) {
			if (!scopesByResource.has(action.resource)) {
				scopesByResource.set(action.resource, new Set())
			}
			const resourceScopes = scopesByResource.get(action.resource)!
			for (const scope of scopeNamesForAction) {
				resourceScopes.add(scope)
			}
		}
	}

	if (missing.length) {
		return { granted: false, missing }
	}

	const scopes: ScopeRequirement[] = []
	for (const [resource, scopeNames] of scopesByResource) {
		for (const scope of scopeNames) {
			scopes.push({ resource, scope })
		}
	}

	return { granted: true, scopes }
}

/**
 * Checks if the given role(s) may perform the specified action(s) WITHOUT
 * restriction. Strict by design: a scoped grant (e.g. `customer:delete@own`)
 * returns `false` here, because a boolean caller has no way to apply the
 * filter that scope implies. Callers that can apply a filter should call
 * {@link authorize} directly and act on `scopes`.
 */
export async function hasPermission(input: HasPermissionInput): Promise<boolean> {
	const decision = await authorize(input)
	return decision.granted && decision.scopes.length === 0
}

/**
 * Resolves the actor's effective permission set: the subset of `universe`
 * granted, wildcards expanded, each entry annotated with scope. Scope-aware
 * counterpart to {@link authorize}, evaluated over a universe of pairs rather
 * than a fixed list of required actions.
 */
export async function resolvePermissions(input: ResolvePermissionsInput): Promise<ResolvedPermission[]> {
	const { roles, universe, container } = input

	const roleIds = Array.isArray(roles) ? roles : [roles]

	if (!roleIds.length) {
		return []
	}

	const rolePoliciesMap = await fetchRolePolicies(roleIds, container)
	const granted: ResolvedPermission[] = []

	for (const { resource, operation } of universe) {
		const scopes = scopesGranted(rolePoliciesMap, resource, operation)

		if (!scopes.size) {
			continue
		}

		if (scopes.has(null)) {
			granted.push({ resource, operation })
		} else {
			for (const scope of scopes) {
				granted.push({ resource, operation, scope: scope as string })
			}
		}
	}

	return granted
}

/**
 * Whether granting `(resource, operation)` at `targetScope` is authorized by
 * `granted` — the actor's own effective permission set, as returned by
 * {@link resolvePermissions}. This is the "you may only grant what you hold"
 * rule extended with scope: unrestricted is strictly broader than any scope,
 * and two different named scopes are incomparable (holding `@own` does not
 * permit granting `@company`).
 *
 * - `targetScope` undefined means granting UNRESTRICTED: only an unrestricted
 *   entry in `granted` satisfies it.
 * - `targetScope` a name means granting AT that scope: an unrestricted entry
 *   satisfies it (broader always wins), or an entry scoped to exactly that
 *   name.
 *
 * The single exported helper for this comparison — used by
 * `get-assignable-policies`, `get-assignable-roles`, and
 * `validate-user-role-permissions` alike, so the rule cannot drift between
 * the three call sites.
 */
export function canGrantScope(granted: ResolvedPermission[], resource: string, operation: string, targetScope?: string): boolean {
	for (const entry of granted) {
		if (entry.resource !== resource || entry.operation !== operation) {
			continue
		}
		if (entry.scope === undefined) {
			return true
		}
		if (targetScope !== undefined && entry.scope === targetScope) {
			return true
		}
	}
	return false
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
async function fetchSingleRolePolicies(roleId: string, container: MedusaContainer): Promise<Map<string, Map<string, Set<string | null>>>> {
	// Store the in-flight PROMISE, not the result: the field filter calls
	// hasPermission once per entity path and those fire concurrently, so caching
	// only on completion would still let N identical queries start.
	const memo = memoFor(container)
	const inFlight = memo?.get(roleId)
	if (inFlight) {
		return inFlight
	}

	const pending = fetchSingleRolePoliciesUncached(roleId, container)
	memo?.set(roleId, pending)
	return pending
}

async function fetchSingleRolePoliciesUncached(roleId: string, container: MedusaContainer): Promise<Map<string, Map<string, Set<string | null>>>> {
	const query = resolveUnscopedQuery(container)

	const tags: string[] = []
	return await useCache<Map<string, Map<string, Set<string | null>>>>(
		async () => {
			const { data: roles } = await query.graph({
				entity: 'access_role',
				// The `fields` list below is NOT what makes `scope` arrive: the module
				// service's `listAccessRoles` override (src/modules/access/service.ts)
				// replaces `role.policies` wholesale with rows from the repository's
				// raw recursive-CTE query (src/modules/access/repositories/access.ts),
				// which `SELECT`s `rp.scope` unconditionally regardless of what's
				// requested here -- the same mechanism that already carries
				// `resource`/`operation` (columns of `AccessPolicy`, not of the
				// `AccessRolePolicy` relation `policies` is declared against) and
				// `inherited_from_role_id` (a synthetic CASE column on no model at
				// all). `policies.scope` is listed here as belt-and-braces
				// documentation of intent only, not as the thing keeping this working;
				// integration coverage (see "pins the query.graph -> authorize chain
				// end to end" in access.spec.ts) is what actually guards this.
				fields: ['id', 'policies.*', 'policies.scope'],
				filters: { id: roleId }
			})

			const role = roles[0]
			const resourceMap = new Map<string, Map<string, Set<string | null>>>()

			tags.push(`AccessRole:${roleId}`)
			if (role?.policies && Array.isArray(role.policies)) {
				for (const policy of role.policies) {
					if (!resourceMap.has(policy.resource)) {
						resourceMap.set(policy.resource, new Map())
					}
					const opsMap = resourceMap.get(policy.resource)!
					if (!opsMap.has(policy.operation)) {
						opsMap.set(policy.operation, new Set())
					}
					opsMap.get(policy.operation)!.add(policy.scope ?? null)

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
