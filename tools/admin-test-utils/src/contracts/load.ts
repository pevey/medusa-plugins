import { matchRoute } from './match.js'
import type { QueryConfig, TaggedRoute } from '../shims/framework-http.js'

export type RouteContract = {
	matcher: string
	method: string
	bodySchema?: ZodLike
	querySchema?: ZodLike
	queryConfig?: QueryConfig
}

/** The subset of the zod surface the harness uses. Avoids a zod version dependency here. */
export type ZodLike = {
	safeParse(value: unknown): { success: boolean; error?: unknown; data?: unknown }
}

export type ContractMap = {
	get(method: string, path: string): RouteContract | undefined
	all(): RouteContract[]
	matchers(): string[]
}

type LoadInput = { routes?: TaggedRoute[] } | TaggedRoute[] | { default: { routes?: TaggedRoute[] } | TaggedRoute[] }

function toRoutes(input: LoadInput): TaggedRoute[] {
	const unwrapped = input && typeof input === 'object' && 'default' in input ? (input as { default: LoadInput }).default : input
	if (Array.isArray(unwrapped)) return unwrapped as TaggedRoute[]
	return (unwrapped as { routes?: TaggedRoute[] })?.routes ?? []
}

/** The HTTP-verb export names a Medusa `route.ts` file uses. Anything else on the module
 *  (helper functions, `AUTHENTICATE`, non-verb exports) is not a route and is ignored. */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const

/**
 * Converts a route module's glob key into the same matcher shape Medusa derives from the file
 * system: strip everything up to and including `/api`, drop the trailing `/route.ts`, and turn
 * `[param]` segments into `:param`.
 *
 * `../../api/admin/reviews/[id]/route.ts` -> `/admin/reviews/:id`
 */
function pathToMatcher(modulePath: string): string {
	const afterApi = modulePath.replace(/^.*\/api\//, '/')
	const withoutRoute = afterApi.replace(/\/route\.ts$/, '')
	return withoutRoute.replace(/\[([^\]]+)\]/g, ':$1')
}

/** Matches `export const GET = ...`, `export async function POST(...)`, etc. at any indentation. */
const EXPORTED_VERB_RE = /export\s+(?:const|(?:async\s+)?function)\s+(GET|POST|PUT|DELETE|PATCH)\b/g

/**
 * The HTTP verbs a route module exports, e.g. `{ GET, POST }` -> `['GET', 'POST']`. A module
 * exporting none (a helper file matched by an overly broad glob) contributes nothing.
 *
 * Accepts either an executed module namespace (an object whose own keys include the verbs — the
 * shape a plain `import.meta.glob(..., { eager: true })` produces, and what the harness's own
 * fixtures use) or the module's raw source text (a plain string). Real plugin route files must be
 * read as raw text: a route.ts imports `@medusajs/framework/utils`, which drags in `jsonwebtoken`
 * -> `jws`, which calls `util.inherits` — undefined once Vite externalizes Node's `util` for the
 * browser test environment. Executing the module (eager, no `query`) crashes the whole suite
 * import with "util.inherits is not a function" before a single test runs. Reading the source as
 * text via `import.meta.glob(pattern, { eager: true, query: '?raw', import: 'default' })` never
 * evaluates that import chain, so the verb names are recovered by regex instead.
 */
function verbsOf(moduleNamespace: unknown): string[] {
	if (typeof moduleNamespace === 'string') {
		const found = new Set(Array.from(moduleNamespace.matchAll(EXPORTED_VERB_RE), m => m[1]))
		return HTTP_METHODS.filter(method => found.has(method))
	}
	if (!moduleNamespace || typeof moduleNamespace !== 'object') return []
	return HTTP_METHODS.filter(method => method in (moduleNamespace as Record<string, unknown>))
}

export function loadRouteContracts(input: unknown, options?: { routeModules?: Record<string, unknown> }): ContractMap {
	const contracts: RouteContract[] = []
	const seen = new Set<string>()
	const key = (method: string, matcher: string) => `${method} ${matcher}`

	for (const route of toRoutes(input as LoadInput)) {
		// Entries without methods are catch-all `app.use(matcher)` registrations. They carry
		// no per-method contract, so there is nothing for a request to be validated against.
		if (!route.methods?.length) continue

		let bodySchema: ZodLike | undefined
		let querySchema: ZodLike | undefined
		let queryConfig: QueryConfig | undefined

		for (const middleware of route.middlewares) {
			const tagged = middleware as {
				__kind?: string
				__schema?: ZodLike
				__queryConfig?: QueryConfig
			}
			if (tagged?.__kind === 'body') bodySchema = tagged.__schema
			if (tagged?.__kind === 'query') {
				querySchema = tagged.__schema
				queryConfig = tagged.__queryConfig
			}
		}

		for (const method of route.methods) {
			const upper = method.toUpperCase()
			contracts.push({
				matcher: route.matcher,
				method: upper,
				bodySchema,
				querySchema,
				queryConfig
			})
			seen.add(key(upper, route.matcher))
		}
	}

	// File-system discovery only ever contributes existence — a route with no schema still
	// resolves, it simply carries no contract to validate against. Where middlewares.ts already
	// supplied a schema for the same (method, matcher), that entry wins; the glob never overrides it.
	for (const [modulePath, moduleNamespace] of Object.entries(options?.routeModules ?? {})) {
		const matcher = pathToMatcher(modulePath)
		for (const method of verbsOf(moduleNamespace)) {
			if (seen.has(key(method, matcher))) continue
			contracts.push({ matcher, method })
			seen.add(key(method, matcher))
		}
	}

	return {
		all: () => contracts,
		matchers: () => [...new Set(contracts.map(c => c.matcher))],
		get(method, path) {
			const upper = method.toUpperCase()
			const forMethod = contracts.filter(c => c.method === upper)
			const matcher = matchRoute(
				forMethod.map(c => c.matcher),
				path
			)
			if (!matcher) return undefined
			return forMethod.find(c => c.matcher === matcher)
		}
	}
}
