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

type LoadInput =
	| { routes?: TaggedRoute[] }
	| TaggedRoute[]
	| { default: { routes?: TaggedRoute[] } | TaggedRoute[] }

function toRoutes(input: LoadInput): TaggedRoute[] {
	const unwrapped =
		input && typeof input === 'object' && 'default' in input
			? (input as { default: LoadInput }).default
			: input
	if (Array.isArray(unwrapped)) return unwrapped as TaggedRoute[]
	return (unwrapped as { routes?: TaggedRoute[] })?.routes ?? []
}

export function loadRouteContracts(input: unknown): ContractMap {
	const contracts: RouteContract[] = []

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
			contracts.push({
				matcher: route.matcher,
				method: method.toUpperCase(),
				bodySchema,
				querySchema,
				queryConfig
			})
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
