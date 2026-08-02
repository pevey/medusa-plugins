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

/** Strip trailing slashes so `/admin/x` and `/admin/x/` behave identically. */
function normalizePrefix(prefix: string): string {
	return prefix.replace(/\/+$/, '')
}

/**
 * Compile an Express-style matcher (`/admin/access/roles/:id`, `/admin/*`) into
 * an anchored RegExp for request-path matching.
 */
function compileMatcher(matcher: string): RegExp {
	const pattern = matcher
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/:[A-Za-z0-9_]+/g, '[^/]+')
		.replace(/\*/g, '.*')
	return new RegExp(`^${pattern}$`)
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
 * Bulk-register the `policies` declared on a `MiddlewareRoute[]` (e.g. the array
 * a plugin passes to `defineMiddlewares`) into the guard registry — so the
 * co-located `policies:[]` declarations become live enforcement.
 */
export function registerRoutePolicies(routes: MiddlewareRoute[]): void {
	for (const route of routes) {
		if (!route.policies) {
			continue
		}
		const policies = Array.isArray(route.policies) ? route.policies : [route.policies]
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
	const prefix = normalizePrefix(input.prefix)
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
	const normalized = normalizePrefix(prefix)
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
	return (global.AccessSealedNamespaces ?? []).some(prefix => path === prefix || path.startsWith(`${prefix}/`))
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
	const upper = method.toUpperCase()
	for (const guard of global.AccessRouteGuards ?? []) {
		if (!guard.methods.includes(upper)) {
			continue
		}
		if (guard.regex.test(path)) {
			out.push(...guard.policies)
		}
	}
	return out
}
