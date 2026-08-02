import { ApiLoader } from '@medusajs/framework/http'
import { matchRoutePolicies } from './route-guards'

export type RegisteredRoute = {
	matcher: string
	method: string
}

export type RouteCoverage = {
	total: number
	covered: number
	uncovered: RegisteredRoute[]
}

declare global {
	// eslint-disable-next-line no-var
	var AccessRegisteredRoutes: RegisteredRoute[] | undefined
	// eslint-disable-next-line no-var
	var AccessRouteRegistryInstalled: boolean | undefined
}

global.AccessRegisteredRoutes ??= []

/**
 * Record every route the app registers, so coverage can be reported at boot.
 *
 * `ApiLoader.traceRoute` is the only hook that sees every route — core's, every
 * plugin's, and the project's — at registration time, which a `/admin/*`
 * middleware cannot do (it only ever sees routes that are actually requested).
 *
 * Caveats this deliberately accepts:
 *  - The slot is semantically for tracing and is undocumented for this use, so
 *    we chain `prev` rather than overwrite. OTEL installs first
 *    (`registerInstrumentation` runs before `loaders`), and any other plugin
 *    doing the same must also chain.
 *  - Guarded for idempotence because HMR re-invokes `apiLoader.load()`, which
 *    would otherwise stack wrappers on every reload.
 *
 * Must be called before routes register. A plugin's `api/middlewares.ts` module
 * body runs during the scan phase, which completes before any registration.
 */
export function installRouteRegistry(): void {
	if (global.AccessRouteRegistryInstalled) {
		return
	}
	global.AccessRouteRegistryInstalled = true

	const prev = ApiLoader.traceRoute

	ApiLoader.traceRoute = (handler, route) => {
		global.AccessRegisteredRoutes!.push({
			matcher: String(route.route),
			method: route.method
		})
		return prev ? prev(handler, route) : handler
	}
}

/**
 * Replace `:param` segments with a concrete probe value so a route *pattern*
 * can be tested against the guard registry, which matches request *paths*.
 */
function toProbePath(matcher: string): string {
	return matcher.replace(/:[A-Za-z0-9_]+/g, '__probe__')
}

/**
 * Which registered routes under `prefix` have no matching policy declaration.
 *
 * Advisory, not enforcement — undeclared routes still pass unless their
 * namespace is sealed. This is the report you run *before* sealing, to see what
 * sealing would break.
 */
export function getRouteCoverage(prefix = '/admin'): RouteCoverage {
	const seen = new Set<string>()
	const uncovered: RegisteredRoute[] = []
	let total = 0

	for (const route of global.AccessRegisteredRoutes ?? []) {
		if (!route.matcher.startsWith(prefix)) {
			continue
		}

		// HMR re-runs registration, so the raw list can hold duplicates.
		const key = `${route.method} ${route.matcher}`
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		total++

		if (!matchRoutePolicies(toProbePath(route.matcher), route.method).length) {
			uncovered.push(route)
		}
	}

	return { total, covered: total - uncovered.length, uncovered }
}

/**
 * Log a one-line coverage summary, plus the uncovered routes at debug level.
 * Called on application start; silent when everything is covered.
 */
export function reportRouteCoverage(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const { total, covered, uncovered } = getRouteCoverage()

	if (!total) {
		return
	}

	if (!uncovered.length) {
		logger.info?.(`[access] route coverage: ${covered}/${total} admin routes declared`)
		return
	}

	logger.warn?.(`[access] route coverage: ${covered}/${total} admin routes declared — ${uncovered.length} undeclared (these pass unguarded)`)
	for (const route of uncovered) {
		logger.debug?.(`[access]   undeclared: ${route.method} ${route.matcher}`)
	}
}
