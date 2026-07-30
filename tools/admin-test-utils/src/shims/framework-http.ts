// Browser-safe stand-in for `@medusajs/framework/http`, aliased in by
// `defineAdminTestConfig`. Two jobs:
//   1. reproduce `defineMiddlewares`' data transform exactly (method → methods, spread rest);
//   2. tag the validator factories so the schema and queryConfig — which the real
//      implementations capture in closures and never expose — become readable.
// Verified against @medusajs/framework 2.18.0: the real factories' returned functions have
// own properties ['length','name'] only, so there is no way to recover them at runtime.

export type QueryConfig = {
	defaults?: string[]
	allowed?: string[]
	isList?: boolean
	defaultLimit?: number
	defaultOrder?: string
}

export type TaggedBodyValidator = { __kind: 'body'; __schema: unknown }
export type TaggedQueryValidator = {
	__kind: 'query'
	__schema: unknown
	__queryConfig: QueryConfig
}

export type TaggedRoute = {
	matcher: string
	methods?: string[]
	middlewares: unknown[]
	[key: string]: unknown
}

type MiddlewareRoute = {
	matcher: string
	method?: string | string[]
	methods?: string[]
	middlewares?: unknown[]
	[key: string]: unknown
}

type MiddlewaresConfig = MiddlewareRoute[] | { routes?: MiddlewareRoute[]; errorHandler?: unknown }

export function defineMiddlewares(config: MiddlewaresConfig): {
	errorHandler?: unknown
	routes: TaggedRoute[]
} {
	const routes = Array.isArray(config) ? config : (config.routes ?? [])
	const errorHandler = Array.isArray(config) ? undefined : config.errorHandler

	return {
		errorHandler,
		routes: routes.map(route => {
			const { middlewares, method, methods, ...rest } = route
			const resolvedMethods = methods ?? (Array.isArray(method) ? method : method ? [method] : undefined)
			return {
				...rest,
				methods: resolvedMethods,
				middlewares: [...(middlewares ?? [])]
			} as TaggedRoute
		})
	}
}

export function validateAndTransformBody(schema: unknown) {
	return Object.assign(function validateBody() {}, { __kind: 'body' as const, __schema: schema })
}

export function validateAndTransformQuery(schema: unknown, queryConfig: QueryConfig) {
	return Object.assign(function validateQuery() {}, {
		__kind: 'query' as const,
		__schema: schema,
		__queryConfig: queryConfig
	})
}

export function authenticate(...args: unknown[]) {
	return Object.assign(function authenticateStub() {}, { __kind: 'auth' as const, __args: args })
}

export class MedusaError extends Error {
	static Types = { NOT_FOUND: 'not_found', INVALID_DATA: 'invalid_data' }
	constructor(type: string, message: string) {
		super(message)
		this.name = type
	}
}
