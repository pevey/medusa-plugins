import { MiddlewareRoute } from '@medusajs/framework/http'
import { PermissionAction } from './has-permission'

/**
 * A registered route→policy requirement. Populated at module-load time via
 * {@link requirePolicies} / {@link registerRoutePolicies} and read per-request
 * by the access guard middleware. Stored on `global` so our own routes, ported
 * core-route mappings, and third-party plugins all share one registry.
 */
type RouteGuard = {
	regex: RegExp
	methods: string[]
	policies: PermissionAction[]
}

declare global {
	// eslint-disable-next-line no-var
	var AccessRouteGuards: RouteGuard[] | undefined
}

global.AccessRouteGuards ??= []

const ALL_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

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
export function requirePolicies(input: { matcher: string; method?: string | string[]; policies: PermissionAction | PermissionAction[] }): void {
	const methods = (Array.isArray(input.method) ? input.method : input.method ? [input.method] : ALL_METHODS).map(m => m.toUpperCase())

	const policies = Array.isArray(input.policies) ? input.policies : [input.policies]

	global.AccessRouteGuards!.push({
		regex: compileMatcher(input.matcher),
		methods,
		policies
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
