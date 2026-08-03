import { MiddlewareRoute } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { PermissionAction } from './has-permission'

/**
 * A registered route→policy requirement. Populated at module-load time via
 * {@link requirePolicies} / {@link registerRoutePolicies} and read per-request
 * by the access guard middleware. Stored on `global` so our own routes, ported
 * core-route mappings, and third-party plugins all share one registry.
 */
/**
 * Where a declaration came from, which decides whether it can be reported as
 * rotted. Only `explicit` can: `guardResource` emits a whole CRUD surface and
 * the core-route map spans more than one Medusa version, so unmatched entries
 * from either are protective rather than stale.
 */
export type GuardSource = 'explicit' | 'guardResource' | 'core-map'

type RouteGuard = {
	/** Source pattern, retained so drift against real routes can be reported. */
	matcher: string
	regex: RegExp
	methods: string[]
	policies: PermissionAction[]
	/**
	 * How this guard was declared. `guardResource` emits a complete CRUD surface
	 * on purpose, so its entries matching no route are expected — protective
	 * rather than rotted — and are excluded from drift reporting.
	 */
	source: GuardSource
	/**
	 * Opt-in for a mutating route whose policies already account for row-level
	 * scope, so a scoped actor is admitted instead of blocked outright. Read by
	 * the request guard; this module only stores and matches it.
	 */
	assertsScope?: boolean
}

declare global {
	// eslint-disable-next-line no-var
	var AccessRouteGuards: RouteGuard[] | undefined
	// eslint-disable-next-line no-var
	var AccessSealedNamespaces: string[] | undefined
}

global.AccessRouteGuards ??= []
global.AccessSealedNamespaces ??= []

const ALL_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

/**
 * Compile an Express-style matcher (`/admin/access/roles/:id`, `/*`) into
 * an anchored RegExp for request-path matching. The guard itself mounts on
 * `/*` (every request the app serves); matchers declared against it can
 * target any prefix, not only `/admin`.
 *
 * Case-insensitive on purpose. Express is configured with neither
 * `case sensitive routing` nor `strict routing`, so it happily routes
 * `/admin/Complaints/abc` to the `/admin/complaints/:id` handler. A
 * case-sensitive guard would miss that and fail open — capitalisation alone
 * would bypass both the policy check and `sealNamespace`.
 */
function toPattern(matcher: string): string {
	return normalizePath(matcher)
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/:[A-Za-z0-9_]+/g, '[^/]+')
		.replace(/\*/g, '.*')
}

/**
 * `exclude` compiles to leading negative lookaheads, which is what lets a guard
 * cover a subtree *except* for named paths beneath it. Layering a second guard
 * on the exception cannot express this: {@link matchRoutePolicies} unions every
 * match and the guard ANDs them, so the excepted path would require both the
 * subtree's operation and its own. The exclusion has to come out of the floor.
 *
 * `(?:/|$)` bounds each exclusion on a segment, so excluding `pdf-export` does
 * not also exclude `pdf-export-log`.
 */
function compileMatcher(matcher: string, exclude: string[] = []): RegExp {
	const lookaheads = exclude.map(path => `(?!${toPattern(path)}(?:/|$))`).join('')
	return new RegExp(`^${lookaheads}${toPattern(matcher)}$`, 'i')
}

/**
 * Canonical form of a request path or matcher for comparison.
 *
 * Strips a trailing slash (Express routes `/admin/access/roles/` to the
 * `/admin/access/roles` handler; a guard that misses it fails open) and
 * collapses duplicate slashes. Case is handled by the `i` flag rather than
 * lowercasing, so matcher text stays readable in drift reports.
 */
export function normalizePath(path: string): string {
	const collapsed = path.replace(/\/{2,}/g, '/')
	return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed
}

function registerGuard(input: {
	matcher: string
	method?: string | string[]
	policies: PermissionAction | PermissionAction[]
	source: GuardSource
	assertsScope?: boolean
	exclude?: string[]
}): void {
	const methods = (Array.isArray(input.method) ? input.method : input.method ? [input.method] : ALL_METHODS).map(m => m.toUpperCase())

	const policies = Array.isArray(input.policies) ? input.policies : [input.policies]

	global.AccessRouteGuards!.push({
		matcher: input.matcher,
		regex: compileMatcher(input.matcher, input.exclude),
		methods,
		policies,
		source: input.source,
		assertsScope: input.assertsScope
	})
}

/**
 * Declare the policies required to access a route. Any plugin can call this to
 * make our global guard enforce their route.
 *
 * `source` is deliberately not an input: it drives drift reporting, and a
 * declaration that could label itself `guardResource` could exempt itself from
 * being reported as rotted.
 */
export function requirePolicies(input: {
	matcher: string
	method?: string | string[]
	policies: PermissionAction | PermissionAction[]
	assertsScope?: boolean
}): void {
	registerGuard({ ...input, source: 'explicit' })
}

/**
 * Register declarations about Medusa's own admin routes — the pinned core map
 * and the hand-written supplements that fill its gaps.
 *
 * Separate from {@link requirePolicies} so these carry a `core-map` source:
 * both describe routes this package does not own, across a peer range spanning
 * more than one Medusa version, so an entry matching no route in the installed
 * version is expected rather than rotted and must not be reported as drift.
 */
export function registerCoreRoutePolicies(entries: { matcher: string; methods?: string[]; policies: PermissionAction[] }[]): void {
	for (const entry of entries) {
		registerGuard({ matcher: entry.matcher, method: entry.methods, policies: entry.policies, source: 'core-map' })
	}
}

/**
 * A `MiddlewareRoute` carrying this plugin's own co-located policy declaration.
 *
 * Deliberately NOT core's `policies` field: that one belongs to core RBAC, and
 * its only consumer is `wrapWithPoliciesCheck`, which reads roles from the JWT's
 * `app_metadata`. This plugin resolves roles live from links instead, so if core's
 * `rbac` flag were ever enabled it would wrap these routes and 403 every one of
 * them. Using our own key keeps the two systems from colliding.
 */
export type AccessMiddlewareRoute = MiddlewareRoute & {
	accessPolicies?: PermissionAction | PermissionAction[]
	/**
	 * Opt a scoped mutation in from the co-located declaration. Without it a
	 * scoped actor is denied at the door on any mutating method, so a route
	 * declared this way had no way to express intent short of a second,
	 * free-standing {@link requirePolicies} call.
	 */
	assertsScope?: boolean
}

/**
 * Bulk-register the `accessPolicies` declared on a `MiddlewareRoute[]` (e.g. the
 * array a plugin passes to `defineMiddlewares`) into the guard registry — so the
 * co-located declarations become live enforcement.
 */
export function registerRoutePolicies(routes: AccessMiddlewareRoute[]): void {
	for (const route of routes) {
		if (!route.accessPolicies) {
			continue
		}
		const policies = Array.isArray(route.accessPolicies) ? route.accessPolicies : [route.accessPolicies]
		const method = (route as { method?: string | string[] }).method ?? (route as { methods?: string | string[] }).methods

		requirePolicies({
			matcher: String(route.matcher),
			method,
			policies: policies as PermissionAction[],
			assertsScope: route.assertsScope
		})
	}
}

/**
 * Declare the whole CRUD surface of a resource in one call.
 *
 * Generates a collection-level rule per method plus a `/*` subtree floor, so
 * sub-resources (`/admin/complaints/:id/notes`) are covered by default instead
 * of silently failing open. Matchers are anchored, so a declaration on
 * `/admin/complaints/:id` would NOT cover anything deeper — that asymmetry is
 * what this exists to remove.
 *
 * POST on the subtree maps to `update`, not `create`: `POST /x/:id/notes`
 * creates a note but is modifying the parent. `create` is reserved for
 * `POST /x` — creating the resource itself.
 *
 * Because {@link matchRoutePolicies} returns the union of every matching guard
 * and all of them must pass, a more specific `requirePolicies` layered on top
 * makes a route STRICTER, never looser. Coarse→fine tightening is safe;
 * fine→coarse would be a silent widening.
 *
 * `exports` names subtree paths, relative to the prefix, that require the
 * `export` operation *instead of* the method-derived floor — so an actor
 * holding `complaint:export` but not `complaint:update` can reach
 * `POST /admin/complaints/pdf-export`. An explicit list rather than sniffing
 * names for `export`: a convention would guess, a list states intent.
 */
export function guardResource(input: { resource: string; prefix: string; assertsScope?: boolean; exports?: string[] }): void {
	const { resource, assertsScope } = input
	const prefix = normalizePath(input.prefix)
	const subtree = `${prefix}/*`

	const source = 'guardResource' as const

	const exportPaths = (input.exports ?? []).map(path => normalizePath(`${prefix}/${path.replace(/^\//, '')}`))
	const exclude = exportPaths.length ? exportPaths : undefined

	registerGuard({ matcher: prefix, method: ['GET'], policies: [{ resource, operation: 'read' }], source, assertsScope })
	registerGuard({ matcher: prefix, method: ['POST'], policies: [{ resource, operation: 'create' }], source, assertsScope })
	registerGuard({ matcher: prefix, method: ['PUT', 'PATCH'], policies: [{ resource, operation: 'update' }], source, assertsScope })
	registerGuard({ matcher: prefix, method: ['DELETE'], policies: [{ resource, operation: 'delete' }], source, assertsScope })

	registerGuard({ matcher: subtree, method: ['GET'], policies: [{ resource, operation: 'read' }], source, assertsScope, exclude })
	registerGuard({ matcher: subtree, method: ['POST', 'PUT', 'PATCH'], policies: [{ resource, operation: 'update' }], source, assertsScope, exclude })
	registerGuard({ matcher: subtree, method: ['DELETE'], policies: [{ resource, operation: 'delete' }], source, assertsScope, exclude })

	for (const path of exportPaths) {
		// Every method: the carve-out removed this path from the floor entirely,
		// so anything not declared here would fail open rather than fall back.
		registerGuard({ matcher: `${path}/*`, policies: [{ resource, operation: 'export' }], source, assertsScope })
		registerGuard({ matcher: path, policies: [{ resource, operation: 'export' }], source, assertsScope })
	}
}

/**
 * Opt a prefix you own into fail-closed: any request under it with no matching
 * guard is denied instead of passing through.
 *
 * The global default stays fail-open, because third-party routes cannot be
 * assumed access-aware. Sealing is a statement about a namespace you control —
 * and it is binding on anyone who later extends that prefix, who will get a 403
 * until they declare a policy.
 *
 * Order-independent: this writes to its own registry and the check happens
 * per-request, so module load order across plugins cannot affect it.
 */
export function sealNamespace(prefix: string): void {
	const normalized = normalizePath(prefix)
	if (normalized === '' || normalized === '/') {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `sealNamespace: "${prefix}" is not a valid prefix. Seal a specific path such as /admin or /store.`)
	}
	if (!global.AccessSealedNamespaces!.includes(normalized)) {
		global.AccessSealedNamespaces!.push(normalized)
	}
}

/**
 * Prefixes a seal can never cover. Sealing `/auth` would 403 the login
 * endpoints, locking every actor out with no in-band recovery.
 */
export const SEAL_EXEMPT_PREFIXES = ['/auth'] as const

/**
 * Whether `candidate` falls under `prefix` on a segment boundary rather than
 * string prefix — `/admin/order` must not also match `/admin/orders`. Shared
 * by `isPathSealed`, {@link route-coverage.ts}'s coverage matching, and the
 * guard's actor-authenticator dispatch, so the boundary rule lives in exactly
 * one place.
 */
export function matchesPrefixOnSegmentBoundary(candidate: string, prefix: string): boolean {
	return prefix === '/' || candidate === prefix || candidate.startsWith(`${prefix}/`)
}

/**
 * Whether `path` falls under a sealed namespace.
 *
 * Matching is on segment boundaries, not string prefix: sealing `/admin/order`
 * must not also seal `/admin/orders`.
 */
export function isPathSealed(path: string): boolean {
	const candidate = normalizePath(path).toLowerCase()

	if (SEAL_EXEMPT_PREFIXES.some(exempt => matchesPrefixOnSegmentBoundary(candidate, exempt))) {
		return false
	}

	return (global.AccessSealedNamespaces ?? []).some(prefix => matchesPrefixOnSegmentBoundary(candidate, prefix.toLowerCase()))
}

/** Every registered guard, for drift reporting. */
export function listRouteGuards(): { matcher: string; methods: string[]; regex: RegExp; source: GuardSource }[] {
	return (global.AccessRouteGuards ?? []).map(({ matcher, methods, regex, source }) => ({ matcher, methods, regex, source }))
}

/**
 * Declarations requiring this exact `(resource, operation)` grant.
 *
 * Exact only: a wildcard declaration does not count as requiring a specific
 * operation, because it is satisfied by any grant on the resource and so is not
 * affected when one particular operation turns out to be unholdable.
 *
 * Exists so a policy that was refused registration can be reported against the
 * routes it leaves stranded — the registry lives here, so the matching does too.
 */
export function findGuardsRequiring(resource: string, operation: string): { matcher: string; methods: string[] }[] {
	return (global.AccessRouteGuards ?? [])
		.filter(guard =>
			guard.policies.some(action => {
				if (action.resource !== resource) {
					return false
				}
				const operations = Array.isArray(action.operation) ? action.operation : [action.operation]
				return operations.includes(operation)
			})
		)
		.map(({ matcher, methods }) => ({ matcher, methods }))
}

type GuardIndex = { bySegment: Map<string, RouteGuard[]>; unindexed: RouteGuard[] }

let indexCache: GuardIndex | undefined
let indexedRef: RouteGuard[] | undefined
let indexedCount = -1

/**
 * The literal first path segment of a matcher, or undefined when the segment
 * contains a wildcard or a param and therefore cannot be bucketed.
 *
 * `includes(':')`, not `startsWith(':')`: compileMatcher replaces `:param`
 * anywhere in the string, so `/user:id/x` compiles to `^/user[^/]+/x$`. Bucketing
 * that under the literal `user:id` would hide it from every request that matches
 * it — a fail-open miss the unindexed list exists to prevent.
 *
 * `.toUpperCase()`, not `.toLowerCase()`: `guard.regex` matches with the `i`
 * flag, and RegExp's case-insensitive canonicalization is `toUpperCase`-based.
 * The two fold different character sets for some non-ASCII code points (e.g.
 * U+00B5 MICRO SIGN vs U+03BC GREEK SMALL LETTER MU both uppercase to U+039C
 * but lowercase to themselves) — a `.toLowerCase()` bucket key could diverge
 * from what `guard.regex.test` considers equal and silently miss a guard.
 * `.toUpperCase()` makes the bucket a conservative superset of what the regex
 * matches: it may over-include (harmless — `guard.regex.test` still filters
 * the candidates) but can never under-include and fail open.
 */
function indexableSegment(matcher: string): string | undefined {
	const normalized = normalizePath(matcher)
	if (!normalized.startsWith('/')) {
		return undefined
	}
	const segment = normalized.slice(1).split('/')[0]
	if (!segment || segment.includes('*') || segment.includes(':')) {
		return undefined
	}
	return segment.toUpperCase()
}

function getIndex(): GuardIndex {
	const guards = global.AccessRouteGuards!
	if (indexCache && indexedRef === guards && indexedCount === guards.length) {
		return indexCache
	}

	const bySegment = new Map<string, RouteGuard[]>()
	const unindexed: RouteGuard[] = []

	for (const guard of guards) {
		const segment = indexableSegment(guard.matcher)
		if (!segment) {
			unindexed.push(guard)
			continue
		}
		const bucket = bySegment.get(segment)
		if (bucket) {
			bucket.push(guard)
		} else {
			bySegment.set(segment, [guard])
		}
	}

	indexCache = { bySegment, unindexed }
	indexedRef = guards
	indexedCount = guards.length
	return indexCache
}

/**
 * Yield every registered guard matching `path`+`method`, in the same order
 * `matchRoutePolicies` has always checked them. Shared so it and
 * `routeAssertsScopes` cannot drift onto different matching rules.
 */
function* matchingGuards(path: string, method: string): Generator<RouteGuard> {
	// Express dispatches HEAD to the GET handler, so a HEAD request must carry
	// the GET requirement or it is an unauthenticated existence oracle.
	const upper = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase()
	const candidate = normalizePath(path)
	const index = getIndex()
	const segment = indexableSegment(candidate)

	const matches = (guard: RouteGuard) => guard.methods.includes(upper) && guard.regex.test(candidate)

	if (segment) {
		// Two sequential loops instead of spreading both lists into a fresh
		// array — this runs on every request after the mount widened to `/*`,
		// so the per-call allocation of a 351-element array is worth avoiding.
		// Order still matters: bucketed guards must be checked before
		// unindexed ones, matching the old concatenation order.
		const bucket = index.bySegment.get(segment)
		if (bucket) {
			for (const guard of bucket) {
				if (matches(guard)) {
					yield guard
				}
			}
		}
		for (const guard of index.unindexed) {
			if (matches(guard)) {
				yield guard
			}
		}
	} else {
		for (const guard of global.AccessRouteGuards ?? []) {
			if (matches(guard)) {
				yield guard
			}
		}
	}
}

/**
 * Return the union of policies required for `path`+`method` across all
 * registered guards (empty ⇒ the route is unguarded).
 */
export function matchRoutePolicies(path: string, method: string): PermissionAction[] {
	const out: PermissionAction[] = []
	for (const guard of matchingGuards(path, method)) {
		out.push(...guard.policies)
	}
	return out
}

/**
 * Whether any guard matching `path`+`method` opted into `assertsScope`.
 */
export function routeAssertsScopes(path: string, method: string): boolean {
	for (const guard of matchingGuards(path, method)) {
		if (guard.assertsScope) {
			return true
		}
	}
	return false
}
