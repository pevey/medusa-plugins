import { MiddlewareRoute } from '@medusajs/framework/http'
import { PermissionAction } from './has-permission'

/**
 * A registered route→policy requirement. Populated at module-load time via
 * {@link requirePolicies} / {@link registerRoutePolicies} and read per-request
 * by the access guard middleware. Stored on `global` so our own routes, ported
 * core-route mappings, and third-party plugins all share one registry.
 */
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
	source: 'explicit' | 'guardResource'
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
 * Compile an Express-style matcher (`/admin/access/roles/:id`, `/admin/*`) into
 * an anchored RegExp for request-path matching.
 *
 * Case-insensitive on purpose. Express is configured with neither
 * `case sensitive routing` nor `strict routing`, so it happily routes
 * `/admin/Complaints/abc` to the `/admin/complaints/:id` handler. A
 * case-sensitive guard would miss that and fail open — capitalisation alone
 * would bypass both the policy check and `sealNamespace`.
 */
function compileMatcher(matcher: string): RegExp {
	const pattern = normalizePath(matcher)
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/:[A-Za-z0-9_]+/g, '[^/]+')
		.replace(/\*/g, '.*')
	return new RegExp(`^${pattern}$`, 'i')
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

/**
 * Declare the policies required to access a route. Any plugin can call this to
 * make our global guard enforce their route.
 */
export function requirePolicies(input: {
	matcher: string
	method?: string | string[]
	policies: PermissionAction | PermissionAction[]
	source?: 'explicit' | 'guardResource'
}): void {
	const methods = (Array.isArray(input.method) ? input.method : input.method ? [input.method] : ALL_METHODS).map(m => m.toUpperCase())

	const policies = Array.isArray(input.policies) ? input.policies : [input.policies]

	global.AccessRouteGuards!.push({
		matcher: input.matcher,
		regex: compileMatcher(input.matcher),
		methods,
		policies,
		source: input.source ?? 'explicit'
	})
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
			policies: policies as PermissionAction[]
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
 * Do not apply this over routes where ownership is a valid alternative
 * satisfier — the subtree floor is AND-ed, so it would defeat the OR.
 */
export function guardResource(input: { resource: string; prefix: string }): void {
	const { resource } = input
	const prefix = normalizePath(input.prefix)
	const subtree = `${prefix}/*`

	const source = 'guardResource' as const

	requirePolicies({ matcher: prefix, method: ['GET'], policies: [{ resource, operation: 'read' }], source })
	requirePolicies({ matcher: prefix, method: ['POST'], policies: [{ resource, operation: 'create' }], source })
	requirePolicies({ matcher: prefix, method: ['PUT', 'PATCH'], policies: [{ resource, operation: 'update' }], source })
	requirePolicies({ matcher: prefix, method: ['DELETE'], policies: [{ resource, operation: 'delete' }], source })

	requirePolicies({ matcher: subtree, method: ['GET'], policies: [{ resource, operation: 'read' }], source })
	requirePolicies({ matcher: subtree, method: ['POST', 'PUT', 'PATCH'], policies: [{ resource, operation: 'update' }], source })
	requirePolicies({ matcher: subtree, method: ['DELETE'], policies: [{ resource, operation: 'delete' }], source })
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
	if (!global.AccessSealedNamespaces!.includes(normalized)) {
		global.AccessSealedNamespaces!.push(normalized)
	}
}

/**
 * Whether `path` falls under a sealed namespace.
 *
 * Matching is on segment boundaries, not string prefix: sealing `/admin/order`
 * must not also seal `/admin/orders`.
 */
export function isPathSealed(path: string): boolean {
	const candidate = normalizePath(path).toLowerCase()
	return (global.AccessSealedNamespaces ?? []).some(prefix => {
		const p = prefix.toLowerCase()
		return candidate === p || candidate.startsWith(`${p}/`)
	})
}

/** Every registered guard, for drift reporting. */
export function listRouteGuards(): { matcher: string; methods: string[]; regex: RegExp; source: 'explicit' | 'guardResource' }[] {
	return (global.AccessRouteGuards ?? []).map(({ matcher, methods, regex, source }) => ({ matcher, methods, regex, source }))
}

/**
 * Return the union of policies required for `path`+`method` across all
 * registered guards (empty ⇒ the route is unguarded).
 */
export function matchRoutePolicies(path: string, method: string): PermissionAction[] {
	const out: PermissionAction[] = []
	// Express dispatches HEAD to the GET handler, so a HEAD request must carry
	// the GET requirement or it is an unauthenticated existence oracle.
	const upper = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase()
	const candidate = normalizePath(path)
	for (const guard of global.AccessRouteGuards ?? []) {
		if (!guard.methods.includes(upper)) {
			continue
		}
		if (guard.regex.test(candidate)) {
			out.push(...guard.policies)
		}
	}
	return out
}
