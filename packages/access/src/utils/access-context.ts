import { ScopeRequirement } from './has-permission'
import { AccessEnforcement } from './scoped-query'

/**
 * The guard's per-request verdict, set on `req.access_context` for the granted
 * path of a declared route.
 *
 * - `undefined` (the property absent) — the guard never evaluated the route
 *   (undeclared, fail-open).
 * - `scopes: []` — evaluated and granted with nothing to narrow.
 * - `scopes` non-empty — admitted scoped, with `enforcement` as the ledger the
 *   response release checks (see {@link AccessEnforcement}).
 */
export type AccessContext = {
	scopes: ScopeRequirement[]
	enforcement?: AccessEnforcement
}

declare module '@medusajs/framework/http' {
	interface MedusaRequest<Body = unknown, QueryFields = Record<string, unknown>> {
		access_context?: AccessContext
	}
}
