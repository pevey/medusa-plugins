import { PermissionAction } from './has-permission'

/**
 * Policies declared against a handler function rather than a URL pattern.
 *
 * Keyed by function identity, which survives from the route file's export all
 * the way to `ApiLoader.traceRoute` — the loader stores `routeExports[key]`
 * verbatim, with no copy. (After that it is lost: `wrapHandler` builds a new
 * closure and carries over only `name`.)
 */
const handlerPolicies = new WeakMap<object, PermissionAction[]>()

/**
 * Declare a route's policies next to its handler instead of duplicating its URL
 * in a matcher string.
 *
 * ```ts
 * export const GET = withPolicies({ resource: 'complaint', operation: 'read' }, async (req, res) => { ... })
 * ```
 *
 * The matcher is then taken from Medusa's own route registration rather than
 * hand-written, which removes a whole class of bug: anchoring mistakes, typos,
 * and declarations that silently stop matching when a route file moves.
 *
 * Note what this does *not* change: policies still land in the same path-keyed
 * registry, so a `guardResource` subtree floor over the same prefix still
 * applies on top (matching is AND across declarations). Binding to the handler
 * fixes authoring, not composition.
 */
export function withPolicies<T>(policies: PermissionAction | PermissionAction[], handler: T): T {
	const list = Array.isArray(policies) ? policies : [policies]

	if (typeof handler === 'function') {
		handlerPolicies.set(handler as unknown as object, list)
	}

	return handler
}

/** Policies declared via {@link withPolicies} for this handler, if any. */
export function getHandlerPolicies(handler: unknown): PermissionAction[] | undefined {
	if (typeof handler !== 'function') {
		return undefined
	}
	return handlerPolicies.get(handler as unknown as object)
}
