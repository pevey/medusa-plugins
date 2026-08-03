import { ApiLoader } from '@medusajs/framework/http'
import { CLOSED_OPERATIONS, DiscardedPolicy, listDiscardedPolicies } from './define-policies'
import { findGuardsRequiring, listRouteGuards, matchesPrefixOnSegmentBoundary, matchRoutePolicies, normalizePath } from './route-guards'

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
 * plugin's, and the project's — at registration time, which a `/*` guard
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
		global.AccessRegisteredRoutes!.push({ matcher: String(route.route), method: route.method })

		return prev ? prev(handler, route) : handler
	}
}

/**
 * Replace `:param` segments with a concrete probe value so a route *pattern*
 * can be tested against the guard registry, which matches request *paths*.
 */
function toProbePath(matcher: string): string {
	// Normalized the same way the guard normalizes a request path. Without it a
	// route registered as `/admin/widgets/` probes as a string the anchored
	// matcher `/admin/widgets` cannot match, and the report fabricates a finding
	// (uncovered here, stale in `getStaleGuards`) out of a trailing slash.
	return normalizePath(matcher.replace(/:[A-Za-z0-9_]+/g, '__probe__'))
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
		if (!matchesPrefixOnSegmentBoundary(route.matcher, prefix)) {
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
 * Guards that match no route the app actually registered.
 *
 * These are declarations that have rotted — a route renamed or removed upstream,
 * or a matcher that never matched anything. They are silent by nature: a guard
 * for a path that does not exist simply never fires, so nothing surfaces until
 * someone audits by hand. (The pinned core-route map has produced exactly this:
 * an earlier audit found 22 `/admin/rbac/**` matchers left over from the fork
 * origin, guarding paths this plugin never serves.)
 *
 * Wildcard guards are included: a `/prefix/*` that matches nothing is as stale
 * as a literal one.
 */
export function getStaleGuards(prefix = '/admin'): { matcher: string; methods: string[] }[] {
	const routes = (global.AccessRegisteredRoutes ?? []).map(route => ({
		probe: toProbePath(route.matcher),
		method: route.method
	}))

	if (!routes.length) {
		return []
	}

	return (
		listRouteGuards()
			.filter(guard => matchesPrefixOnSegmentBoundary(guard.matcher, prefix))
			// `guardResource` emits a full CRUD surface deliberately and the pinned
			// core map is an upstream snapshot spanning more than one Medusa
			// version, so unmatched entries from either are protective (a route
			// added later is already covered), not rotted. Only hand-written
			// declarations are evidence of drift.
			.filter(guard => guard.source === 'explicit')
			.filter(guard => !routes.some(route => guard.methods.includes(route.method) && guard.regex.test(route.probe)))
			.map(({ matcher, methods }) => ({ matcher, methods }))
	)
}

/**
 * Log a one-line coverage summary, plus the uncovered routes at debug level.
 * Called on application start; silent when everything is covered.
 */
export function reportRouteCoverage(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const declaredPrefixes = new Set<string>()
	for (const guard of listRouteGuards()) {
		const segment = guard.matcher.split('/')[1]
		if (segment && !segment.includes('*') && !segment.startsWith(':')) {
			declaredPrefixes.add(`/${segment}`)
		}
	}

	for (const prefix of [...declaredPrefixes].sort()) {
		const { total, covered, uncovered } = getRouteCoverage(prefix)

		if (total) {
			if (!uncovered.length) {
				logger.info?.(`[access] route coverage: ${covered}/${total} ${prefix} routes declared`)
			} else {
				logger.warn?.(`[access] route coverage: ${covered}/${total} ${prefix} routes declared — ${uncovered.length} undeclared (these pass unguarded)`)
				for (const route of uncovered) {
					logger.debug?.(`[access]   undeclared: ${route.method} ${route.matcher}`)
				}
			}
		}

		// Drift is reported regardless of coverage — and regardless of whether this
		// prefix has any registered routes at all. These are independent signals:
		// coverage asks "is every route declared", drift asks "does every
		// declaration still point at a route". A prefix with zero routes is the
		// most extreme case of drift (100% of its declarations are rotted), and
		// gating this on `total` silenced exactly that case, along with the
		// fully-covered-but-still-rotted case.
		const stale = getStaleGuards(prefix)
		if (stale.length) {
			logger.warn?.(`[access] ${stale.length} policy declaration(s) under ${prefix} match no registered route — likely rotted`)
			for (const guard of stale) {
				logger.debug?.(`[access]   stale: ${guard.methods.join(',')} ${guard.matcher}`)
			}
		}
	}
}

/**
 * Every route whose declaration requires a grant that was discarded.
 *
 * Matched against both the operation as written and its normalized form: the
 * policy registry normalizes (`approveOrder` → `approve_order`) but a route
 * declaration is a hand-written literal, so the two can legitimately differ.
 */
function routesStrandedBy(discarded: DiscardedPolicy): { matcher: string; methods: string[] }[] {
	const separator = discarded.key.lastIndexOf(':')
	const resources = new Set([discarded.resource, discarded.key.slice(0, separator)])
	const operations = new Set([discarded.operation, discarded.key.slice(separator + 1)])

	const found = new Map<string, { matcher: string; methods: string[] }>()
	for (const resource of resources) {
		for (const operation of operations) {
			for (const guard of findGuardsRequiring(resource, operation)) {
				found.set(`${guard.methods.join(',')} ${guard.matcher}`, guard)
			}
		}
	}
	return [...found.values()]
}

/**
 * Report policies refused registration for using an operation outside the
 * closed set. Called on application start; silent when there are none.
 *
 * Detail lines are `warn`, not `debug` as the coverage report uses: that list
 * can run to dozens of core routes, whereas every line here is a declaration
 * bug someone has to fix.
 *
 * The failure this exists to prevent is a silent one. A discarded policy is a
 * grant no role can hold, so a route requiring it denies everyone but a
 * wildcard holder — which presents as "permissions are broken on this route",
 * not as "someone typed `updte`". Naming the stranded routes is what closes
 * that gap, so the report leads with them rather than with the policy alone.
 */
export function reportDiscardedPolicies(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const discarded = listDiscardedPolicies()
	if (!discarded.length) {
		return
	}

	logger.warn?.(
		`[access] ${discarded.length} policy declaration(s) discarded — operation outside the closed set (${CLOSED_OPERATIONS.join(', ')}). Domain verbs such as approve or publish are modelled as update.`
	)

	for (const policy of discarded) {
		const origin = policy.declaredIn ? `, declared in ${policy.declaredIn}` : ''
		logger.warn?.(`[access]   discarded: ${policy.key} (policy "${policy.name}"${origin}) — not registered, so no role can hold this grant`)

		const stranded = routesStrandedBy(policy)
		if (!stranded.length) {
			logger.warn?.('[access]     required by: no route — nothing is denied by this until a declaration references it')
			continue
		}
		for (const route of stranded) {
			logger.warn?.(`[access]     required by: ${route.methods.join(',')} ${route.matcher} — which now denies every actor without a wildcard grant`)
		}
	}
}
